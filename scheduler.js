const cron = require('node-cron');
const { getAllGifticons } = require('./routes/gifticons');
const { sendPush } = require('./push');

function daysLeft(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(iso);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / 86400000);
}

async function runPushCheck() {
  console.log('[scheduler] 만료 임박 푸시 발송 시작');
  const gifticons = await getAllGifticons();
  const result = [];

  for (const g of gifticons) {
    const d = daysLeft(g.expiry);
    if ([7, 3, 1].includes(d)) {
      try {
        await sendPush(g.userKey, g.brand, g.name, d);
        console.log(`[scheduler] 푸시 발송: ${g.userKey} → ${g.brand} ${g.name} D-${d}`);
        result.push({ id: g.id, userKey: g.userKey, daysLeft: d, ok: true });
      } catch (err) {
        console.error(`[scheduler] 푸시 실패: ${g.id}`, err.message);
        result.push({ id: g.id, userKey: g.userKey, daysLeft: d, ok: false, error: err.message });
      }
    }
  }
  return { checked: gifticons.length, sent: result };
}

// 매일 09:00 KST = UTC 00:00 (UTC+9)
cron.schedule('0 0 * * *', runPushCheck);

module.exports = { runPushCheck };
