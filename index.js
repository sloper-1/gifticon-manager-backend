const express = require('express');
const { router: gifticonsRouter } = require('./routes/gifticons');
const authRouter = require('./routes/auth');
const ocrRouter = require('./routes/ocr');
require('./scheduler');

const app = express();
app.use(express.json({ limit: '10mb' })); // base64 이미지 허용
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

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`[gifticon-backend] listening on ${PORT}`));
