import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDatabase(connectionString: string) {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    db = drizzle(pool, { schema });
  }
  return db!;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
