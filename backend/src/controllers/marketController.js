const db = require('../config/db');
const { handleValidationErrors } = require('../utils/validation');

const PAYMENT_METHODS = ['cash_on_delivery', 'card', 'bank_transfer'];

// GET /api/market/products
async function getProducts(req, res) {
  const { category, tag, search } = req.query;
  const includeInactive = req.user.role === 'admin' && req.query.include_inactive === 'true';
  let sql    = 'SELECT * FROM products WHERE 1 = 1';
  const params = [];

  if (!includeInactive) {
    sql += ' AND is_active = 1';
  }

  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (tag)      { sql += ' AND tag = ?';      params.push(tag); }
  if (search)   { sql += ' AND name LIKE ?';  params.push(`%${search}%`); }

  sql += ' ORDER BY created_at DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}

// PUT /api/market/products/:id  (admin only)
async function updateProduct(req, res) {
  if (handleValidationErrors(req, res)) return;

  const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Produit introuvable.' });

  const fields = ['name', 'description', 'price', 'category', 'tag', 'stock', 'image_url', 'is_active'];
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
  await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Produit mis a jour.' });
}

// DELETE /api/market/products/:id  (admin only)
async function removeProduct(req, res) {
  const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Produit introuvable.' });
  res.json({ message: 'Produit supprime.' });
}

// POST /api/market/products  (admin only)
async function createProduct(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { name, description, price, category, tag, stock, image_url } = req.body;
  const [result] = await db.query(
    `INSERT INTO products (name, description, price, category, tag, stock, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description || null, price, category || null, tag || 'none', stock || 0, image_url || null]
  );
  res.status(201).json({ message: 'Produit cree.', id: result.insertId });
}

// POST /api/market/orders  (authenticated user)
async function createOrder(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { items, promo_code, payment_method, delivery } = req.body;
  const normalizedItems = items.map((item) => ({
    product_id: Number(item.product_id),
    quantity: Number(item.quantity),
  }));

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ message: 'Mode de paiement invalide.' });
  }

  const normalizedDelivery = {
    full_name: delivery?.full_name?.trim(),
    phone: delivery?.phone?.trim(),
    address: delivery?.address?.trim(),
    city: delivery?.city?.trim(),
    postal_code: delivery?.postal_code?.trim() || null,
    notes: delivery?.notes?.trim() || null,
  };

  if (!normalizedDelivery.full_name || !normalizedDelivery.phone || !normalizedDelivery.address || !normalizedDelivery.city) {
    return res.status(400).json({ message: 'Les informations de livraison sont incompletes.' });
  }

  let promoId      = null;
  let discountRate = 0;
  let promoProductId = null;

  if (promo_code) {
    const [promos] = await db.query(
      `SELECT * FROM promo_codes
       WHERE code = ? AND is_active = 1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [promo_code]
    );
    const promo = promos[0];
    if (!promo) return res.status(400).json({ message: 'Code promo invalide ou expire.' });
    if (promo.product_id && !normalizedItems.some((item) => item.product_id === Number(promo.product_id))) {
      return res.status(400).json({ message: 'Ce code promo ne s\'applique pas aux produits du panier.' });
    }
    promoId      = promo.id;
    discountRate = promo.discount_percent / 100;
    promoProductId = promo.product_id ? Number(promo.product_id) : null;
  }

  // Fetch product prices
  const productIds = [...new Set(normalizedItems.map((item) => item.product_id))];
  const [products] = await db.query(
    `SELECT id, name, price, stock FROM products WHERE id IN (?) AND is_active = 1`,
    [productIds]
  );
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  let subtotal = 0;
  let eligibleSubtotal = 0;
  for (const item of normalizedItems) {
    const product = productMap[item.product_id];
    if (!product) return res.status(400).json({ message: `Produit ${item.product_id} introuvable.` });
    if (product.stock < item.quantity) return res.status(400).json({ message: `Stock insuffisant pour le produit ${item.product_id}.` });
    const lineTotal = Number(product.price) * item.quantity;
    subtotal += lineTotal;
    if (!promoProductId || promoProductId === item.product_id) {
      eligibleSubtotal += lineTotal;
    }
  }
  const discountAmount = eligibleSubtotal * discountRate;
  const total = subtotal - discountAmount;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (
        user_id,
        promo_code_id,
        total_amount,
        payment_method,
        delivery_full_name,
        delivery_phone,
        delivery_address,
        delivery_city,
        delivery_postal_code,
        delivery_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        promoId,
        total.toFixed(2),
        payment_method,
        normalizedDelivery.full_name,
        normalizedDelivery.phone,
        normalizedDelivery.address,
        normalizedDelivery.city,
        normalizedDelivery.postal_code,
        normalizedDelivery.notes,
      ]
    );
    const orderId = orderResult.insertId;

    for (const item of normalizedItems) {
      const product = productMap[item.product_id];
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, product.price]
      );
      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    if (promoId) {
      await conn.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?', [promoId]);
    }

    await conn.commit();
    res.status(201).json({
      message: 'Commande creee.',
      order_id: orderId,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      payment_method,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// GET /api/market/orders  (user sees own orders)
async function getMyOrders(req, res) {
  const [rows] = await db.query(
    `SELECT o.*, pc.code AS promo_code
     FROM orders o
     LEFT JOIN promo_codes pc ON pc.id = o.promo_code_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

// GET /api/market/orders/all  (admin only)
async function getAllOrders(_req, res) {
  const [rows] = await db.query(
    `SELECT o.*, u.first_name, u.last_name, u.email, pc.code AS promo_code
     FROM orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN promo_codes pc ON pc.id = o.promo_code_id
     ORDER BY o.created_at DESC`
  );
  res.json(rows);
}

// PUT /api/market/orders/:id/status  (admin only)
async function updateOrderStatus(req, res) {
  if (handleValidationErrors(req, res)) return;

  const [rows] = await db.query('SELECT id FROM orders WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Commande introuvable.' });

  const allowedStatuses = ['pending', 'paid', 'cancelled', 'refunded'];
  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(422).json({ message: 'Statut de commande invalide.' });
  }

  await db.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  res.json({ message: 'Commande mise a jour.' });
}

// POST /api/market/validate-promo
async function validatePromo(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: 'Le code promo est obligatoire.' });

  const [rows] = await db.query(
    `SELECT id, code, discount_percent, product_id FROM promo_codes
     WHERE code = ? AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR used_count < max_uses)`,
    [code]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Code promo invalide ou expire.' });
  res.json({ valid: true, discount_percent: rows[0].discount_percent, product_id: rows[0].product_id || null });
}

// GET /api/market/promo-codes  (admin only)
async function getPromoCodes(_req, res) {
  const [rows] = await db.query(
    `SELECT pc.*, p.name AS product_name
     FROM promo_codes pc
     LEFT JOIN products p ON p.id = pc.product_id
     ORDER BY pc.created_at DESC`
  );
  res.json(rows);
}

// POST /api/market/promo-codes  (admin only)
async function createPromoCode(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { code, discount_percent, product_id, max_uses, expires_at, is_active } = req.body;
  const [result] = await db.query(
    `INSERT INTO promo_codes (code, discount_percent, product_id, max_uses, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code, discount_percent, product_id || null, max_uses || null, expires_at || null, is_active === undefined ? 1 : is_active]
  );
  res.status(201).json({ message: 'Code promo cree.', id: result.insertId });
}

// PUT /api/market/promo-codes/:id  (admin only)
async function updatePromoCode(req, res) {
  if (handleValidationErrors(req, res)) return;

  const [rows] = await db.query('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Code promo introuvable.' });

  const fields = ['code', 'discount_percent', 'product_id', 'max_uses', 'used_count', 'expires_at', 'is_active'];
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
  await db.query(`UPDATE promo_codes SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Code promo mis a jour.' });
}

// DELETE /api/market/promo-codes/:id  (admin only)
async function removePromoCode(req, res) {
  const [result] = await db.query('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Code promo introuvable.' });
  res.json({ message: 'Code promo supprime.' });
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  removeProduct,
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  validatePromo,
  getPromoCodes,
  createPromoCode,
  updatePromoCode,
  removePromoCode,
};
