const express = require('express');
const https = require('https');
const router = express.Router();

let lastUserKey = null;
let lastAuthResult = null;
function getLastUserKey() { return lastUserKey; }
function getLastAuthResult() { return lastAuthResult; }

const TOKEN_URL = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const ME_URL = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me';

function httpsGet(url, headers) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname: u.hostname, path: u.pathname, method: 'GET', headers }, (resp) => {
      let d = '';
      resp.on('data', (chunk) => (d += chunk));
      resp.on('end', () => resolve(d));
    });
    r.on('error', reject);
    r.end();
  });
}

function httpsPost(url, headers, body) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers },
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
}

// POST /api/login
// body: { authorizationCode, referrer }
// response: { userKey }
router.post('/', async (req, res) => {
  const { authorizationCode, referrer } = req.body;
  if (!authorizationCode) return res.status(400).json({ error: 'missing authorizationCode' });

  const partnerApiKey = process.env.PARTNER_API_KEY;
  if (!partnerApiKey) {
    console.warn('[auth] PARTNER_API_KEY not set, using dev fallback');
    return res.json({ userKey: `dev_${authorizationCode.slice(0, 8)}` });
  }

  try {
    // Step 1: authorizationCode → accessToken
    const tokenRaw = await httpsPost(
      TOKEN_URL,
      { Authorization: `Bearer ${partnerApiKey}` },
      JSON.stringify({ authorizationCode, referrer })
    );
    lastAuthResult = tokenRaw.slice(0, 500);
    console.log('[auth] generate-token response:', tokenRaw.slice(0, 200));

    const tokenData = JSON.parse(tokenRaw);
    const accessToken = tokenData.success?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'token exchange failed', aitResponse: tokenRaw.slice(0, 200) });
    }

    // Step 2: accessToken → userKey
    const meRaw = await httpsGet(ME_URL, { Authorization: `Bearer ${accessToken}` });
    console.log('[auth] login-me response:', meRaw.slice(0, 200));

    const meData = JSON.parse(meRaw);
    const userKey = meData.success?.userKey;
    if (!userKey) {
      return res.status(401).json({ error: 'userKey fetch failed', aitResponse: meRaw.slice(0, 200) });
    }

    lastUserKey = String(userKey);
    res.json({ userKey: String(userKey) });
  } catch (err) {
    console.error('[auth]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
module.exports.getLastUserKey = getLastUserKey;
module.exports.getLastAuthResult = getLastAuthResult;
