#!/usr/bin/env ts-node

/**
 * Qdrant Vector Database Initialization Script
 * Sets up collections and tests vector similarity searches
 */

import { config } from 'dotenv';
import https from 'https';
import { URL } from 'url';

// Load environment variables
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

interface QdrantCollection {
  name: string;
  vector_size: number;
  distance: 'Cosine' | 'Euclidean' | 'Dot';
  index: 'HNSW' | 'Plain';
  description: string;
}

interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  ssl: boolean;
}

const COLLECTIONS: QdrantCollection[] = [
  {
    name: 'curriculum_embeddings',
    vector_size: 1536, // OpenAI Ada-002 embedding size
    distance: 'Cosine',
    index: 'HNSW',
    description: 'Full curriculum document embeddings'
  },
  {
    name: 'course_descriptions',
    vector_size: 1536,
    distance: 'Cosine',
    index: 'HNSW',
    description: 'Individual course description embeddings'
  },
  {
    name: 'learning_outcomes',
    vector_size: 1536,
    distance: 'Cosine',
    index: 'HNSW',
    description: 'Learning outcome embeddings'
  }
];

class QdrantClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: QdrantConfig) {
    const protocol = config.ssl ? 'https' : 'http';
    this.baseUrl = `${protocol}://${config.host}:${config.port}`;
    this.apiKey = config.apiKey;
  }

  private async makeRequest(path: string, method: string = 'GET', body?: any): Promise<any> {
    const url = new URL(path, this.baseUrl);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'api-key': this.apiKey })
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode! >= 200 && res.statusCode! < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.status?.error || data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => reject(new Error('Request timeout')));

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  async getCollections(): Promise<any> {
    return this.makeRequest('/collections');
  }

  async createCollection(collection: QdrantCollection): Promise<any> {
    const payload = {
      vectors: {
        size: collection.vector_size,
        distance: collection.distance
      },
      hnsw_config: {
        m: 16,
        ef_construct: 100,
        full_scan_threshold: 10000
      },
      optimizers_config: {
        deleted_threshold: 0.2,
        vacuum_min_vector_number: 1000,
        default_segment_number: 0,
        max_segment_size: null,
        memmap_threshold: null,
        indexing_threshold: 20000,
        flush_interval_sec: 5,
        max_optimization_threads: 1
      }
    };

    return this.makeRequest(`/collections/${collection.name}`, 'PUT', payload);
  }

  async deleteCollection(name: string): Promise<any> {
    return this.makeRequest(`/collections/${name}`, 'DELETE');
  }

  async getCollectionInfo(name: string): Promise<any> {
    return this.makeRequest(`/collections/${name}`);
  }

  async insertPoints(collectionName: string, points: any[]): Promise<any> {
    return this.makeRequest(`/collections/${collectionName}/points`, 'PUT', { points });
  }

  async searchSimilar(collectionName: string, vector: number[], limit: number = 5): Promise<any> {
    const payload = {
      vector,
      limit,
      with_payload: true,
      with_vector: false
    };
    return this.makeRequest(`/collections/${collectionName}/points/search`, 'POST', payload);
  }

  async clusterInfo(): Promise<any> {
    return this.makeRequest('/cluster');
  }
}

function createQdrantConfig(): QdrantConfig {
  const qdrantUrl = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (qdrantUrl) {
    const url = new URL(qdrantUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || (url.protocol === 'https:' ? 6334 : 6333),
      ssl: url.protocol === 'https:',
      apiKey
    };
  }

  // Default configuration for local development
  return {
    host: process.env.QDRANT_HOST || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6333'),
    ssl: process.env.QDRANT_SSL === 'true',
    apiKey
  };
}

