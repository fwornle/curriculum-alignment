/**
 * Secrets Management Service
 * 
 * Service for managing API keys, credentials, and sensitive configuration
 * using AWS Secrets Manager for secure storage and retrieval.
 */

import { 
  SecretsManagerClient, 
  GetSecretValueCommand, 
  UpdateSecretCommand, 
  CreateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  RestoreSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { env } from '../config/environment';

/**
 * Secret value types
 */
export interface SecretValue {
  value: string;
  version?: string;
  createdDate?: Date;
  lastUpdated?: Date;
}

/**
 * Structured secret for LLM API keys
 */
export interface LLMApiKeys {
  openai?: string;
  anthropic?: string;
  azure_openai?: {
    api_key: string;
    endpoint: string;
    deployment_name?: string;
  };
  google?: string;
  cohere?: string;
  huggingface?: string;
}

/**
 * Database credentials structure
 */
export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

/**
 * External service credentials
 */
export interface ExternalServiceCredentials {
  api_key: string;
  endpoint?: string;
  additional_headers?: Record<string, string>;
}

/**
 * Secret metadata
 */
export interface SecretMetadata {
  name: string;
  description?: string;
  kmsKeyId?: string;
  tags?: Record<string, string>;
  lastChangedDate?: Date;
  lastAccessedDate?: Date;
  versionStage?: string;
}

/**
 * Secret creation options
 */
export interface CreateSecretOptions {
  name: string;
  value: string | object;
  description?: string;
  kmsKeyId?: string;
  tags?: Record<string, string>;
  forceOverwriteReplicaSecret?: boolean;
}

/**
 * Secret update options
 */
export interface UpdateSecretOptions {
  secretId: string;
  secretValue?: string | object;
  description?: string;
  kmsKeyId?: string;
}

/**
 * Secrets Manager Service
 */
export class SecretsService {
  private client: SecretsManagerClient;
  private secretPrefix: string;
  private cache: Map<string, { value: any; expiry: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = new SecretsManagerClient({
      region: env.AWS_REGION,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined, // Use IAM role in production
    });
    
    this.secretPrefix = `curriculum-alignment/${env.NODE_ENV}`;
    this.cache = new Map();
  }

  /**
   * Get secret value by name
   */
  async getSecret<T = string>(secretName: string, useCache: boolean = true): Promise<T> {
    const fullSecretName = this.getFullSecretName(secretName);
    
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(fullSecretName);
      if (cached && cached.expiry > Date.now()) {
        return cached.value;
      }
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: fullSecretName,
        VersionStage: 'AWSCURRENT',
      });

      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no string value`);
      }

      let value: T;
      try {
        // Try to parse as JSON first
        value = JSON.parse(response.SecretString) as T;
      } catch {
        // If not JSON, return as string
        value = response.SecretString as T;
      }

      // Cache the result
      if (useCache) {
        this.cache.set(fullSecretName, {
          value,
          expiry: Date.now() + this.CACHE_TTL,
        });
      }

      return value;

    } catch (error) {
      console.error(`Error retrieving secret ${secretName}:`, error);
      throw new Error(`Failed to retrieve secret: ${secretName}`);
    }
  }

  /**
   * Get LLM API keys
   */
  async getLLMApiKeys(): Promise<LLMApiKeys> {
    return this.getSecret<LLMApiKeys>('llm-api-keys');
  }

  /**
   * Get database credentials
   */
  async getDatabaseCredentials(): Promise<DatabaseCredentials> {
    return this.getSecret<DatabaseCredentials>('database-credentials');
  }

  /**
   * Get external service credentials
   */
  async getExternalServiceCredentials(serviceName: string): Promise<ExternalServiceCredentials> {
    return this.getSecret<ExternalServiceCredentials>(`external-services/${serviceName}`);
  }

  /**
   * Get specific API key
   */
  async getApiKey(provider: keyof LLMApiKeys): Promise<string> {
    const apiKeys = await this.getLLMApiKeys();
    const key = apiKeys[provider];
    
    if (!key) {
      throw new Error(`API key for ${provider} not found`);
    }

    if (typeof key === 'string') {
      return key;
    }

    // Handle Azure OpenAI case
    if (provider === 'azure_openai' && typeof key === 'object' && 'api_key' in key) {
      return key.api_key;
    }

    throw new Error(`Invalid API key format for ${provider}`);
  }

  /**
   * Create new secret
   */
  async createSecret(options: CreateSecretOptions): Promise<void> {
    const fullSecretName = this.getFullSecretName(options.name);
    
    try {
      const secretValue = typeof options.value === 'object' 
        ? JSON.stringify(options.value)
        : options.value;

      const command = new CreateSecretCommand({
        Name: fullSecretName,
        SecretString: secretValue,
        Description: options.description,
        KmsKeyId: options.kmsKeyId,
        Tags: options.tags ? Object.entries(options.tags).map(([Key, Value]) => ({ Key, Value })) : undefined,
        ForceOverwriteReplicaSecret: options.forceOverwriteReplicaSecret,
      });

      await this.client.send(command);
      
      // Clear cache for this secret
      this.cache.delete(fullSecretName);
      
      console.log(`Secret ${options.name} created successfully`);

    } catch (error) {
      console.error(`Error creating secret ${options.name}:`, error);
      throw new Error(`Failed to create secret: ${options.name}`);
    }
  }

  /**
   * Update existing secret
   */
  async updateSecret(options: UpdateSecretOptions): Promise<void> {
    const fullSecretName = this.getFullSecretName(options.secretId);
    
    try {
      if (options.secretValue !== undefined) {
        const secretValue = typeof options.secretValue === 'object' 
          ? JSON.stringify(options.secretValue)
          : options.secretValue;

        const putCommand = new PutSecretValueCommand({
          SecretId: fullSecretName,
          SecretString: secretValue,
        });

        await this.client.send(putCommand);
      }

      if (options.description || options.kmsKeyId) {
        const updateCommand = new UpdateSecretCommand({
          SecretId: fullSecretName,
          Description: options.description,
          KmsKeyId: options.kmsKeyId,
        });

        await this.client.send(updateCommand);
      }

      // Clear cache for this secret
      this.cache.delete(fullSecretName);
      
      console.log(`Secret ${options.secretId} updated successfully`);

    } catch (error) {
      console.error(`Error updating secret ${options.secretId}:`, error);
      throw new Error(`Failed to update secret: ${options.secretId}`);
    }
  }

  /**
   * Delete secret
   */
  async deleteSecret(secretName: string, forceDelete: boolean = false): Promise<void> {
    const fullSecretName = this.getFullSecretName(secretName);
    
    try {
      const command = new DeleteSecretCommand({
        SecretId: fullSecretName,
        ForceDeleteWithoutRecovery: forceDelete,
        RecoveryWindowInDays: forceDelete ? undefined : 7,
      });

      await this.client.send(command);
      
      // Clear cache
      this.cache.delete(fullSecretName);
      
      console.log(`Secret ${secretName} ${forceDelete ? 'permanently deleted' : 'scheduled for deletion'}`);

    } catch (error) {
      console.error(`Error deleting secret ${secretName}:`, error);
      throw new Error(`Failed to delete secret: ${secretName}`);
    }
  }

  /**
   * List all secrets
   */
  async listSecrets(): Promise<SecretMetadata[]> {
    try {
      const command = new ListSecretsCommand({
        Filters: [
          {
            Key: 'name',
            Values: [this.secretPrefix],
          },
        ],
        MaxResults: 100,
      });

      const response = await this.client.send(command);
      
      return (response.SecretList || []).map(secret => ({
        name: this.removeSecretPrefix(secret.Name || ''),
        description: secret.Description,
        kmsKeyId: secret.KmsKeyId,
        lastChangedDate: secret.LastChangedDate,
        lastAccessedDate: secret.LastAccessedDate,
        tags: secret.Tags ? Object.fromEntries(
          secret.Tags.map(tag => [tag.Key || '', tag.Value || ''])
        ) : undefined,
      }));

    } catch (error) {
      console.error('Error listing secrets:', error);
      throw new Error('Failed to list secrets');
    }
  }

  /**
   * Get secret metadata
   */
  async getSecretMetadata(secretName: string): Promise<SecretMetadata> {
    const fullSecretName = this.getFullSecretName(secretName);
    
    try {
      const command = new DescribeSecretCommand({
        SecretId: fullSecretName,
      });

      const response = await this.client.send(command);
      
      return {
        name: secretName,
        description: response.Description,
        kmsKeyId: response.KmsKeyId,
        lastChangedDate: response.LastChangedDate,
        lastAccessedDate: response.LastAccessedDate,
        versionStage: response.VersionIdsToStages?.AWSCURRENT?.[0],
        tags: response.Tags ? Object.fromEntries(
          response.Tags.map(tag => [tag.Key || '', tag.Value || ''])
        ) : undefined,
      };

    } catch (error) {
      console.error(`Error getting secret metadata ${secretName}:`, error);
      throw new Error(`Failed to get secret metadata: ${secretName}`);
    }
  }

  /**
   * Restore deleted secret
   */
  async restoreSecret(secretName: string): Promise<void> {
    const fullSecretName = this.getFullSecretName(secretName);
    
    try {
      const command = new RestoreSecretCommand({
        SecretId: fullSecretName,
      });

      await this.client.send(command);
      
      console.log(`Secret ${secretName} restored successfully`);

    } catch (error) {
      console.error(`Error restoring secret ${secretName}:`, error);
      throw new Error(`Failed to restore secret: ${secretName}`);
    }
  }

  /**
   * Clear secrets cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate secret exists
   */
  async secretExists(secretName: string): Promise<boolean> {
    try {
      await this.getSecretMetadata(secretName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rotate secret value
   */
  async rotateSecret(secretName: string, newValue: string | object): Promise<void> {
    await this.updateSecret({
      secretId: secretName,
      secretValue: newValue,
    });
  }

  /**
   * Batch get multiple secrets
   */
  async getSecrets(secretNames: string[]): Promise<Record<string, any>> {
    const results = await Promise.allSettled(
      secretNames.map(async name => ({
        name,
        value: await this.getSecret(name),
      }))
    );

    const secrets: Record<string, any> = {};
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        secrets[result.value.name] = result.value.value;
      } else {
        console.warn(`Failed to retrieve secret ${secretNames[index]}:`, result.reason);
      }
    });

    return secrets;
  }

  /**
   * Initialize default secrets for the application
   */
  async initializeDefaults(): Promise<void> {
    const defaultSecrets = [
      {
        name: 'llm-api-keys',
        value: {
          openai: '',
          anthropic: '',
          azure_openai: {
            api_key: '',
            endpoint: '',
            deployment_name: '',
          },
          google: '',
          cohere: '',
          huggingface: '',
        },
        description: 'LLM service API keys',
      },
      {
        name: 'external-services/qdrant',
        value: {
          api_key: '',
          endpoint: env.QDRANT_URL || 'http://localhost:6333',
        },
        description: 'Qdrant vector database credentials',
      },
      {
        name: 'jwt-secrets',
        value: {
          access_token_secret: this.generateSecretKey(),
          refresh_token_secret: this.generateSecretKey(),
        },
        description: 'JWT signing secrets',
      },
    ];

    for (const secret of defaultSecrets) {
      try {
        const exists = await this.secretExists(secret.name);
        if (!exists) {
          await this.createSecret(secret);
          console.log(`Initialized default secret: ${secret.name}`);
        }
      } catch (error) {
        console.warn(`Failed to initialize secret ${secret.name}:`, error);
      }
    }
  }

  /**
   * Health check for secrets service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      // Try to list secrets to verify connectivity
      await this.listSecrets();
      return {
        status: 'healthy',
        details: 'Secrets Manager connection successful',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Secrets Manager connection failed: ${error}`,
      };
    }
  }

  /**
   * Get full secret name with prefix
   */
  private getFullSecretName(secretName: string): string {
    return `${this.secretPrefix}/${secretName}`;
  }

  /**
   * Remove prefix from secret name
   */
  private removeSecretPrefix(fullSecretName: string): string {
    return fullSecretName.replace(`${this.secretPrefix}/`, '');
  }

  /**
   * Generate a secure random secret key
   */
  private generateSecretKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Global secrets service instance
 */
export const secretsService = new SecretsService();

/**
 * Convenience functions for common operations
 */
export const secrets = {
  get: <T = string>(name: string) => secretsService.getSecret<T>(name),
  getLLMKeys: () => secretsService.getLLMApiKeys(),
  getApiKey: (provider: keyof LLMApiKeys) => secretsService.getApiKey(provider),
  getDbCredentials: () => secretsService.getDatabaseCredentials(),
  create: (options: CreateSecretOptions) => secretsService.createSecret(options),
  update: (options: UpdateSecretOptions) => secretsService.updateSecret(options),
  delete: (name: string, force?: boolean) => secretsService.deleteSecret(name, force),
  list: () => secretsService.listSecrets(),
  exists: (name: string) => secretsService.secretExists(name),
  rotate: (name: string, value: string | object) => secretsService.rotateSecret(name, value),
  clearCache: () => secretsService.clearCache(),
  healthCheck: () => secretsService.healthCheck(),
  initialize: () => secretsService.initializeDefaults(),
};

export default secretsService;