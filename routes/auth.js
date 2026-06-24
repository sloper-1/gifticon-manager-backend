const express = require('express');
const https = require('https');
const router = express.Router();

const TOKEN_URL = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/oauth2/token';

function buildTlsAgent() {
  if (!process.env.TLS_CERT || !process.env.TLS_KEY) return undefined;
  return new https.Agent({
    cert: Buffer.from(process.env.TLS_CERT, 'base64').toString(),
    key: Buffer.from(process.env.TLS_KEY, 'base64').toString(),
  });
}

// POST /api/login
// body: { authorizationCode, referrer }
// response: { userKey }
router.post('/', async (req, res) => {
  const { authorizationCode, referrer } = req.body;
  if (!authorizationCode) return res.status(400).json({ error: 'missing authorizationCode' });

  const agent = buildTlsAgent();
  if (!agent) {
    // 개발 환경(TLS 없음)에서는 authCode 자체를 userKey로 사용
    return res.json({ userKey: `dev_${authorizationCode.slice(0, 8)}` });
  }

  try {
    const body = JSON.stringify({ authorizationCode, referrer });
    const url = new URL(TOKEN_URL);
    const raw = await new Promise((resolve, reject) => {
      const r = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          agent,
        },
        (resp) => {
          let d = '';
          resp.on('data', (chunk) => (d += chunk));
          resp.on('end', () => resolve(d));
        }
      );
      r.on('error', reject);
      r.write(body);
      r.end();
    });

    const { userKey } = JSON.parse(raw);
    if (!userKey) return res.status(401).json({ error: 'login failed' });
    res.json({ userKey });
  } catch (err) {
    console.error('[auth]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
