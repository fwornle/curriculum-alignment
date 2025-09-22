/**
 * Environment Configuration Management
 * Centralizes environment variable access with type safety and validation
 */

import { config } from 'dotenv';

// Load environment-specific configuration
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'staging'
  ? '.env.staging'
  : '.env.development';

config({ path: envFile });

/**
 * Environment validation schema
 */
interface EnvironmentConfig {
  // Application
  nodeEnv: 'development' | 'staging' | 'production';
  port: number;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Database
  database: {
    url: string;
    supabase?: {
      url: string;
      anonKey: string;
      serviceRoleKey: string;
    };
    pool: {
      min: number;
      max: number;
      acquireTimeout: number;
      idleTimeout: number;
    };
  };

  // AWS
  aws: {
    region: string;
    accountId: string;
    s3: {
      documents: string;
      static: string;
      backup: string;
      temp: string;
      logs: string;
    };
    lambda: {
      timeout: number;
      memory: number;
    };
    cognito: {
      userPoolId: string;
      clientId: string;
      identityPoolId: string;
    };
    cloudfront: {
      domain: string;
      distributionId: string;
    };
  };

  // Vector Database
  qdrant: {
    url: string;
    apiKey: string;
    collectionName: string;
  };

  // LLM Configuration
  llm: {
    provider: 'openai' | 'anthropic' | 'grok' | 'google' | 'azure';
    model: string;
    maxTokens: number;
    temperature: number;
  };

  // API Configuration
  api: {
    baseUrl: string;
    websocketUrl: string;
    frontendUrl: string;
  };

  // Security
  security: {
    encryptionKey: string;
    jwtSecret: string;
    sessionSecret: string;
  };

  // Features
  features: {
    cors: boolean;
    rateLimit: boolean;
    requestLogging: boolean;
    sqlLogging: boolean;
    mockData: boolean;
    swagger: boolean;
    graphqlPlayground: boolean;
    debugEndpoints: boolean;
  };

  // Cost Tracking
  costTracking: {
    enabled: boolean;
    maxMonthlyCostUsd: number;
    alertThreshold: number;
  };

  // Monitoring
  monitoring: {
    cloudwatchLogGroup: string;
    logRetentionDays: number;
    enableMetrics: boolean;
    metricsNamespace: string;
    enableXrayTracing?: boolean;
    xraySamplingRate?: number;
  };

  // WebSocket
  websocket: {
    heartbeatInterval: number;
    connectionTimeout: number;
    maxConnections: number;
  };

  // File Processing
  fileProcessing: {
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    uploadTimeoutMs: number;
  };

  // Cache
  cache: {
    ttlSeconds: number;
    maxSizeMb: number;
    enabled: boolean;
    prefix: string;
  };

  // Agents
  agents: {
    coordinatorTimeout: number;
    maxRetries: number;
    retryDelay: number;
    enableLogging: boolean;
  };

  // Curriculum Analysis
  curriculum: {
    embeddingModel: string;
    embeddingDimension: number;
    similarityThreshold: number;
    maxPages: number;
  };
}

/**
 * Parse environment variable as number with default
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as float with default
 */
function parseFloatValue(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean with default
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse comma-separated string into array
 */
function parseArray(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim());
}

/**
 * Validate required environment variable
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get environment variable with optional default
 */
function getEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

/**
 * Create environment configuration from environment variables
 */
