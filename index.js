const express = require('express');
const { router: gifticonsRouter } = require('./routes/gifticons');
const authRouter = require('./routes/auth');
const { getLastUserKey, getLastAuthResult } = require('./routes/auth');
const ocrRouter = require('./routes/ocr');
const { sendPush } = require('./push');
const { init } = require('./db');
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

// userKey 캡처 — 라우트보다 먼저 등록
let lastCapturedUserKey = null;
app.use('/api', (req, res, next) => {
  const userKey = req.headers['authorization']?.replace('Bearer ', '');
  if (userKey) lastCapturedUserKey = userKey;
  next();
});

app.use('/api/login', authRouter);
app.use('/api/gifticons', gifticonsRouter);
app.use('/api/ocr', ocrRouter);
app.get('/health', (_, res) => res.json({ ok: true }));

// GET /debug/tls
app.get('/debug/tls', (req, res) => {
  const hasCert = !!process.env.TLS_CERT;
  const hasKey = !!process.env.TLS_KEY;
  let agentOk = false;
  let agentError = null;
  try {
    const https = require('https');
    if (hasCert && hasKey) {
      new https.Agent({
        cert: Buffer.from(process.env.TLS_CERT, 'base64').toString(),
        key: Buffer.from(process.env.TLS_KEY, 'base64').toString(),
      });
      agentOk = true;
    }
  } catch (e) {
    agentError = e.message;
  }
  res.json({ hasCert, hasKey, agentOk, agentError, certLen: process.env.TLS_CERT?.length, keyLen: process.env.TLS_KEY?.length });
});

// GET /debug/auth-result
app.get('/debug/auth-result', (req, res) => {
  res.json({ result: getLastAuthResult() });
});

// GET /debug/userkey
app.get('/debug/userkey', (req, res) => {
  const key = getLastUserKey() || lastCapturedUserKey;
  if (!key) return res.status(404).json({ error: 'no request yet' });
  res.json({ userKey: key });
});

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

// POST /debug/log { message }
let lastDebugLog = null;
app.post('/debug/log', (req, res) => {
  lastDebugLog = req.body?.message ?? '(empty)';
  console.log('[debug/log]', lastDebugLog);
  res.json({ ok: true });
});
app.get('/debug/log', (req, res) => res.json({ log: lastDebugLog }));

const PORT = process.env.PORT ?? 3001;
init().then(() => {
  app.listen(PORT, () => console.log(`[gifticon-backend] listening on ${PORT}`));
}).catch((err) => {
  console.error('[db] init failed', err);
  process.exit(1);
});
