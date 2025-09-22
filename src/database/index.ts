/**
 * Database Access Layer with Connection Pooling
 * 
 * This module provides a centralized database access layer using PostgreSQL
 * with connection pooling for optimal performance and resource management.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { env, getDatabaseConfig } from '../config/environment';

// Database connection pool
let pool: Pool | null = null;

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Query parameters type
 */
export type QueryParams = any[];

/**
 * Database query interface
 */
export interface DatabaseQuery {
  text: string;
  values?: QueryParams;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(databaseConfig?: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  const dbConfig: DatabaseConfig = databaseConfig || {
    connectionString: getDatabaseConfig().url,
    max: getDatabaseConfig().pool.max,
    idleTimeoutMillis: getDatabaseConfig().pool.idleTimeout,
    connectionTimeoutMillis: getDatabaseConfig().pool.acquireTimeout,
  };

  pool = new Pool(dbConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
    process.exit(-1);
  });

  // Handle pool connection events
  pool.on('connect', () => {
    console.log('New PostgreSQL client connected');
  });

  pool.on('remove', () => {
    console.log('PostgreSQL client removed from pool');
  });

  console.log('Database connection pool initialized');
  return pool;
}

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Execute a single query
 */
export async function query<T = any>(
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const client = await getPool().connect();
  try {
    const start = Date.now();
    const result = await client.query<T>(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    console.log('Transaction started');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    console.log('Transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('Transaction rolled back');
    
    console.error('Transaction error:', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query with named parameters (for better readability)
 */
export async function namedQuery<T = any>(
  queryTemplate: string,
  namedParams: Record<string, any>
): Promise<QueryResult<T>> {
  // Convert named parameters to positional parameters
  let paramIndex = 1;
  const values: any[] = [];
  const paramMap: Record<string, number> = {};
  
  // Replace named parameters with positional ones
  const query = queryTemplate.replace(/:(\w+)/g, (match, paramName) => {
    if (!(paramName in namedParams)) {
      throw new Error(`Missing parameter: ${paramName}`);
    }
    
    if (!(paramName in paramMap)) {
      paramMap[paramName] = paramIndex++;
      values.push(namedParams[paramName]);
    }
    
    return `$${paramMap[paramName]}`;
  });
  
  return await query<T>(query, values);
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('Database connection test successful:', {
      currentTime: result.rows[0].current_time,
      version: result.rows[0].version.substring(0, 50) + '...',
    });
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Get database pool statistics
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  const poolInstance = getPool();
  return {
    totalCount: poolInstance.totalCount,
    idleCount: poolInstance.idleCount,
    waitingCount: poolInstance.waitingCount,
  };
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

/**
 * Execute a query with retry logic for transient failures
 */
export async function queryWithRetry<T = any>(
  text: string,
  params?: QueryParams,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<QueryResult<T>> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query<T>(text, params);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable (connection issues, timeouts, etc.)
      const isRetryable = 
        lastError.message.includes('connection') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ENOTFOUND');
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      console.warn(`Query attempt ${attempt} failed, retrying in ${retryDelay}ms...`, {
        error: lastError.message,
      });
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  throw lastError!;
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connected: boolean;
    poolStats?: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    };
    latency?: number;
    error?: string;
  };
}> {
  try {
    const start = Date.now();
    const connectionTest = await testConnection();
    const latency = Date.now() - start;
    
    if (connectionTest) {
      return {
        status: 'healthy',
        details: {
          connected: true,
          poolStats: getPoolStats(),
          latency,
        },
      };
    } else {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: 'Connection test failed',
        },
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// Export database instance for backward compatibility
export const database = {
  initialize: initializeDatabase,
  query,
  namedQuery,
  transaction,
  testConnection,
  healthCheck,
  getPoolStats,
  close: closeDatabase,
  queryWithRetry,
};

export default database;