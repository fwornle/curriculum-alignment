/**
 * Database Configuration Module
 * Manages PostgreSQL connection with Supabase/Neon and connection pooling
 */

import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionLimit: number;
  poolTimeout: number;
  idleTimeout: number;
}

export interface DatabaseProvider {
  type: 'supabase' | 'neon';
  url: string;
  apiKey?: string;
  serviceRoleKey?: string;
}

/**
 * Database configuration class with connection pooling
 */
export class DatabaseConnection {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private provider: DatabaseProvider;

  constructor(config: DatabaseConfig, provider: DatabaseProvider) {
    this.config = config;
    this.provider = provider;
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.connectionLimit,
        min: 2,
        idleTimeoutMillis: this.config.idleTimeout,
        connectionTimeoutMillis: 10000,
        application_name: 'curriculum-alignment-system'
      };

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log(`✅ Database connected successfully (${this.provider.type})`);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  /**
   * Get database pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query with connection from pool
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log('Query executed', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      console.error('Database query error:', {
        text: text.substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get database health status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.pool) {
        return {
          status: 'unhealthy',
          details: { error: 'Database not initialized' }
        };
      }

      const result = await this.query('SELECT version(), NOW() as timestamp');
      const poolStats = {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount
      };

      return {
        status: 'healthy',
        details: {
          version: result.rows[0].version,
          timestamp: result.rows[0].timestamp,
          provider: this.provider.type,
          pool: poolStats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection pool closed');
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit transaction
   */
  async commitTransaction(client: any): Promise<void> {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(client: any): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}

/**
 * Create database configuration from environment variables
 */
export function createDatabaseConfig(): {
  config: DatabaseConfig;
  provider: DatabaseProvider;
} {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Parse database URL
  const url = new URL(databaseUrl);
  
  const config: DatabaseConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    username: url.username,
    password: url.password,
    ssl: true,
    connectionLimit: parseInt(process.env.DB_POOL_MAX || '20'),
    poolTimeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'),
    idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '600000')
  };

  // Determine provider
  let provider: DatabaseProvider;
  if (url.hostname.includes('supabase')) {
    provider = {
      type: 'supabase',
      url: process.env.SUPABASE_URL || '',
      apiKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
  } else if (url.hostname.includes('neon')) {
    provider = {
      type: 'neon',
      url: databaseUrl
    };
  } else {
    provider = {
      type: 'supabase', // Default
      url: databaseUrl
    };
  }

  return { config, provider };
}

/**
 * Singleton database instance
 */
let dbInstance: DatabaseConnection | null = null;

export async function getDatabase(): Promise<DatabaseConnection> {
  if (!dbInstance) {
    const { config, provider } = createDatabaseConfig();
    dbInstance = new DatabaseConnection(config, provider);
    await dbInstance.initialize();
  }
  return dbInstance;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}