async function initializeQdrant(): Promise<void> {
  console.log('🚀 Initializing Qdrant Vector Database');
  console.log('=====================================');

  try {
    // Create Qdrant configuration
    const config = createQdrantConfig();
    const client = new QdrantClient(config);
    
    console.log(`🔗 Connecting to: ${config.host}:${config.port}`);
    console.log(`🔒 SSL: ${config.ssl ? 'Enabled' : 'Disabled'}`);
    console.log(`🔑 API Key: ${config.apiKey ? 'Configured' : 'None'}`);
    console.log('');

    // Test connection
    console.log('🏥 Testing Qdrant connection...');
    const clusterInfo = await client.clusterInfo();
    console.log('✅ Connection successful');
    console.log(`   Cluster status: ${clusterInfo.status || 'enabled'}`);
    console.log('');

    // Get existing collections
    console.log('📋 Checking existing collections...');
    const { result: existingCollections } = await client.getCollections();
    console.log(`   Found ${existingCollections?.collections?.length || 0} existing collections`);

    // Create required collections
    console.log('🏗️  Setting up collections...');
    for (const collection of COLLECTIONS) {
      const exists = existingCollections?.collections?.some((c: any) => c.name === collection.name);
      
      if (exists) {
        console.log(`   ⚠️  Collection '${collection.name}' already exists`);
        
        // Get collection info to verify configuration
        const info = await client.getCollectionInfo(collection.name);
        const vectorConfig = info.result?.config?.params?.vectors;
        
        if (vectorConfig?.size !== collection.vector_size || 
            vectorConfig?.distance !== collection.distance) {
          console.log(`   🔄 Recreating '${collection.name}' with updated config...`);
          await client.deleteCollection(collection.name);
          await client.createCollection(collection);
          console.log(`   ✅ Collection '${collection.name}' recreated`);
        } else {
          console.log(`   ✅ Collection '${collection.name}' configuration is correct`);
        }
      } else {
        console.log(`   🆕 Creating collection '${collection.name}'...`);
        await client.createCollection(collection);
        console.log(`   ✅ Collection '${collection.name}' created`);
      }
    }

    // Test with sample data
    console.log('');
    console.log('🧪 Testing with sample embeddings...');
    
    const samplePoints = [
      {
        id: 1,
        vector: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        payload: {
          course_code: 'CS101',
          title: 'Introduction to Computer Science',
          description: 'Fundamental concepts of programming and computational thinking',
          university: 'Test University',
          credits: 3
        }
      },
      {
        id: 2,
        vector: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        payload: {
          course_code: 'CS102',
          title: 'Data Structures and Algorithms',
          description: 'Advanced programming concepts including data structures and algorithms',
          university: 'Test University',
          credits: 4
        }
      }
    ];

    // Insert test points
    await client.insertPoints('course_descriptions', samplePoints);
    console.log('✅ Sample data inserted');

    // Test similarity search
    const searchVector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    const searchResults = await client.searchSimilar('course_descriptions', searchVector, 2);
    console.log(`✅ Similarity search successful: found ${searchResults.result?.length || 0} similar courses`);

    // Display final status
    console.log('');
    console.log('🎉 Qdrant initialization completed successfully!');
    console.log('');
    console.log('📊 Collection Summary:');
    for (const collection of COLLECTIONS) {
      const info = await client.getCollectionInfo(collection.name);
      const pointsCount = info.result?.points_count || 0;
      console.log(`   ${collection.name}: ${pointsCount} vectors (${collection.description})`);
    }

    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update environment variables with Qdrant credentials');
    console.log('2. Implement embedding generation in application code');
    console.log('3. Configure semantic search in agent workflows');
    console.log('4. Monitor vector database performance in production');

  } catch (error) {
    console.error('❌ Qdrant initialization failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check QDRANT_URL environment variable');
    console.log('2. Verify Qdrant service is running');
    console.log('3. Check network connectivity');
    console.log('4. Verify API key if using Qdrant Cloud');
    console.log('5. Check collection configuration parameters');
    
    process.exit(1);
  }
}

// Health check function for monitoring
export async function qdrantHealthCheck(): Promise<{ status: string; details: any }> {
  try {
    const config = createQdrantConfig();
    const client = new QdrantClient(config);
    
    const clusterInfo = await client.clusterInfo();
    const collections = await client.getCollections();
    
    return {
      status: 'healthy',
      details: {
        cluster: clusterInfo,
        collections: collections.result?.collections?.length || 0,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeQdrant().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { initializeQdrant, QdrantClient, createQdrantConfig };