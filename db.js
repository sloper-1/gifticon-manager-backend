const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vocsjgkigxiunkpbsqws.supabase.co',
  process.env.SUPABASE_SECRET_KEY
);

async function init() {
  // 테이블이 없으면 Supabase SQL Editor에서 직접 생성해야 함
  // 여기서는 연결만 확인
  const { error } = await supabase.from('gifticons').select('id').limit(1);
  if (error && error.code !== 'PGRST116') {
    throw new Error(`DB init failed: ${error.message}`);
  }
}

module.exports = { supabase, init };