export function createEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development') as EnvironmentConfig['nodeEnv'];

  return {
    // Application
    nodeEnv,
    port: parseNumber(getEnv('PORT'), 3000),
    debug: parseBoolean(getEnv('DEBUG'), nodeEnv === 'development'),
    logLevel: getEnv('LOG_LEVEL', 'info') as EnvironmentConfig['logLevel'],

    // Database
    database: {
      url: requireEnv('DATABASE_URL'),
      supabase: getEnv('SUPABASE_URL') ? {
        url: requireEnv('SUPABASE_URL'),
        anonKey: requireEnv('SUPABASE_ANON_KEY'),
        serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      } : undefined,
      pool: {
        min: parseNumber(getEnv('DB_POOL_MIN'), 2),
        max: parseNumber(getEnv('DB_POOL_MAX'), 20),
        acquireTimeout: parseNumber(getEnv('DB_POOL_ACQUIRE_TIMEOUT'), 30000),
        idleTimeout: parseNumber(getEnv('DB_POOL_IDLE_TIMEOUT'), 600000),
      },
    },

    // AWS
    aws: {
      region: requireEnv('AWS_REGION'),
      accountId: requireEnv('AWS_ACCOUNT_ID'),
      s3: {
        documents: requireEnv('S3_BUCKET_DOCUMENTS'),
        static: requireEnv('S3_BUCKET_STATIC'),
        backup: getEnv('S3_BUCKET_BACKUP', ''),
        temp: getEnv('S3_BUCKET_TEMP', ''),
        logs: getEnv('S3_BUCKET_LOGS', ''),
      },
      lambda: {
        timeout: parseNumber(getEnv('LAMBDA_TIMEOUT'), 300),
        memory: parseNumber(getEnv('LAMBDA_MEMORY'), 1024),
      },
      cognito: {
        userPoolId: requireEnv('COGNITO_USER_POOL_ID'),
        clientId: requireEnv('COGNITO_USER_POOL_CLIENT_ID'),
        identityPoolId: requireEnv('COGNITO_IDENTITY_POOL_ID'),
      },
      cloudfront: {
        domain: getEnv('CLOUDFRONT_DOMAIN', ''),
        distributionId: getEnv('CLOUDFRONT_DISTRIBUTION_ID', ''),
      },
    },

    // Vector Database
    qdrant: {
      url: requireEnv('QDRANT_URL'),
      apiKey: requireEnv('QDRANT_API_KEY'),
      collectionName: getEnv('QDRANT_COLLECTION_NAME', 'curriculum_embeddings'),
    },

    // LLM Configuration
    llm: {
      provider: getEnv('LLM_PROVIDER', 'openai') as EnvironmentConfig['llm']['provider'],
      model: getEnv('LLM_MODEL', 'gpt-4o'),
      maxTokens: parseNumber(getEnv('LLM_MAX_TOKENS'), 4000),
      temperature: parseFloatValue(getEnv('LLM_TEMPERATURE'), 0.3),
    },

    // API Configuration
    api: {
      baseUrl: getEnv('API_BASE_URL', 'http://localhost:3000'),
      websocketUrl: getEnv('WEBSOCKET_URL', 'ws://localhost:3001'),
      frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000'),
    },

    // Security
    security: {
      encryptionKey: requireEnv('ENCRYPTION_KEY'),
      jwtSecret: requireEnv('JWT_SECRET'),
      sessionSecret: requireEnv('SESSION_SECRET'),
    },

    // Features
    features: {
      cors: parseBoolean(getEnv('ENABLE_CORS'), true),
      rateLimit: parseBoolean(getEnv('RATE_LIMIT_ENABLED'), nodeEnv === 'production'),
      requestLogging: parseBoolean(getEnv('ENABLE_REQUEST_LOGGING'), nodeEnv !== 'production'),
      sqlLogging: parseBoolean(getEnv('ENABLE_SQL_LOGGING'), nodeEnv === 'development'),
      mockData: parseBoolean(getEnv('ENABLE_MOCK_DATA'), nodeEnv === 'development'),
      swagger: parseBoolean(getEnv('ENABLE_SWAGGER_UI'), nodeEnv !== 'production'),
      graphqlPlayground: parseBoolean(getEnv('ENABLE_GRAPHQL_PLAYGROUND'), nodeEnv !== 'production'),
      debugEndpoints: parseBoolean(getEnv('ENABLE_DEBUG_ENDPOINTS'), nodeEnv === 'development'),
    },

    // Cost Tracking
    costTracking: {
      enabled: parseBoolean(getEnv('COST_TRACKING_ENABLED'), true),
      maxMonthlyCostUsd: parseNumber(getEnv('MAX_MONTHLY_COST_USD'), 500),
      alertThreshold: parseFloatValue(getEnv('COST_ALERT_THRESHOLD'), 0.8),
    },

    // Monitoring
    monitoring: {
      cloudwatchLogGroup: getEnv('CLOUDWATCH_LOG_GROUP', '/aws/lambda/curriculum-alignment'),
      logRetentionDays: parseNumber(getEnv('CLOUDWATCH_LOG_RETENTION_DAYS'), 14),
      enableMetrics: parseBoolean(getEnv('ENABLE_METRICS'), true),
      metricsNamespace: getEnv('METRICS_NAMESPACE', 'CurriculumAlignment'),
      enableXrayTracing: parseBoolean(getEnv('ENABLE_XRAY_TRACING'), nodeEnv === 'production'),
      xraySamplingRate: parseFloatValue(getEnv('XRAY_SAMPLING_RATE'), 0.1),
    },

    // WebSocket
    websocket: {
      heartbeatInterval: parseNumber(getEnv('WS_HEARTBEAT_INTERVAL'), 30000),
      connectionTimeout: parseNumber(getEnv('WS_CONNECTION_TIMEOUT'), 60000),
      maxConnections: parseNumber(getEnv('WS_MAX_CONNECTIONS'), 100),
    },

    // File Processing
    fileProcessing: {
      maxFileSizeMb: parseNumber(getEnv('MAX_FILE_SIZE_MB'), 50),
      allowedFileTypes: parseArray(getEnv('ALLOWED_FILE_TYPES'), ['pdf', 'docx', 'xlsx']),
      uploadTimeoutMs: parseNumber(getEnv('UPLOAD_TIMEOUT_MS'), 300000),
    },

    // Cache
    cache: {
      ttlSeconds: parseNumber(getEnv('CACHE_TTL_SECONDS'), 3600),
      maxSizeMb: parseNumber(getEnv('CACHE_MAX_SIZE_MB'), 100),
      enabled: parseBoolean(getEnv('ENABLE_CACHE'), true),
      prefix: getEnv('CACHE_PREFIX', 'curriculum_'),
    },

    // Agents
    agents: {
      coordinatorTimeout: parseNumber(getEnv('AGENT_COORDINATOR_TIMEOUT'), 120000),
      maxRetries: parseNumber(getEnv('AGENT_MAX_RETRIES'), 3),
      retryDelay: parseNumber(getEnv('AGENT_RETRY_DELAY'), 5000),
      enableLogging: parseBoolean(getEnv('ENABLE_AGENT_LOGGING'), nodeEnv !== 'production'),
    },

    // Curriculum Analysis
    curriculum: {
      embeddingModel: getEnv('EMBEDDING_MODEL', 'text-embedding-3-small'),
      embeddingDimension: parseNumber(getEnv('EMBEDDING_DIMENSION'), 1536),
      similarityThreshold: parseFloatValue(getEnv('SIMILARITY_THRESHOLD'), 0.75),
      maxPages: parseNumber(getEnv('MAX_CURRICULUM_PAGES'), 100),
    },
  };
}

