/**
 * One-off, idempotent copy of site data from one PostgreSQL database to another.
 *
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/migrate-db.mjs
 *
 * The target schema is created by the app on first start, so start the app once against the
 * target database (or run this script after the first deploy). Rows that already exist in the
 * target are left untouched, so the script is safe to run more than once.
 */
import pg from 'pg';

const clean = (url) => url.replace(/[&?]channel_binding=require/, '');
const ssl = (url) =>
  /\.render\.com|neon\.tech/.test(url) ? { rejectUnauthorized: false } : undefined;

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  console.error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL.');
  process.exit(1);
}
pg.types.setTypeParser(20, (v) => Number(v));

const source = new pg.Pool({
  connectionString: clean(sourceUrl),
  ssl: ssl(sourceUrl),
  connectionTimeoutMillis: 20000,
});
const target = new pg.Pool({
  connectionString: clean(targetUrl),
  ssl: ssl(targetUrl),
  connectionTimeoutMillis: 20000,
});

// Parents before children. Sessions, rate limits and the outbox are deliberately not copied:
// people sign in again, and queued mail belongs to the old deployment.
const TABLES = [
  { name: 'users', key: ['id'] },
  { name: 'listings', key: ['id'] },
  { name: 'media', key: ['id'] },
  { name: 'enquiries', key: ['id'] },
  { name: 'audit_log', key: null },
  { name: 'meta', key: ['key'] }, // site settings such as social links
];

async function columns(pool, table) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((row) => row.column_name);
}

let failed = false;
try {
  for (const { name, key, optional } of TABLES) {
    const sourceCols = await columns(source, name);
    const targetCols = await columns(target, name);
    if (!sourceCols.length || !targetCols.length) {
      console.log(`${name}: skipped (${optional ? 'not present' : 'missing table'})`);
      if (!optional) failed = true;
      continue;
    }
    const cols = sourceCols.filter(
      (c) => targetCols.includes(c) && !(name === 'audit_log' && c === 'id'),
    );
    const rows = (await source.query(`SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM ${name}`))
      .rows;
    let copied = 0;
    for (const row of rows) {
      const values = cols.map((c) => row[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const conflict = key
        ? `ON CONFLICT (${key.join(', ')}) DO NOTHING`
        : 'ON CONFLICT DO NOTHING';
      const result = await target.query(
        `INSERT INTO ${name} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders}) ${conflict}`,
        values,
      );
      copied += result.rowCount ?? 0;
    }
    console.log(`${name}: ${rows.length} found, ${copied} copied`);
  }
} catch (error) {
  failed = true;
  console.error('Migration failed:', error.message);
} finally {
  await source.end();
  await target.end();
}
process.exit(failed ? 1 : 0);
