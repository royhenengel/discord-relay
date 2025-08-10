import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await c.connect();

  let id = process.env.BOT_STATS_ID;
  if (!id) {
    const pick = await c.query('select id from bot_stats order by created_at asc limit 1');
    id = pick.rows[0]?.id;
    if (!id) throw new Error('No rows in bot_stats; seed one then re-run.');
  }
  console.log('Using bot_stats id:', id);

  const r1 = await c.query(
    'select id, status, uptime, api_calls from bot_stats where id=$1',
    [id]
  );
  console.log('READ bot_stats:', r1.rows[0]);

  await c.query(
    'update bot_stats set api_calls = api_calls + 1, updated_at = now() where id=$1',
    [id]
  );

  const r2 = await c.query(
    'select status, uptime, api_calls from bot_stats where id=$1',
    [id]
  );
  console.log('AFTER UPDATE:', r2.rows[0]);

  const r3 = await c.query(
    "insert into activity_logs(type, message, meta) values('HEALTH','ESM smoke test', jsonb_build_object('ts', now())) returning id"
  );
  console.log('Inserted activity_logs id:', r3.rows[0].id);
}

main().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exitCode = 1;
}).finally(async () => {
  try { await c.end(); } catch {}
});
