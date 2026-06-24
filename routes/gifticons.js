const express = require('express');
const { v4: uuid } = require('uuid');
const router = express.Router();

// in-memory store: Map<userKey, Gifticon[]>
const store = new Map();

function getUserGifticons(userKey) {
  if (!store.has(userKey)) store.set(userKey, []);
  return store.get(userKey);
}

function auth(req, res, next) {
  const userKey = req.headers['authorization']?.replace('Bearer ', '');
  if (!userKey) return res.status(401).json({ error: 'unauthorized' });
  req.userKey = userKey;
  next();
}

// GET /api/gifticons
router.get('/', auth, (req, res) => {
  res.json(getUserGifticons(req.userKey));
});

// POST /api/gifticons
// body: { brand, name, expiry, imageUrl?, thumbnailUrl?, barcodeNumber? }
router.post('/', auth, (req, res) => {
  const { brand, name, expiry, imageUrl, thumbnailUrl, barcodeNumber } = req.body;
  if (!brand || !name || !expiry) return res.status(400).json({ error: 'brand, name, expiry required' });

  if (barcodeNumber) {
    const duplicate = getUserGifticons(req.userKey).find(
      (g) => !g.used && g.barcodeNumber === barcodeNumber
    );
    if (duplicate) return res.status(409).json({ error: '이미 등록된 기프티콘이에요.' });
  }

  const item = {
    id: uuid(),
    userKey: req.userKey,
    brand,
    name,
    expiry,
    used: false,
    imageUrl: imageUrl ?? null,
    thumbnailUrl: thumbnailUrl ?? null,
    barcodeNumber: barcodeNumber ?? null,
    createdAt: new Date().toISOString(),
  };
  getUserGifticons(req.userKey).push(item);
  res.status(201).json(item);
});

// PATCH /api/gifticons/:id
// body: { used? }
router.patch('/:id', auth, (req, res) => {
  const list = getUserGifticons(req.userKey);
  const idx = list.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  list[idx] = { ...list[idx], ...req.body };
  res.json(list[idx]);
});

// DELETE /api/gifticons/:id
router.delete('/:id', auth, (req, res) => {
  const list = getUserGifticons(req.userKey);
  const idx = list.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  list.splice(idx, 1);
  res.json({ ok: true });
});

// 스케줄러에서 전체 기프티콘 접근용 (내부 함수)
function getAllGifticons() {
  const all = [];
  for (const list of store.values()) all.push(...list);
  return all;
}

module.exports = { router, getAllGifticons };
