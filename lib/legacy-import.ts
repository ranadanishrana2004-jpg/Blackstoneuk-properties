/**
 * One-time copy of site data from a previous PostgreSQL database into the current one.
 *
 * Runs at start-up only when LEGACY_DATABASE_URL is set. It is idempotent (existing rows are never
 * overwritten) and records completion in the `meta` table, so it runs at most once. After a
 * successful import the variable can be removed.
 */
import pg from 'pg';
import { query, queryOne } from './db';

const TABLES: { name: string; key: string[] | null }[] = [
  { name: 'users', key: ['id'] },
  { name: 'listings', key: ['id'] },
  { name: 'media', key: ['id'] },
  { name: 'enquiries', key: ['id'] },
  { name: 'audit_log', key: null },
  { name: 'meta', key: ['key'] }, // site settings such as social links
];
// Sessions, rate limits and queued mail belong to the old deployment and are not copied.

const DONE_KEY = 'legacy_import_done';

async function columnsOf(
  table: string,
  run: (sql: string, params: unknown[]) => Promise<{ column_name: string }[]>,
) {
  return (
    await run(
      'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema() ORDER BY ordinal_position',
      [table],
    )
  ).map((row) => row.column_name);
}

export async function importLegacyData(): Promise<void> {
  const raw = process.env.LEGACY_DATABASE_URL;
  if (!raw) return;

  // Touching the database first makes the app create its schema before rows are copied in.
  await query('SELECT 1');
  if (await queryOne('SELECT 1 AS done FROM meta WHERE key = $1', [DONE_KEY])) {
    console.log('Legacy import already completed; remove LEGACY_DATABASE_URL.');
    return;
  }

  // channel_binding=require is not supported by node-postgres.
  const source = new pg.Pool({
    connectionString: raw.replace(/[&?]channel_binding=require/, ''),
    connectionTimeoutMillis: 20_000,
    max: 2,
  });
  const summary: string[] = [];
  try {
    for (const { name, key } of TABLES) {
      const sourceCols = await columnsOf(
        name,
        async (sql, params) => (await source.query(sql, params)).rows,
      );
      const targetCols = await columnsOf(name, (sql, params) =>
        query<{ column_name: string }>(sql, params),
      );
      if (!sourceCols.length || !targetCols.length) {
        summary.push(`${name}: skipped`);
        continue;
      }
      const cols = sourceCols.filter(
        (c) =>
          targetCols.includes(c) && !(name === 'audit_log' && c === 'id') && !(name === 'meta'),
      );
      const metaFilter = name === 'meta' ? " WHERE key <> 'samples_seeded'" : '';
      const names = (name === 'meta' ? ['key', 'value'] : cols).map((c) => `"${c}"`).join(', ');
      const useCols = name === 'meta' ? ['key', 'value'] : cols;
      const rows = (await source.query(`SELECT ${names} FROM ${name}${metaFilter}`)).rows;
      let copied = 0;
      for (const row of rows) {
        const placeholders = useCols.map((_, i) => `$${i + 1}`).join(', ');
        // The app creates an owner from ADMIN_EMAIL on first start; the migrated account (with its
        // current password) replaces it. Everything else keeps existing rows untouched.
        const conflict =
          name === 'users'
            ? 'ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash'
            : key
              ? `ON CONFLICT (${key.join(', ')}) DO NOTHING`
              : 'ON CONFLICT DO NOTHING';
        const inserted = await query(
          `INSERT INTO ${name} (${names}) VALUES (${placeholders}) ${conflict} RETURNING 1 AS ok`,
          useCols.map((c) => row[c]),
        );
        copied += inserted.length;
      }
      summary.push(`${name}: ${rows.length} found, ${copied} copied`);
    }
    await query(
      'INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [DONE_KEY, new Date().toISOString()],
    );
    console.log('Legacy import completed. ' + summary.join('; '));
  } finally {
    await source.end().catch(() => undefined);
  }
}
