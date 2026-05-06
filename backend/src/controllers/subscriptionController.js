const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { findActiveSubscription } = require('../middleware/subscriptionAccess');
const { handleValidationErrors } = require('../utils/validation');

const BILLING_CYCLE_MONTHS = {
  '1_month': 1,
  '3_months': 3,
  '1_year': 12,
};

const PAYMENT_METHODS = ['online', 'bank_transfer'];
const OPEN_SUBSCRIPTION_STATUSES = ['pending_receipt', 'pending_approval', 'pending_code'];

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
  return {
    has_active_subscription: Boolean(activeSubscription),
    has_pending_activation: Boolean(pendingSubscription),
    active_subscription: activeSubscription,
    pending_subscription: pendingSubscription,
    development_code: process.env.NODE_ENV !== 'production' && pendingSubscription?.status === 'pending_code'
      ? pendingSubscription.activation_code_preview ?? null
      : null,
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
  const [rows] = await db.query(
    `SELECT *
     FROM subscription_plans
     WHERE is_active = 1
     ORDER BY display_order ASC, id ASC`
  );

  res.json(rows.map(normalizePlan));
}

// GET /api/subscriptions
async function getAll(req, res) {
  let rows;

  if (req.user.role === 'admin') {
    [rows] = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC`
    );
  } else {
    [rows] = await db.query(
      `SELECT *
       FROM subscriptions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
  }

  res.json(rows);
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

  const activeSubscription = await findActiveSubscription(req.user.id);
  if (activeSubscription) {
    return res.status(409).json({
      code: 'ACTIVE_SUBSCRIPTION_EXISTS',
      message: 'Cet utilisateur a deja un abonnement actif.',
    });
  }

  const pendingSubscription = await findOpenSubscription(req.user.id);
  if (pendingSubscription) {
    return res.status(409).json({
      code: 'PENDING_SUBSCRIPTION_EXISTS',
      message: 'Une demande d\'abonnement est deja en cours pour cet utilisateur.',
    });
  }

  const [plans] = await db.query(
    `SELECT *
     FROM subscription_plans
     WHERE slug = ? AND is_active = 1
     LIMIT 1`,
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

  const [result] = await db.query(
    `INSERT INTO subscriptions (
      user_id,
      plan,
      billing_cycle,
      price_paid,
      payment_method,
      status,
      bank_receipt_path,
      bank_receipt_original_name,
      receipt_uploaded_at,
      activation_code_hash,
      activation_code_preview,
      activation_code_expires_at,
      approved_by,
      approved_at,
      start_date,
      end_date
     ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, NULL, NULL, ?, ?)`,
    [
      req.user.id,
      plan,
      billing_cycle,
      Number(selectedPlan[priceField]),
      payment_method,
      status,
      activationCodeHash,
      process.env.NODE_ENV !== 'production' && activationCode ? activationCode : null,
      activationCodeExpiresAt,
      start_date,
      end_date,
    ]
  );

  res.status(201).json({
    message: payment_method === 'bank_transfer'
      ? 'Abonnement cree. Deposez votre recu bancaire pour validation par un administrateur avant la generation du code.'
      : 'Abonnement cree. Saisissez le code d\'activation pour debloquer l\'acces.',
    id: result.insertId,
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
         approved_by = ?,
         approved_at = NOW()
     WHERE id = ?`,
    [
      activationCodeHash,
      process.env.NODE_ENV !== 'production' ? activationCode : null,
      activationCodeExpiresAt,
      req.user.id,
      subscription.id,
    ]
  );

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

  const providedCodeHash = hashActivationCode(String(req.body.code).trim().toUpperCase());
  if (providedCodeHash !== pendingSubscription.activation_code_hash) {
    return res.status(400).json({
      code: 'INVALID_ACTIVATION_CODE',
      message: 'Code d\'activation invalide.',
    });
  }

  const { start_date, end_date } = calculateSubscriptionDates(pendingSubscription.billing_cycle, new Date());
  await db.query(
    `UPDATE subscriptions
     SET status = 'active',
         start_date = ?,
         end_date = ?,
         activation_code_hash = NULL,
         activation_code_preview = NULL,
         activation_code_expires_at = NULL,
         activated_at = NOW()
     WHERE id = ?`,
    [start_date, end_date, pendingSubscription.id]
  );

  res.json({
    message: 'Abonnement active.',
    start_date,
    end_date,
  });
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

module.exports = { getPlans, getAll, getAccessStatus, checkout, uploadReceipt, approveBankTransfer, activateCode, create, update, remove };