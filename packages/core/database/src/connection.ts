/**
 * Database Connection Manager
 * Handles connection pooling for Postgres/Supabase/Neon
 */

import pg from 'pg';
import type { DatabaseConfig, ConnectionPoolConfig, TransactionClient } from './types.js';

const { Pool, Client } = pg;

// ============================================================
// CONNECTION POOL
// ============================================================

export class DatabaseConnection {
  private pool: pg.Pool | null = null;
  private config: DatabaseConfig;
  private poolConfig: ConnectionPoolConfig;
  private isConnected = false;

  constructor(config: DatabaseConfig, poolConfig?: Partial<ConnectionPoolConfig>) {
    this.config = config;
    this.poolConfig = {
      min: poolConfig?.min ?? 2,
      max: poolConfig?.max ?? 10,
      idleTimeoutMs: poolConfig?.idleTimeoutMs ?? 30000,
      connectionTimeoutMs: poolConfig?.connectionTimeoutMs ?? 10000,
    };
  }

  /**
   * Initialize the connection pool
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    const pgConfig = this.buildPgConfig();
    
    this.pool = new Pool({
      ...pgConfig,
      min: this.poolConfig.min,
      max: this.poolConfig.max,
      idleTimeoutMillis: this.poolConfig.idleTimeoutMs,
      connectionTimeoutMillis: this.poolConfig.connectionTimeoutMs,
    });

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      this.isConnected = true;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }

  /**
   * Execute a query
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const start = Date.now();
    const result = await this.pool.query(sql, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`[Database] Slow query (${duration}ms):`, sql.substring(0, 100));
    }

    return result.rows as T[];
  }

  /**
   * Execute a query and return single row
   */
  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /**
   * Execute a mutation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const result = await this.pool.query(sql, params);
    return { affectedRows: result.rowCount ?? 0 };
  }

  /**
   * Execute a query and return affected row count
   */
  async executeReturning<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ data: T[]; affectedRows: number }> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const result = await this.pool.query(sql, params);
    return {
      data: result.rows as T[],
      affectedRows: result.rowCount ?? 0,
    };
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<TransactionClient> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const client = await this.pool.connect();
    await client.query('BEGIN');

    return {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
        const result = await client.query(sql, params);
        return result.rows as T[];
      },
      async commit(): Promise<void> {
        await client.query('COMMIT');
        client.release();
      },
      async rollback(): Promise<void> {
        await client.query('ROLLBACK');
        client.release();
      },
    };
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction<T>(fn: (client: TransactionClient) => Promise<T>): Promise<T> {
    const client = await this.beginTransaction();
    try {
      const result = await fn(client);
      await client.commit();
      return result;
    } catch (error) {
      await client.rollback();
      throw error;
    }
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): { total: number; idle: number; waiting: number } {
    if (!this.pool) {
      return { total: 0, idle: 0, waiting: 0 };
    }
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Build Postgres config from Neo config
   */
  private buildPgConfig(): pg.PoolConfig {
    if (this.config.connectionString) {
      return {
        connectionString: this.config.connectionString,
        ssl: this.config.ssl ?? this.getDefaultSsl(),
      };
    }

    return {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 5432,
      database: this.config.database ?? 'neo',
      user: this.config.user ?? 'postgres',
      password: this.config.password,
      ssl: this.config.ssl ?? this.getDefaultSsl(),
    };
  }

  /**
   * Get default SSL config based on provider
   */
  private getDefaultSsl(): boolean | { rejectUnauthorized: boolean } {
    switch (this.config.provider) {
      case 'supabase':
      case 'neon':
        return { rejectUnauthorized: false };
      default:
        return false;
    }
  }
}

// ============================================================
// CONNECTION FACTORY
// ============================================================

/**
 * Create a database connection from environment variables
 */
export function createConnectionFromEnv(): DatabaseConnection {
  const provider = (process.env.NEO_DB_PROVIDER ?? 'postgres') as DatabaseConfig['provider'];
  
  const config: DatabaseConfig = {
    provider,
    connectionString: process.env.DATABASE_URL ?? process.env.NEO_DB_URL,
    host: process.env.NEO_DB_HOST,
    port: process.env.NEO_DB_PORT ? parseInt(process.env.NEO_DB_PORT, 10) : undefined,
    database: process.env.NEO_DB_NAME,
    user: process.env.NEO_DB_USER,
    password: process.env.NEO_DB_PASSWORD,
    schema: process.env.NEO_DB_SCHEMA ?? 'public',
  };

  return new DatabaseConnection(config);
}

/**
 * Create a connection for Supabase
 */
export function createSupabaseConnection(connectionString: string): DatabaseConnection {
  return new DatabaseConnection({
    provider: 'supabase',
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

/**
 * Create a connection for Neon
 */
export function createNeonConnection(connectionString: string): DatabaseConnection {
  return new DatabaseConnection({
    provider: 'neon',
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

// Singleton instance
let globalConnection: DatabaseConnection | null = null;

export function getConnection(): DatabaseConnection {
  if (!globalConnection) {
    globalConnection = createConnectionFromEnv();
  }
  return globalConnection;
}

export function setConnection(connection: DatabaseConnection): void {
  globalConnection = connection;
}

export async function closeConnection(): Promise<void> {
  if (globalConnection) {
    await globalConnection.disconnect();
    globalConnection = null;
  }
}
