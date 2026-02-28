import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

let pool;

export async function connectPostgres() {
  const isProduction = process.env.NODE_ENV === 'production';

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // Render's managed Postgres requires SSL
    ...(isProduction && {
      ssl: { rejectUnauthorized: false },
    }),
  });

  // Test connection
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();
  return pool;
}

/**
 * Run schema.sql to create tables if they don't exist.
 * Safe to call on every startup because schema uses CREATE IF NOT EXISTS.
 */
export async function initSchema() {
  try {
    const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('✅ Database schema verified / created');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err.message);
    throw err;
  }
}

export function getPool() {
  if (!pool) throw new Error('PostgreSQL not connected. Call connectPostgres() first.');
  return pool;
}

export async function query(text, params) {
  return pool.query(text, params);
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
