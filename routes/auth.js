const express = require('express');
const https = require('https');
const router = express.Router();

let lastUserKey = null;
function getLastUserKey() { return lastUserKey; }

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

  let agent;
  try {
    agent = buildTlsAgent();
  } catch (e) {
    console.error('[auth] buildTlsAgent error:', e.message);
  }
  if (!agent) {
    console.warn('[auth] no TLS agent, using dev fallback. TLS_CERT set:', !!process.env.TLS_CERT, 'TLS_KEY set:', !!process.env.TLS_KEY);
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

    console.log('[auth] AIT token response:', raw.slice(0, 200));
    const { userKey } = JSON.parse(raw);
    if (!userKey) return res.status(401).json({ error: 'login failed' });
    lastUserKey = userKey;
    res.json({ userKey });
  } catch (err) {
    console.error('[auth]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
module.exports.getLastUserKey = getLastUserKey;
