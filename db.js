const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gifticons (
      id TEXT PRIMARY KEY,
      user_key TEXT NOT NULL,
      brand TEXT NOT NULL,
      name TEXT NOT NULL,
      expiry TEXT NOT NULL,
      image_url TEXT,
      thumbnail_url TEXT,
      barcode_number TEXT,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

module.exports = { pool, init };