/**
 * Global environment configuration instance
 */
export const env = createEnvironmentConfig();

/**
 * Validate environment configuration
 */
export function validateEnvironment(): void {
  const requiredVars = [
    'DATABASE_URL',
    'AWS_REGION',
    'AWS_ACCOUNT_ID',
    'S3_BUCKET_DOCUMENTS',
    'S3_BUCKET_STATIC',
    'COGNITO_USER_POOL_ID',
    'COGNITO_USER_POOL_CLIENT_ID',
    'COGNITO_IDENTITY_POOL_ID',
    'QDRANT_URL',
    'QDRANT_API_KEY',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'SESSION_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate encryption key length
  if (env.security.encryptionKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Validate JWT secret length
  if (env.security.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  console.log(`Environment configuration loaded for ${env.nodeEnv} environment`);
}

/**
 * Check if running in development mode
 */
export const isDevelopment = () => env.nodeEnv === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = () => env.nodeEnv === 'production';

/**
 * Check if running in staging mode
 */
export const isStaging = () => env.nodeEnv === 'staging';

/**
 * Get database configuration
 */
export const getDatabaseConfig = () => env.database;

/**
 * Get AWS configuration
 */
export const getAWSConfig = () => env.aws;

/**
 * Get LLM configuration
 */
export const getLLMConfig = () => env.llm;

/**
 * Get monitoring configuration
 */
export const getMonitoringConfig = () => env.monitoring;