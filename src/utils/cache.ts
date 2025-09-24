/**
 * Multi-layer caching implementation for the Curriculum Alignment System
 * Provides in-memory, Redis, and DynamoDB caching with intelligent strategies
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createClient, RedisClientType } from 'redis';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

// Cache configuration types
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size (for in-memory)
  namespace?: string; // Cache namespace for key prefixing
  compression?: boolean; // Enable data compression
  serialization?: 'json' | 'msgpack'; // Serialization format
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  lastAccessed: number;
  hitCount: number;
  compressed?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

// Cache layer types
export enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  DYNAMODB = 'dynamodb'
}

// Cache strategies
export enum CacheStrategy {
  LRU = 'lru',
  TTL = 'ttl',
  WRITE_THROUGH = 'write-through',
  WRITE_BEHIND = 'write-behind',
  READ_THROUGH = 'read-through'
}

/**
 * In-memory cache implementation using LRU strategy
 */
export class MemoryCache {
  private cache: LRUCache<string, CacheItem>;
  private stats: CacheStats;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new LRUCache<string, CacheItem>({
      max: config.maxSize || 1000,
      ttl: config.ttl * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      allowStale: false
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
  }

  private generateKey(key: string): string {
    const namespace = this.config.namespace || 'cache';
    return `${namespace}:${key}`;
  }

  private compressData(data: string): string {
    if (!this.config.compression) return data;
    // Simple compression using base64 (in production, use proper compression)
    return Buffer.from(data).toString('base64');
  }

  private decompressData(data: string, compressed: boolean): string {
    if (!compressed || !this.config.compression) return data;
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.generateKey(key);
    const item = this.cache.get(cacheKey);
    
    if (item) {
      item.lastAccessed = Date.now();
      item.hitCount++;
      this.stats.hits++;
      this.updateHitRate();
      
      const value = this.decompressData(JSON.stringify(item.value), item.compressed || false);
      return JSON.parse(value) as T;
    }
    
    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.generateKey(key);
    const now = Date.now();
    const serializedValue = JSON.stringify(value);
    const compressed = this.config.compression || false;
    const finalValue = compressed ? this.compressData(serializedValue) : serializedValue;
    
    const cacheItem: CacheItem<any> = {
      key: cacheKey,
      value: compressed ? finalValue : value,
      ttl: ttl || this.config.ttl,
      createdAt: now,
      lastAccessed: now,
      hitCount: 0,
      compressed
    };
    
    this.cache.set(cacheKey, cacheItem, {
      ttl: (ttl || this.config.ttl) * 1000
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  async delete(key: string): Promise<boolean> {
    const cacheKey = this.generateKey(key);
    const deleted = this.cache.delete(cacheKey);
    
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
  }

  async has(key: string): Promise<boolean> {
    const cacheKey = this.generateKey(key);
    return this.cache.has(cacheKey);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

/**
 * Redis cache implementation for distributed caching
 */
export class RedisCache {
  private client: RedisClientType;
  private config: CacheConfig;
  private stats: CacheStats;
  private connected: boolean = false;

  constructor(config: CacheConfig, redisUrl?: string) {
    this.config = config;
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.connected = true;
    });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
      this.connected = false;
    });

    this.client.on('end', () => {
      console.log('Redis client disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  private generateKey(key: string): string {
    const namespace = this.config.namespace || 'cache';
    return `${namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.connect();
      const cacheKey = this.generateKey(key);
      const data = await this.client.get(cacheKey);
      
      if (data) {
        this.stats.hits++;
        this.updateHitRate();
        return JSON.parse(data) as T;
      }
      
      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.connect();
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.config.ttl;
      
      await this.client.setEx(cacheKey, expiration, serializedValue);
      this.stats.sets++;
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.connect();
      const cacheKey = this.generateKey(key);
      const result = await this.client.del(cacheKey);
      
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.connect();
      const pattern = this.generateKey('*');
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0
      };
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.connect();
      const cacheKey = this.generateKey(key);
      const exists = await this.client.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('Redis has error:', error);
      return false;
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

/**
 * DynamoDB cache implementation for persistent distributed caching
 */
export class DynamoDBCache {
  private client: DynamoDBDocumentClient;
  private config: CacheConfig;
  private stats: CacheStats;
  private tableName: string;

  constructor(config: CacheConfig, tableName: string = 'CurriculumAlignment-Cache') {
    this.config = config;
    this.tableName = tableName;
    
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
  }

  private generateKey(key: string): string {
    const namespace = this.config.namespace || 'cache';
    return `${namespace}:${key}`;
  }

  private isExpired(item: any): boolean {
    const now = Math.floor(Date.now() / 1000);
    return item.ttl && item.ttl < now;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key);
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { pk: cacheKey }
      });
      
      const result = await this.client.send(command);
      
      if (result.Item && !this.isExpired(result.Item)) {
        // Update last accessed time
        const updateCommand = new UpdateCommand({
          TableName: this.tableName,
          Key: { pk: cacheKey },
          UpdateExpression: 'SET lastAccessed = :now, hitCount = hitCount + :inc',
          ExpressionAttributeValues: {
            ':now': Math.floor(Date.now() / 1000),
            ':inc': 1
          }
        });
        
        await this.client.send(updateCommand);
        
        this.stats.hits++;
        this.updateHitRate();
        return result.Item.value as T;
      }
      
      // Clean up expired item
      if (result.Item && this.isExpired(result.Item)) {
        await this.delete(key);
      }
      
      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      console.error('DynamoDB get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.generateKey(key);
      const now = Math.floor(Date.now() / 1000);
      const expiration = ttl || this.config.ttl;
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: cacheKey,
          value: value,
          ttl: now + expiration,
          createdAt: now,
          lastAccessed: now,
          hitCount: 0
        }
      });
      
      await this.client.send(command);
      this.stats.sets++;
    } catch (error) {
      console.error('DynamoDB set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key);
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: cacheKey },
        ReturnValues: 'ALL_OLD'
      });
      
      const result = await this.client.send(command);
      
      if (result.Attributes) {
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      console.error('DynamoDB delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    // Note: DynamoDB doesn't have a native "clear all" operation
    // This would require scanning and batch deleting items
    console.warn('DynamoDB clear operation not implemented - use TTL expiration instead');
  }

  async has(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

/**
 * Multi-layer cache manager that coordinates between memory, Redis, and DynamoDB
 */
export class CacheManager {
  private memoryCache: MemoryCache;
  private redisCache?: RedisCache;
  private dynamoCache?: DynamoDBCache;
  private strategy: CacheStrategy;
  private layers: CacheLayer[];

  constructor(
    config: CacheConfig,
    strategy: CacheStrategy = CacheStrategy.LRU,
    layers: CacheLayer[] = [CacheLayer.MEMORY]
  ) {
    this.strategy = strategy;
    this.layers = layers;

    // Initialize memory cache (always available)
    this.memoryCache = new MemoryCache(config);

    // Initialize Redis cache if requested
    if (layers.includes(CacheLayer.REDIS)) {
      this.redisCache = new RedisCache(config);
    }

    // Initialize DynamoDB cache if requested
    if (layers.includes(CacheLayer.DYNAMODB)) {
      this.dynamoCache = new DynamoDBCache(config);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first (fastest)
    if (this.layers.includes(CacheLayer.MEMORY)) {
      const memoryResult = await this.memoryCache.get<T>(key);
      if (memoryResult !== null) {
        return memoryResult;
      }
    }

    // Try Redis cache second (fast, distributed)
    if (this.layers.includes(CacheLayer.REDIS) && this.redisCache) {
      const redisResult = await this.redisCache.get<T>(key);
      if (redisResult !== null) {
        // Backfill memory cache
        if (this.layers.includes(CacheLayer.MEMORY)) {
          await this.memoryCache.set(key, redisResult);
        }
        return redisResult;
      }
    }

    // Try DynamoDB cache last (persistent, but slower)
    if (this.layers.includes(CacheLayer.DYNAMODB) && this.dynamoCache) {
      const dynamoResult = await this.dynamoCache.get<T>(key);
      if (dynamoResult !== null) {
        // Backfill upper layers
        if (this.layers.includes(CacheLayer.MEMORY)) {
          await this.memoryCache.set(key, dynamoResult);
        }
        if (this.layers.includes(CacheLayer.REDIS) && this.redisCache) {
          await this.redisCache.set(key, dynamoResult);
        }
        return dynamoResult;
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const promises: Promise<void>[] = [];

    // Set in all configured layers
    if (this.layers.includes(CacheLayer.MEMORY)) {
      promises.push(this.memoryCache.set(key, value, ttl));
    }

    if (this.layers.includes(CacheLayer.REDIS) && this.redisCache) {
      promises.push(this.redisCache.set(key, value, ttl));
    }

    if (this.layers.includes(CacheLayer.DYNAMODB) && this.dynamoCache) {
      promises.push(this.dynamoCache.set(key, value, ttl));
    }

    await Promise.all(promises);
  }

  async delete(key: string): Promise<boolean> {
    const promises: Promise<boolean>[] = [];

    if (this.layers.includes(CacheLayer.MEMORY)) {
      promises.push(this.memoryCache.delete(key));
    }

    if (this.layers.includes(CacheLayer.REDIS) && this.redisCache) {
      promises.push(this.redisCache.delete(key));
    }

    if (this.layers.includes(CacheLayer.DYNAMODB) && this.dynamoCache) {
      promises.push(this.dynamoCache.delete(key));
    }

    const results = await Promise.all(promises);
    return results.some(result => result === true);
  }

  async clear(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.layers.includes(CacheLayer.MEMORY)) {
      promises.push(this.memoryCache.clear());
    }

    if (this.layers.includes(CacheLayer.REDIS) && this.redisCache) {
      promises.push(this.redisCache.clear());
    }

    if (this.layers.includes(CacheLayer.DYNAMODB) && this.dynamoCache) {
      promises.push(this.dynamoCache.clear());
    }

    await Promise.all(promises);
  }

  getAllStats(): { [layer: string]: CacheStats } {
    const stats: { [layer: string]: CacheStats } = {};

    if (this.layers.includes(CacheLayer.MEMORY)) {
      stats.memory = this.memoryCache.getStats();
    }

    if (this.layers.includes(CacheLayer.REDIS) && this.redisCache) {
      stats.redis = this.redisCache.getStats();
    }

    if (this.layers.includes(CacheLayer.DYNAMODB) && this.dynamoCache) {
      stats.dynamodb = this.dynamoCache.getStats();
    }

    return stats;
  }

  async disconnect(): Promise<void> {
    if (this.redisCache) {
      await this.redisCache.disconnect();
    }
  }
}

/**
 * Cache decorator for method results
 */
export function cached(
  config: CacheConfig,
  keyGenerator?: (...args: any[]) => string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = new MemoryCache(config);

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(...args) : `${propertyName}:${JSON.stringify(args)}`;
      
      const cachedResult = await cache.get(key);
      if (cachedResult !== null) {
        return cachedResult;
      }

      const result = await method.apply(this, args);
      await cache.set(key, result);
      
      return result;
    };
  };
}

/**
 * Utility function to create cache key from parameters
 */
export function createCacheKey(...parts: any[]): string {
  return crypto
    .createHash('sha256')
    .update(parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(':'))
    .digest('hex')
    .substring(0, 32);
}

// Export default cache manager instance
export const defaultCacheManager = new CacheManager(
  {
    ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour default
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
    namespace: 'curriculum-alignment',
    compression: process.env.CACHE_COMPRESSION === 'true'
  },
  CacheStrategy.LRU,
  [CacheLayer.MEMORY, CacheLayer.REDIS]
);