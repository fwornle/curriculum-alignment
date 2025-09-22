#!/usr/bin/env ts-node

/**
 * Database Connection Test Script
 * Tests PostgreSQL connection and basic operations
 */

import { config } from 'dotenv';
import { DatabaseConnection, createDatabaseConfig } from '../src/config/database';

// Load environment variables
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

async function testDatabaseConnection(): Promise<void> {
  console.log('🧪 Testing Database Connection');
  console.log('================================');

  let db: DatabaseConnection | null = null;

  try {
    // Create database configuration
    const { config: dbConfig, provider } = createDatabaseConfig();
    
    console.log(`📊 Database Provider: ${provider.type}`);
    console.log(`🏠 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🗄️  Database: ${dbConfig.database}`);
    console.log(`👤 Username: ${dbConfig.username}`);
    console.log(`🔒 SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);
    console.log(`🏊 Pool Max: ${dbConfig.connectionLimit}`);
    console.log('');

    // Initialize connection
    console.log('🔌 Initializing database connection...');
    db = new DatabaseConnection(dbConfig, provider);
    await db.initialize();
    console.log('✅ Database connection initialized');

    // Test basic query
    console.log('📝 Testing basic query...');
    const result = await db.query('SELECT version(), NOW() as current_time');
    console.log('✅ Basic query successful');
    console.log(`   Version: ${result.rows[0].version}`);
    console.log(`   Time: ${result.rows[0].current_time}`);

    // Test health check
    console.log('🏥 Testing health check...');
    const health = await db.healthCheck();
    console.log(`✅ Health check: ${health.status}`);
    console.log(`   Pool stats:`, health.details.pool);

    // Test transaction
    console.log('💳 Testing transaction...');
    const client = await db.beginTransaction();
    try {
      await client.query('SELECT 1');
      await db.commitTransaction(client);
      console.log('✅ Transaction test successful');
    } catch (error) {
      await db.rollbackTransaction(client);
      throw error;
    }

    // Test connection pooling
    console.log('🏊 Testing connection pooling...');
    const promises = Array.from({ length: 5 }, (_, i) => 
      db!.query('SELECT $1 as test_number', [i + 1])
    );
    const results = await Promise.all(promises);
    console.log(`✅ Pool test: ${results.length} concurrent queries successful`);

    console.log('');
    console.log('🎉 All database tests passed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Run database migrations: npm run migrate:up');
    console.log('2. Seed initial data: npm run seed');
    console.log('3. Update AWS Secrets Manager with credentials');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check DATABASE_URL environment variable');
    console.log('2. Verify database server is running');
    console.log('3. Check network connectivity');
    console.log('4. Verify credentials are correct');
    console.log('5. Check SSL configuration');
    
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { testDatabaseConnection };