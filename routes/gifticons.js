const express = require('express');
const { v4: uuid } = require('uuid');
const { supabase } = require('../db');
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
  const { data, error } = await supabase
    .from('gifticons')
    .select('*')
    .eq('user_key', req.userKey)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toClient));
});

// POST /api/gifticons
router.post('/', auth, async (req, res) => {
  const { brand, name, expiry, imageUrl, thumbnailUrl, barcodeNumber } = req.body;
  if (!brand || !name || !expiry) return res.status(400).json({ error: 'brand, name, expiry required' });

  if (barcodeNumber) {
    const { data } = await supabase
      .from('gifticons')
      .select('id')
      .eq('user_key', req.userKey)
      .eq('barcode_number', barcodeNumber)
      .eq('used', false)
      .limit(1);
    if (data?.length > 0) return res.status(409).json({ error: '이미 등록된 기프티콘이에요.' });
  }

  const { data, error } = await supabase
    .from('gifticons')
    .insert({
      id: uuid(),
      user_key: req.userKey,
      brand,
      name,
      expiry,
      image_url: imageUrl ?? null,
      thumbnail_url: thumbnailUrl ?? null,
      barcode_number: barcodeNumber ?? null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toClient(data));
});

// PATCH /api/gifticons/:id
router.patch('/:id', auth, async (req, res) => {
  const { used } = req.body;
  const { data, error } = await supabase
    .from('gifticons')
    .update({ used })
    .eq('id', req.params.id)
    .eq('user_key', req.userKey)
    .select()
    .single();
  if (error) return res.status(404).json({ error: 'not found' });
  res.json(toClient(data));
});

// DELETE /api/gifticons/:id
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('gifticons')
    .delete()
    .eq('id', req.params.id)
    .eq('user_key', req.userKey);
  if (error) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

async function getAllGifticons() {
  const { data } = await supabase
    .from('gifticons')
    .select('*')
    .eq('used', false);
  return (data ?? []).map(toClient);
}

module.exports = { router, getAllGifticons };
