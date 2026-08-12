const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { findActiveSubscription } = require('../middleware/subscriptionAccess');
const { handleValidationErrors } = require('../utils/validation');
const { sendActivationCodeEmail } = require('../utils/mailer');
const { getCache, setCache, invalidateCache } = require('../utils/cache');

const CACHE_KEY_PLANS = 'subscriptions:plans';

const BILLING_CYCLE_MONTHS = {
  '1_month': 1,
  '3_months': 3,
  '1_year': 12,
};

const PAYMENT_METHODS = ['online', 'bank_transfer'];
const OPEN_SUBSCRIPTION_STATUSES = ['pending_payment', 'pending_receipt', 'pending_approval', 'pending_code'];

const MAX_ACTIVATION_ATTEMPTS = 5;

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeFeatures(rawFeatures) {
  if (Array.isArray(rawFeatures)) return rawFeatures;
  if (typeof rawFeatures === 'string') {
    try {
      const parsed = JSON.parse(rawFeatures);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePlan(plan) {
  return {
    ...plan,
    features: normalizeFeatures(plan.features_json),
    features_arabic: normalizeFeatures(plan.features_arabic_json),
  };
}

function buildAccessStatus(activeSubscription, pendingSubscription) {
  // Strip the activation_code_preview column before returning — plaintext codes
  // must never reach the client through the /status endpoint. The code is only
  // returned once (in the creation response body) during development.
  const safePending = pendingSubscription ? (({ activation_code_preview: _omit, ...rest }) => rest)(pendingSubscription) : null;
  return {
    has_active_subscription: Boolean(activeSubscription),
    has_pending_activation: Boolean(pendingSubscription),
    active_subscription: activeSubscription,
    pending_subscription: safePending,
  };
}

async function findOpenSubscription(userId) {
  const [rows] = await db.query(
    `SELECT *
     FROM subscriptions
     WHERE user_id = ?
       AND status IN (${OPEN_SUBSCRIPTION_STATUSES.map(() => '?').join(', ')})
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId, ...OPEN_SUBSCRIPTION_STATUSES]
  );

  return rows[0] || null;
}

function createActivationCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function hashActivationCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function calculateSubscriptionDates(billingCycle, baseDate = new Date()) {
  const months = BILLING_CYCLE_MONTHS[billingCycle];
  const startDate = new Date(baseDate);
  const endDate = addMonths(startDate, months);

  return {
    start_date: toDateString(startDate),
    end_date: toDateString(endDate),
  };
}

// GET /api/subscriptions/plans
async function getPlans(_req, res) {
  const cached = getCache(CACHE_KEY_PLANS);
  if (cached) return res.json(cached);

  const [rows] = await db.query(
    `SELECT *
     FROM subscription_plans
     WHERE is_active = 1
     ORDER BY display_order ASC, id ASC`
  );

  const result = rows.map(normalizePlan);
  setCache(CACHE_KEY_PLANS, result, 120); // 2-minute TTL
  res.json(result);
}

// GET /api/subscriptions
async function getAll(req, res) {
  let rows;

  if (req.user.role === 'admin' || req.user.role === 'commercial') {
    [rows] = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC`
    );
  } else {
    [rows] = await db.query(
      `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
  }

  // Strip sensitive fields — never send the activation code hash or plaintext preview to clients.
  res.json(rows.map(({ activation_code_hash: _h, activation_code_preview: _p, ...rest }) => rest));
}

// GET /api/subscriptions/access-status
async function getAccessStatus(req, res) {
  const activeSubscription = await findActiveSubscription(req.user.id);
  const pendingSubscription = activeSubscription ? null : await findOpenSubscription(req.user.id);
  res.json(buildAccessStatus(activeSubscription, pendingSubscription));
}

// POST /api/subscriptions/checkout
async function checkout(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { plan, billing_cycle, payment_method = 'online' } = req.body;
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ message: 'Mode de paiement invalide.' });
  }

  // Validate plan + cycle before opening the transaction so we don't hold a
  // lock while doing a non-mutating lookup.
  const [plans] = await db.query(
    `SELECT * FROM subscription_plans WHERE slug = ? AND is_active = 1 LIMIT 1`,
    [plan]
  );
  const selectedPlan = plans[0];
  if (!selectedPlan) return res.status(404).json({ message: 'Forfait d\'abonnement introuvable.' });

  const months = BILLING_CYCLE_MONTHS[billing_cycle];
  if (!months) return res.status(400).json({ message: 'Cycle de facturation invalide.' });

  const priceField = billing_cycle === '1_month'
    ? 'monthly_price'
    : billing_cycle === '3_months'
      ? 'quarterly_price'
      : 'yearly_price';

  const { start_date, end_date } = calculateSubscriptionDates(billing_cycle);
  const status = payment_method === 'bank_transfer' ? 'pending_receipt' : 'pending_code';
  const activationCode = payment_method === 'online' ? createActivationCode() : null;
  const activationCodeHash = activationCode ? hashActivationCode(activationCode) : null;
  const activationCodeExpiresAt = activationCode ? new Date(Date.now() + 1000 * 60 * 30) : null;

  // Wrap the existence check + INSERT in a transaction so that two concurrent
  // checkout requests cannot both pass the guard and create duplicate subscriptions.
  const conn = await db.getConnection();
  let insertId;
  try {
    await conn.beginTransaction();

    // Re-check inside the transaction with a row-level lock so no other
    // concurrent request can sneak a second subscription in.
    const [activeRows] = await conn.query(
      `SELECT id FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
       LIMIT 1 FOR UPDATE`,
      [req.user.id]
    );
    if (activeRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        code: 'ACTIVE_SUBSCRIPTION_EXISTS',
        message: 'Cet utilisateur a deja un abonnement actif.',
      });
    }

    const [pendingRows] = await conn.query(
      `SELECT id FROM subscriptions
       WHERE user_id = ?
         AND status IN (${OPEN_SUBSCRIPTION_STATUSES.map(() => '?').join(', ')})
       LIMIT 1 FOR UPDATE`,
      [req.user.id, ...OPEN_SUBSCRIPTION_STATUSES]
    );
    if (pendingRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        code: 'PENDING_SUBSCRIPTION_EXISTS',
        message: 'Une demande d\'abonnement est deja en cours pour cet utilisateur.',
      });
    }

    const [result] = await conn.query(
      `INSERT INTO subscriptions (
        user_id, plan, billing_cycle, price_paid, payment_method, status,
        bank_receipt_path, bank_receipt_original_name, receipt_uploaded_at,
        activation_code_hash, activation_code_preview, activation_code_expires_at,
        approved_by, approved_at, start_date, end_date
       ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        req.user.id, plan, billing_cycle,
        Number(selectedPlan[priceField]), payment_method, status,
        activationCodeHash,
        null, // activation_code_preview — never persist plaintext codes in DB
        activationCodeExpiresAt,
        start_date, end_date,
      ]
    );

    await conn.commit();
    insertId = result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Online payment → the activation code is available immediately. Email it
  // (fire-and-forget) so the student receives it even without dev-mode display.
  if (activationCode) {
    const [uRows] = await db.query('SELECT email, first_name FROM users WHERE id = ?', [req.user.id]);
    const u = uRows[0];
    if (u) {
      sendActivationCodeEmail({
        to: u.email,
        firstName: u.first_name,
        code: activationCode,
        expiresInMinutes: 30,
      }).catch((err) => console.error('[mailer] sendActivationCodeEmail (create) failed:', err));
    }
  }

  res.status(201).json({
    message: payment_method === 'bank_transfer'
      ? 'Abonnement cree. Deposez votre recu bancaire pour validation par un administrateur avant la generation du code.'
      : 'Abonnement cree. Saisissez le code d\'activation pour debloquer l\'acces.',
    id: insertId,
    plan,
    billing_cycle,
    payment_method,
    status,
    price_paid: Number(selectedPlan[priceField]),
    start_date,
    end_date,
    development_code: process.env.NODE_ENV !== 'production' && activationCode ? activationCode : undefined,
  });
}

// POST /api/subscriptions/:id/receipt
async function uploadReceipt(req, res) {
  const [rows] = await db.query(
    `SELECT *
     FROM subscriptions
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [req.params.id, req.user.id]
  );

  const subscription = rows[0];
  if (!subscription) return res.status(404).json({ message: 'Abonnement introuvable.' });
  if (subscription.payment_method !== 'bank_transfer') {
    return res.status(400).json({ message: 'Le recu est requis uniquement pour les virements bancaires.' });
  }
  if (!['pending_receipt', 'pending_approval'].includes(subscription.status)) {
    return res.status(400).json({ message: 'Cet abonnement n\'attend pas de recu bancaire.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Le fichier du recu est obligatoire.' });
  }

  if (subscription.bank_receipt_path) {
    const previousReceiptPath = path.join(__dirname, '..', '..', subscription.bank_receipt_path.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(previousReceiptPath)) {
      fs.unlinkSync(previousReceiptPath);
    }
  }

  const receiptPath = `/uploads/subscription-receipts/${req.file.filename}`;
  await db.query(
    `UPDATE subscriptions
     SET bank_receipt_path = ?,
         bank_receipt_original_name = ?,
         receipt_uploaded_at = NOW(),
         status = 'pending_approval'
     WHERE id = ?`,
    [receiptPath, req.file.originalname, subscription.id]
  );

  res.json({
    message: 'Recu televerse. En attente de validation administrateur.',
    receipt_path: receiptPath,
  });
}

// POST /api/subscriptions/:id/approve-bank-transfer
async function approveBankTransfer(req, res) {
  const [rows] = await db.query('SELECT * FROM subscriptions WHERE id = ? LIMIT 1', [req.params.id]);
  const subscription = rows[0];
  if (!subscription) return res.status(404).json({ message: 'Abonnement introuvable.' });
  if (subscription.payment_method !== 'bank_transfer') {
    return res.status(400).json({ message: 'Seuls les abonnements par virement bancaire peuvent etre valides ici.' });
  }
  if (subscription.status !== 'pending_approval') {
    return res.status(400).json({ message: 'Cet abonnement n\'est pas en attente de validation administrateur.' });
  }
  if (!subscription.bank_receipt_path) {
    return res.status(400).json({ message: 'Aucun recu bancaire n\'a encore ete televerse.' });
  }

  const activationCode = createActivationCode();
  const activationCodeHash = hashActivationCode(activationCode);
  const activationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await db.query(
    `UPDATE subscriptions
     SET status = 'pending_code',
         activation_code_hash = ?,
         activation_code_preview = ?,
         activation_code_expires_at = ?,
         activation_attempts = 0,
         approved_by = ?,
         approved_at = NOW()
     WHERE id = ?`,
    [
      activationCodeHash,
      null, // activation_code_preview — never persist plaintext codes in DB
      activationCodeExpiresAt,
      req.user.id,
      subscription.id,
    ]
  );

  // Send activation code by email (fire-and-forget — don't block the response)
  const [userRows] = await db.query('SELECT email, first_name FROM users WHERE id = ?', [subscription.user_id]);
  const user = userRows[0];
  if (user) {
    sendActivationCodeEmail({
      to: user.email,
      firstName: user.first_name,
      code: activationCode,
      expiresInMinutes: 30,
    }).catch((err) => console.error('[mailer] sendActivationCodeEmail failed:', err));
  }

  res.json({
    message: 'Virement valide. Le code d\'activation est maintenant pret.',
    development_code: process.env.NODE_ENV !== 'production' ? activationCode : undefined,
  });
}

// POST /api/subscriptions/activate-code
async function activateCode(req, res) {
  if (handleValidationErrors(req, res)) return;

  const activeSubscription = await findActiveSubscription(req.user.id);
  if (activeSubscription) {
    return res.status(409).json({
      code: 'ACTIVE_SUBSCRIPTION_EXISTS',
      message: 'Cet utilisateur a deja un abonnement actif.',
    });
  }

  const pendingSubscription = await findOpenSubscription(req.user.id);
  if (!pendingSubscription) {
    return res.status(404).json({
      code: 'NO_PENDING_SUBSCRIPTION',
      message: 'Aucune activation d\'abonnement en attente n\'a ete trouvee.',
    });
  }

  if (pendingSubscription.status !== 'pending_code') {
    return res.status(409).json({
      code: 'ACTIVATION_NOT_READY',
      message: pendingSubscription.status === 'pending_receipt'
        ? 'Televersez d\'abord votre recu bancaire pour que l\'administrateur puisse le verifier.'
        : 'Votre virement bancaire attend la validation administrateur avant la disponibilite du code.',
    });
  }

  if (!pendingSubscription.activation_code_expires_at || new Date(pendingSubscription.activation_code_expires_at) < new Date()) {
    return res.status(400).json({
      code: 'ACTIVATION_CODE_EXPIRED',
      message: 'Le code d\'activation a expire. Veuillez recommencer.',
    });
  }

  if (pendingSubscription.activation_attempts >= MAX_ACTIVATION_ATTEMPTS) {
    return res.status(429).json({
      code: 'ACTIVATION_LOCKED',
      message: 'Trop de tentatives incorrectes. Demandez a un administrateur de regenerer votre code.',
    });
  }

  const providedCodeHash = hashActivationCode(String(req.body.code).trim().toUpperCase());

  // Use timingSafeEqual to prevent timing-based side-channel attacks.
  // Both buffers must be the same length (both are SHA-256 hex — 64 chars).
  const storedHash = pendingSubscription.activation_code_hash || '';
  const hashMatch =
    providedCodeHash.length === storedHash.length &&
    crypto.timingSafeEqual(Buffer.from(providedCodeHash), Buffer.from(storedHash));

  if (!hashMatch) {
    await db.query(
      'UPDATE subscriptions SET activation_attempts = activation_attempts + 1 WHERE id = ?',
      [pendingSubscription.id]
    );
    const remaining = MAX_ACTIVATION_ATTEMPTS - (pendingSubscription.activation_attempts + 1);
    return res.status(400).json({
      code: 'INVALID_ACTIVATION_CODE',
      message: remaining > 0
        ? `Code d'activation invalide. ${remaining} tentative(s) restante(s).`
        : 'Code d\'activation invalide. Compte verrouille, contactez un administrateur.',
    });
  }

  const { start_date, end_date } = calculateSubscriptionDates(pendingSubscription.billing_cycle, new Date());

  // Use WHERE status='pending_code' as an atomic guard — if two concurrent
  // requests both pass the hash check, only the first UPDATE will match;
  // the second sees affectedRows=0 and is rejected gracefully.
  const [updateResult] = await db.query(
    `UPDATE subscriptions
     SET status = 'active',
         start_date = ?,
         end_date = ?,
         activation_code_hash = NULL,
         activation_code_preview = NULL,
         activation_code_expires_at = NULL,
         activated_at = NOW()
     WHERE id = ? AND status = 'pending_code'`,
    [start_date, end_date, pendingSubscription.id]
  );

  if (updateResult.affectedRows === 0) {
    return res.status(409).json({
      code: 'ALREADY_ACTIVATED',
      message: 'Cet abonnement a deja ete active.',
    });
  }

  res.json({
    message: 'Abonnement active.',
    start_date,
    end_date,
  });
}

// POST /api/subscriptions/:id/cancel  (user cancels own pending subscription)
async function cancelPending(req, res) {
  const [rows] = await db.query(
    `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
    [req.params.id, req.user.id]
  );
  const subscription = rows[0];
  if (!subscription) return res.status(404).json({ message: 'Abonnement introuvable.' });

  if (!OPEN_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return res.status(400).json({ message: 'Seules les demandes d\'abonnement en attente peuvent etre annulees.' });
  }

  await db.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['cancelled', subscription.id]);

  // Clean up any uploaded bank receipt so it doesn't linger on disk.
  if (subscription.bank_receipt_path) {
    const receiptAbsPath = path.join(
      __dirname, '..', '..',
      subscription.bank_receipt_path.replace(/^\//, '').replace(/\//g, path.sep)
    );
    if (fs.existsSync(receiptAbsPath)) {
      fs.unlinkSync(receiptAbsPath);
    }
  }

  res.json({ message: 'Demande d\'abonnement annulee.' });
}

// POST /api/subscriptions/:id/regenerate-code  (admin regenerates expired activation code)
async function regenerateCode(req, res) {
  const [rows] = await db.query('SELECT * FROM subscriptions WHERE id = ? LIMIT 1', [req.params.id]);
  const subscription = rows[0];
  if (!subscription) return res.status(404).json({ message: 'Abonnement introuvable.' });

  if (subscription.status !== 'pending_code') {
    return res.status(400).json({ message: 'Ce code ne peut etre regenere que pour les abonnements en attente de code.' });
  }

  const activationCode = createActivationCode();
  const activationCodeHash = hashActivationCode(activationCode);
  const activationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await db.query(
    `UPDATE subscriptions
     SET activation_code_hash = ?,
         activation_code_preview = ?,
         activation_code_expires_at = ?,
         activation_attempts = 0
     WHERE id = ?`,
    [
      activationCodeHash,
      null, // activation_code_preview — never persist plaintext codes in DB
      activationCodeExpiresAt,
      subscription.id,
    ]
  );

  // Send new activation code by email
  const [userRows] = await db.query('SELECT email, first_name FROM users WHERE id = ?', [subscription.user_id]);
  const user = userRows[0];
  if (user) {
    sendActivationCodeEmail({
      to: user.email,
      firstName: user.first_name,
      code: activationCode,
      expiresInMinutes: 30,
    }).catch((err) => console.error('[mailer] sendActivationCodeEmail failed:', err));
  }

  res.json({
    message: 'Code d\'activation regenere.',
    development_code: process.env.NODE_ENV !== 'production' ? activationCode : undefined,
  });
}

// [REMOVED] initiateKonnectPayment — online payment disabled, bank transfer only.
// Keeping this comment as a tombstone so git history stays clear.
async function _removedKonnectPayment(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { plan, billing_cycle } = req.body;

  const [plans] = await db.query(
    `SELECT * FROM subscription_plans WHERE slug = ? AND is_active = 1 LIMIT 1`,
    [plan]
  );
  const selectedPlan = plans[0];
  if (!selectedPlan) return res.status(404).json({ message: 'Forfait introuvable.' });

  const months = BILLING_CYCLE_MONTHS[billing_cycle];
  if (!months) return res.status(400).json({ message: 'Cycle de facturation invalide.' });

  const priceField = billing_cycle === '1_month' ? 'monthly_price'
    : billing_cycle === '3_months' ? 'quarterly_price'
    : 'yearly_price';

  const priceTND = Number(selectedPlan[priceField]);
  // Konnect expects amounts in Millimes (1 TND = 1000 Millimes).
  const amountMillimes = Math.round(priceTND * 1000);

  const { start_date, end_date } = calculateSubscriptionDates(billing_cycle);

  // Create the subscription row inside a transaction with the same duplicate
  // guards used by the regular checkout endpoint.
  const conn = await db.getConnection();
  let insertId;
  try {
    await conn.beginTransaction();

    const [activeRows] = await conn.query(
      `SELECT id FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
       LIMIT 1 FOR UPDATE`,
      [req.user.id]
    );
    if (activeRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        code: 'ACTIVE_SUBSCRIPTION_EXISTS',
        message: 'Cet utilisateur a deja un abonnement actif.',
      });
    }

    const [pendingRows] = await conn.query(
      `SELECT id FROM subscriptions
       WHERE user_id = ?
         AND status IN (${OPEN_SUBSCRIPTION_STATUSES.map(() => '?').join(', ')})
       LIMIT 1 FOR UPDATE`,
      [req.user.id, ...OPEN_SUBSCRIPTION_STATUSES]
    );
    if (pendingRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        code: 'PENDING_SUBSCRIPTION_EXISTS',
        message: 'Une demande d\'abonnement est deja en cours pour cet utilisateur.',
      });
    }

    const [result] = await conn.query(
      `INSERT INTO subscriptions
         (user_id, plan, billing_cycle, price_paid, payment_method, status, start_date, end_date)
       VALUES (?, ?, ?, ?, 'online', 'pending_payment', ?, ?)`,
      [req.user.id, plan, billing_cycle, priceTND, start_date, end_date]
    );
    await conn.commit();
    insertId = result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Call Konnect to create the hosted payment page.
  let payUrl, paymentRef;
  try {
    const konnectResp = await callKonnect('POST', '/payments/init-payment', {
      receiverWalletId: process.env.KONNECT_WALLET_ID,
      token: 'TND',
      amount: amountMillimes,
      type: 'immediate',
      acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
      lifespan: 30, // minutes the link stays valid
      description: `Edutopia — ${selectedPlan.title} (${billing_cycle})`,
      // Konnect will GET this URL with ?payment_ref=xxx when payment completes.
      webhook: `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/subscriptions/konnect-webhook`,
      successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions?payment=success`,
      failUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscriptions?payment=failed`,
      orderId: String(insertId),
      email: req.user.email,
      firstName: req.user.first_name || '',
      lastName: req.user.last_name || '',
    });
    payUrl = konnectResp.payUrl;
    paymentRef = konnectResp.paymentRef;
  } catch (err) {
    // If Konnect rejects the request, clean up the orphaned subscription row.
    await db.query('DELETE FROM subscriptions WHERE id = ?', [insertId]);
    console.error('Konnect initiation failed:', err.message, err.data);
    return res.status(502).json({
      message: 'Impossible d\'initier le paiement en ligne. Veuillez reessayer ou choisir le virement bancaire.',
    });
  }

  // Persist the Konnect paymentRef so the webhook can find this subscription.
  await db.query(
    'UPDATE subscriptions SET konnect_payment_ref = ? WHERE id = ?',
    [paymentRef, insertId]
  );

  res.status(201).json({ payUrl, subscriptionId: insertId });
}

// [REMOVED] konnectWebhook — online payment disabled, bank transfer only.
async function _removedKonnectWebhook(req, res) {
  const { payment_ref } = req.query;
  if (!payment_ref) return res.status(400).send('Missing payment_ref');

  // Always return 200 to Konnect regardless of outcome — they retry on non-200.
  try {
    const paymentData = await callKonnect('GET', `/payments/${payment_ref}`);

    // The response shape is { payment: { status, ... } } — fall back for safety.
    const payment = paymentData.payment || paymentData;
    if (payment.status !== 'completed') {
      console.log(`[Konnect] payment ${payment_ref} status=${payment.status} — no action`);
      return res.status(200).send('OK');
    }

    const [rows] = await db.query(
      'SELECT * FROM subscriptions WHERE konnect_payment_ref = ? LIMIT 1',
      [payment_ref]
    );
    const subscription = rows[0];
    if (!subscription) {
      console.error(`[Konnect] no subscription found for payment_ref=${payment_ref}`);
      return res.status(200).send('OK');
    }

    if (subscription.status !== 'pending_payment') {
      // Webhook fired twice (idempotency guard).
      return res.status(200).send('OK');
    }

    const activationCode = createActivationCode();
    const activationCodeHash = hashActivationCode(activationCode);
    // Give the student 24 h to enter the code — they need to come back to the site.
    const activationCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const [updateResult] = await db.query(
      `UPDATE subscriptions
       SET status = 'pending_code',
           activation_code_hash = ?,
           activation_code_expires_at = ?,
           approved_at = NOW()
       WHERE id = ? AND status = 'pending_payment'`,
      [activationCodeHash, activationCodeExpiresAt, subscription.id]
    );

    if (updateResult.affectedRows > 0) {
      console.log(`[Konnect] subscription ${subscription.id} → pending_code`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Activation code for subscription ${subscription.id}: ${activationCode}`);
      }
    }
  } catch (err) {
    console.error('[Konnect] webhook error:', err.message);
  }

  return res.status(200).send('OK');
}

