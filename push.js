const https = require('https');

const PUSH_URL = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/messenger/send-message';

function buildTlsAgent() {
  if (!process.env.TLS_CERT || !process.env.TLS_KEY) return undefined;
  return new https.Agent({
    cert: Buffer.from(process.env.TLS_CERT, 'base64').toString(),
    key: Buffer.from(process.env.TLS_KEY, 'base64').toString(),
  });
}

async function sendPush(userKey, brand, name, daysLeft) {
  const agent = buildTlsAgent();
  if (!agent) {
    console.warn('[push] TLS_CERT/KEY 미설정, 푸시 스킵');
    return;
  }

  const label = daysLeft === 0 ? '오늘' : `${daysLeft}일 뒤`;
  const body = JSON.stringify({
    templateSetCode: 'gifticon-manager-gifticon-EXPIRY_REMINDER',
    context: { brand, name, label },
  });

  return new Promise((resolve, reject) => {
    const url = new URL(PUSH_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-toss-user-key': userKey,
        },
        agent,
      },
      (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
          else reject(new Error(`push failed ${res.statusCode}: ${data}`));
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { sendPush };
