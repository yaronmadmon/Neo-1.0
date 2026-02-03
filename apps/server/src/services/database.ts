/**
 * Database Service
 * Handles database connection, migrations, and raw queries
 */
import { Pool, PoolClient } from 'pg';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool | null {
  if (!config.databaseUrl) {
    return null;
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  
  return pool;
}

/**
 * Check if database is available
 */
export function isDatabaseEnabled(): boolean {
  return config.databaseEnabled;
}

/**
 * Execute a query
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const db = getPool();
  if (!db) {
    throw new Error('Database not configured');
  }
  
  const result = await db.query(sql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

/**
 * Execute a command (INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  params?: unknown[]
): Promise<{ rowCount: number }> {
  const db = getPool();
  if (!db) {
    throw new Error('Database not configured');
  }
  
  const result = await db.query(sql, params);
  return { rowCount: result.rowCount || 0 };
}

/**
 * Get a client for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const db = getPool();
  if (!db) {
    throw new Error('Database not configured');
  }
  
  return db.connect();
}

/**
 * Run migrations
 */
export async function runMigrations(): Promise<void> {
  const db = getPool();
  if (!db) {
    console.log('Database not configured, skipping migrations');
    return;
  }
  
  console.log('Running database migrations...');
  
  // Create migrations tracking table
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Get executed migrations
  const executed = await db.query('SELECT name FROM _migrations');
  const executedNames = new Set(executed.rows.map((r: any) => r.name));
  
  // Get migration files
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`  Skipping ${file} (already executed)`);
      continue;
    }
    
    console.log(`  Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file} completed`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${file} failed:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
  
  console.log('Migrations complete');
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  const db = getPool();
  if (!db) {
    return false;
  }
  
  try {
    await db.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
