const express = require('express');
const https = require('https');
const router = express.Router();

const API_KEY = process.env.GOOGLE_VISION_API_KEY;

function callVisionApi(b64Image) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      requests: [{
        image: { content: b64Image },
        features: [{ type: 'TEXT_DETECTION' }],
        imageContext: { languageHints: ['ko'] },
      }],
    });
    const req = https.request({
      hostname: 'vision.googleapis.com',
      path: `/v1/images:annotate?key=${API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.error) return reject(new Error(json.error.message));
        const text = json.responses?.[0]?.textAnnotations?.[0]?.description ?? '';
        resolve(text.normalize('NFC'));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseOcrText(text) {
  const result = {};

  const dateMatch = text.match(/(\d{4})\s*[-./년\s]+\s*(\d{1,2})\s*[-./월\s]+\s*(\d{1,2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    result.expiry = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const barcodeMatch = text.match(/\d[\d\s\-]{7,}\d/);
  if (barcodeMatch) {
    const digits = barcodeMatch[0].replace(/[\s\-]/g, '');
    if (digits.length >= 8) result.barcodeNumber = digits;
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 2 && !/^[\d\s\-]+$/.test(l) && /[가-힣]/.test(l));

  if (lines[0]) result.brand = lines[0].slice(0, 20);
  if (lines[1]) {
    result.name = lines[1]
      .replace(/\d{1,3}(,\d{3})*원/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  }

  return result;
}

router.post('/', async (req, res) => {
  try {
    const { imageDataUrl } = req.body;
    if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl 필요' });

    const b64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const text = await callVisionApi(b64);
    const parsed = parseOcrText(text);
    res.json({ ...parsed, rawText: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
