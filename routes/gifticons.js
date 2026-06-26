const express = require('express');
const { v4: uuid } = require('uuid');
const { pool } = require('../db');
const router = express.Router();

function auth(req, res, next) {
  const userKey = req.headers['authorization']?.replace('Bearer ', '');
  if (!userKey) return res.status(401).json({ error: 'unauthorized' });
  req.userKey = userKey;
  next();
}

function toClient(row) {
  return {
    id: row.id,
    userKey: row.user_key,
    brand: row.brand,
    name: row.name,
    expiry: row.expiry,
    used: row.used,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    barcodeNumber: row.barcode_number,
    createdAt: row.created_at,
  };
}

// GET /api/gifticons
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM gifticons WHERE user_key = $1 ORDER BY created_at ASC',
    [req.userKey]
  );
  res.json(rows.map(toClient));
});

// POST /api/gifticons
router.post('/', auth, async (req, res) => {
  const { brand, name, expiry, imageUrl, thumbnailUrl, barcodeNumber } = req.body;
  if (!brand || !name || !expiry) return res.status(400).json({ error: 'brand, name, expiry required' });

  if (barcodeNumber) {
    const { rows } = await pool.query(
      'SELECT id FROM gifticons WHERE user_key = $1 AND barcode_number = $2 AND used = FALSE',
      [req.userKey, barcodeNumber]
    );
    if (rows.length > 0) return res.status(409).json({ error: '이미 등록된 기프티콘이에요.' });
  }

  const id = uuid();
  const { rows } = await pool.query(
    `INSERT INTO gifticons (id, user_key, brand, name, expiry, image_url, thumbnail_url, barcode_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, req.userKey, brand, name, expiry, imageUrl ?? null, thumbnailUrl ?? null, barcodeNumber ?? null]
  );
  res.status(201).json(toClient(rows[0]));
});

// PATCH /api/gifticons/:id
router.patch('/:id', auth, async (req, res) => {
  const { used } = req.body;
  const { rows } = await pool.query(
    'UPDATE gifticons SET used = $1 WHERE id = $2 AND user_key = $3 RETURNING *',
    [used, req.params.id, req.userKey]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'not found' });
  res.json(toClient(rows[0]));
});

// DELETE /api/gifticons/:id
router.delete('/:id', auth, async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM gifticons WHERE id = $1 AND user_key = $2',
    [req.params.id, req.userKey]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

async function getAllGifticons() {
  const { rows } = await pool.query('SELECT * FROM gifticons WHERE used = FALSE');
  return rows.map(toClient);
}

module.exports = { router, getAllGifticons };
