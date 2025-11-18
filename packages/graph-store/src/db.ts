import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDatabase(connectionString: string) {
  if (!pool) {
    // Configure SSL based on environment
    // For production, set NODE_ENV=production and use proper SSL certificates
    // For development with services like Neon, you may need to disable cert validation
    const sslConfig = process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }  // Secure: validate certificates in production
      : { rejectUnauthorized: false }; // Dev: allow self-signed certs

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : sslConfig,
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
