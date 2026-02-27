import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

async function initDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gravit',
  });

  try {
    console.log('📦 Initializing database schema...');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);
    console.log('✅ Schema created successfully');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

initDatabase().catch(() => process.exit(1));
