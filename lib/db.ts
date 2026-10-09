/**
 * Database access.
 *
 * Production (Render): PostgreSQL through DATABASE_URL.
 * Local development / tests: an embedded PostgreSQL (PGlite) so the project runs with zero setup.
 * The schema is created idempotently on first use, so there is no separate migration step.
 */
import { hashPassword } from './password';
import { seedProperties } from './seed-properties';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

interface Driver {
  query(sql: string, params: unknown[]): Promise<Row[]>;
  exec(sql: string): Promise<void>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  property_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  consent_version TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries (created_at DESC);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  at BIGINT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const globalRef = globalThis as unknown as { __bsukDb?: Promise<Driver> };

function normalise(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return out;
  });
}

function needsSsl(url: string): boolean {
  if (process.env.DATABASE_SSL === 'true') return true;
  if (process.env.DATABASE_SSL === 'false') return false;
  // Render's external hostnames need TLS; the internal hostname (no dots) does not.
  return /\.render\.com/.test(url);
}

async function createDriver(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pg = await import('pg');
    pg.types.setTypeParser(20, (value: string) => Number(value));
    const pool = new pg.Pool({
      connectionString: url,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000, // tolerates a serverless database waking from idle
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
    return {
      query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
      exec: async (sql) => {
        await pool.query(sql);
      },
    };
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_EMBEDDED_DB !== 'true') {
    throw new Error('DATABASE_URL is not set. Connect a PostgreSQL database in Render.');
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR ?? '.pglite/data';
  if (dir !== 'memory') (await import('node:fs')).mkdirSync(dir, { recursive: true });
  const pglite = dir === 'memory' ? new PGlite() : new PGlite(dir);
  return {
    query: async (sql, params) =>
      normalise((await pglite.query(sql, params as unknown[])).rows as Row[]),
    exec: async (sql) => {
      await pglite.exec(sql);
    },
  };
}

async function initialise(): Promise<Driver> {
  const driver = await createDriver();
  await driver.exec(SCHEMA);

  // Sample properties are inserted once, so the team can edit or delete them from the workspace.
  const first = await driver.query(
    "INSERT INTO meta (key, value) VALUES ('samples_seeded', '1') ON CONFLICT DO NOTHING RETURNING key",
    [],
  );
  if (first.length) {
    for (const property of seedProperties) {
      await driver.query(
        'INSERT INTO listings (id, slug, data, updated_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [property.id, property.slug, JSON.stringify(property), Date.now()],
      );
    }
  }

  // The first owner account is created from environment variables when there are no users yet.
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (email && password) {
    const users = await driver.query('SELECT 1 AS present FROM users LIMIT 1', []);
    if (!users.length) {
      await driver.query(
        "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES ($1,$2,$3,'owner',$4,$5) ON CONFLICT DO NOTHING",
        [crypto.randomUUID(), email, 'Owner', await hashPassword(password), Date.now()],
      );
    }
  }
  return driver;
}

function driver(): Promise<Driver> {
  if (!globalRef.__bsukDb) {
    globalRef.__bsukDb = initialise().catch((error) => {
      globalRef.__bsukDb = undefined; // allow a retry on the next request
      throw error;
    });
  }
  return globalRef.__bsukDb;
}

export async function query<T extends Row = Row>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await (await driver()).query(sql, params)) as T[];
}

export async function queryOne<T extends Row = Row>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}