// POST /api/subscriptions  (admin only)
async function create(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { user_id, plan, billing_cycle, price_paid, payment_method, status, start_date, end_date } = req.body;
  const [result] = await db.query(
    `INSERT INTO subscriptions (user_id, plan, billing_cycle, price_paid, payment_method, status, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, plan || 'basic', billing_cycle || '1_month', price_paid || 0, payment_method || 'online', status || 'active', start_date, end_date]
  );

  res.status(201).json({ message: 'Abonnement cree.', id: result.insertId });
}

// PUT /api/subscriptions/:id  (admin only)
async function update(req, res) {
  if (handleValidationErrors(req, res)) return;

  const [rows] = await db.query('SELECT * FROM subscriptions WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Abonnement introuvable.' });

  const fields = ['user_id', 'plan', 'billing_cycle', 'price_paid', 'payment_method', 'status', 'start_date', 'end_date'];
  const updates = [];
  const params = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ message: 'Aucune modification a enregistrer.' });

  params.push(req.params.id);
  await db.query(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Abonnement mis a jour.' });
}

// DELETE /api/subscriptions/:id  (admin only)
async function remove(req, res) {
  const [result] = await db.query('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Abonnement introuvable.' });
  res.json({ message: 'Abonnement supprime.' });
}

module.exports = {
  getPlans, getAll, getAccessStatus,
  checkout,
  uploadReceipt, approveBankTransfer, activateCode,
  cancelPending, regenerateCode,
  create, update, remove,
};
