const express = require('express');
const { router: gifticonsRouter } = require('./routes/gifticons');
const authRouter = require('./routes/auth');
const ocrRouter = require('./routes/ocr');
const { sendPush } = require('./push');
require('./scheduler');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api/login', authRouter);
app.use('/api/gifticons', gifticonsRouter);
app.use('/api/ocr', ocrRouter);
app.get('/health', (_, res) => res.json({ ok: true }));

// POST /test-push { userKey, brand?, name?, daysLeft? }
app.post('/test-push', async (req, res) => {
  const { userKey, brand = '스타벅스', name = '아메리카노', daysLeft = 1 } = req.body;
  if (!userKey) return res.status(400).json({ error: 'userKey required' });
  try {
    const result = await sendPush(userKey, brand, name, daysLeft);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`[gifticon-backend] listening on ${PORT}`));
