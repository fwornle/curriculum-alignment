#!/usr/bin/env ts-node

/**
 * S3 Utilities for Curriculum Alignment System
 * Provides TypeScript utilities for S3 operations and management
 */

import { S3, CloudFormation } from 'aws-sdk';
import { config } from 'dotenv';

// Load environment variables
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const region = process.env.AWS_REGION || 'eu-central-1';
const environment = process.env.NODE_ENV || 'dev';

const s3 = new S3({ region });
const cloudFormation = new CloudFormation({ region });

interface BucketInfo {
  name: string;
  arn: string;
  purpose: string;
  websiteUrl?: string;
}

interface S3Configuration {
  documents: BucketInfo;
  static: BucketInfo;
  backup: BucketInfo;
  temp: BucketInfo;
  logs: BucketInfo;
}

class S3Utils {
  private stackName: string;

  constructor() {
    this.stackName = `curriculum-alignment-s3-${environment}`;
  }

  async getBucketConfiguration(): Promise<S3Configuration> {
    try {
      const { Stacks } = await cloudFormation.describeStacks({
        StackName: this.stackName
      }).promise();

      if (!Stacks || Stacks.length === 0) {
        throw new Error(`Stack ${this.stackName} not found`);
      }

      const outputs = Stacks[0].Outputs || [];
      const getOutput = (key: string) => 
        outputs.find(output => output.OutputKey === key)?.OutputValue || '';

      return {
        documents: {
          name: getOutput('DocumentsBucketName'),
          arn: getOutput('DocumentsBucketArn'),
          purpose: 'Document storage for curriculum files'
        },
        static: {
          name: getOutput('StaticWebsiteBucketName'),
          arn: getOutput('StaticWebsiteBucketArn'),
          purpose: 'Static website hosting',
          websiteUrl: getOutput('StaticWebsiteURL')
        },
        backup: {
          name: getOutput('BackupBucketName'),
          arn: getOutput('BackupBucketArn'),
          purpose: 'Backup storage'
        },
        temp: {
          name: getOutput('TempProcessingBucketName'),
          arn: getOutput('TempProcessingBucketArn'),
          purpose: 'Temporary processing files'
        },
        logs: {
          name: getOutput('AccessLogsBucketName'),
          arn: getOutput('AccessLogsBucketArn'),
          purpose: 'Access logs storage'
        }
      };
    } catch (error) {
      throw new Error(`Failed to get bucket configuration: ${error.message}`);
    }
  }

  async uploadDocument(filePath: string, key: string, metadata: Record<string, string> = {}): Promise<string> {
    const config = await this.getBucketConfiguration();
    const bucketName = config.documents.name;

    try {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath);
      
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          environment
        },
        ServerSideEncryption: 'AES256'
      };

      const result = await s3.upload(uploadParams).promise();
      return result.Location;
    } catch (error) {
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  async uploadStaticFile(filePath: string, key: string, contentType?: string): Promise<string> {
    const config = await this.getBucketConfiguration();
    const bucketName = config.static.name;

    try {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath);
      
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: 'max-age=31536000', // 1 year cache
        ServerSideEncryption: 'AES256'
      };

      const result = await s3.upload(uploadParams).promise();
      return result.Location;
    } catch (error) {
      throw new Error(`Failed to upload static file: ${error.message}`);
    }
  }

  async listDocuments(prefix: string = '', maxKeys: number = 100): Promise<any[]> {
    const config = await this.getBucketConfiguration();
    const bucketName = config.documents.name;

    try {
      const result = await s3.listObjectsV2({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      }).promise();

      return result.Contents || [];
    } catch (error) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  async generatePresignedUrl(bucketType: keyof S3Configuration, key: string, expiresIn: number = 3600): Promise<string> {
    const config = await this.getBucketConfiguration();
    const bucketName = config[bucketType].name;

    try {
      return s3.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: key,
        Expires: expiresIn
      });
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  async getBucketMetrics(bucketType: keyof S3Configuration): Promise<any> {
    const config = await this.getBucketConfiguration();
    const bucketName = config[bucketType].name;

    try {
      // Get bucket size and object count
      const listResult = await s3.listObjectsV2({
        Bucket: bucketName
      }).promise();

      const objects = listResult.Contents || [];
      const totalSize = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);

      return {
        bucketName,
        objectCount: objects.length,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        lastModified: objects.length > 0 ? 
          Math.max(...objects.map(obj => new Date(obj.LastModified!).getTime())) : null
      };
    } catch (error) {
      throw new Error(`Failed to get bucket metrics: ${error.message}`);
    }
  }

  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    const config = await this.getBucketConfiguration();
    const bucketName = config.temp.name;

    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

      const listResult = await s3.listObjectsV2({
        Bucket: bucketName
      }).promise();

      const objectsToDelete = (listResult.Contents || [])
        .filter(obj => new Date(obj.LastModified!) < cutoffTime)
        .map(obj => ({ Key: obj.Key! }));

      if (objectsToDelete.length > 0) {
        await s3.deleteObjects({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete
          }
        }).promise();
      }

      return objectsToDelete.length;
    } catch (error) {
      throw new Error(`Failed to cleanup temp files: ${error.message}`);
    }
  }

  async syncDirectory(localPath: string, s3Prefix: string, bucketType: keyof S3Configuration): Promise<void> {
    const config = await this.getBucketConfiguration();
    const bucketName = config[bucketType].name;

    try {
      const fs = require('fs');
      const path = require('path');

      const walkDir = (dir: string, fileList: string[] = []): string[] => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList);
          } else {
            fileList.push(filePath);
          }
        }
        return fileList;
      };

      const files = walkDir(localPath);
      
      for (const filePath of files) {
        const relativePath = path.relative(localPath, filePath);
        const s3Key = path.join(s3Prefix, relativePath).replace(/\\/g, '/');
        
        const fileContent = fs.readFileSync(filePath);
        
        await s3.upload({
          Bucket: bucketName,
          Key: s3Key,
          Body: fileContent,
          ServerSideEncryption: 'AES256'
        }).promise();
        
        console.log(`Uploaded: ${relativePath} -> ${s3Key}`);
      }
    } catch (error) {
      throw new Error(`Failed to sync directory: ${error.message}`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const config = await this.getBucketConfiguration();
      const bucketChecks = [];

      for (const [type, bucket] of Object.entries(config)) {
        try {
          await s3.headBucket({ Bucket: bucket.name }).promise();
          bucketChecks.push({ type, name: bucket.name, status: 'healthy' });
        } catch (error) {
          bucketChecks.push({ type, name: bucket.name, status: 'unhealthy', error: error.message });
        }
      }

      const allHealthy = bucketChecks.every(check => check.status === 'healthy');

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details: {
          buckets: bucketChecks,
          timestamp: new Date().toISOString(),
          environment,
          region
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
}

// CLI interface
async function main(): Promise<void> {
  const command = process.argv[2];
  const s3Utils = new S3Utils();

  try {
    switch (command) {
      case 'config':
        const config = await s3Utils.getBucketConfiguration();
        console.log('S3 Configuration:');
        console.log(JSON.stringify(config, null, 2));
        break;

      case 'health':
        const health = await s3Utils.healthCheck();
        console.log('S3 Health Check:');
        console.log(JSON.stringify(health, null, 2));
        break;

      case 'metrics':
        const bucketType = process.argv[3] as keyof S3Configuration || 'documents';
        const metrics = await s3Utils.getBucketMetrics(bucketType);
        console.log(`${bucketType} Bucket Metrics:`);
        console.log(JSON.stringify(metrics, null, 2));
        break;

      case 'list':
        const prefix = process.argv[3] || '';
        const documents = await s3Utils.listDocuments(prefix);
        console.log(`Documents (prefix: ${prefix}):`);
        documents.forEach(doc => {
          console.log(`- ${doc.Key} (${s3Utils['formatBytes'](doc.Size)}, ${doc.LastModified})`);
        });
        break;

      case 'cleanup':
        const hours = parseInt(process.argv[3]) || 24;
        const deleted = await s3Utils.cleanupTempFiles(hours);
        console.log(`Cleaned up ${deleted} temporary files older than ${hours} hours`);
        break;

      case 'upload':
        const filePath = process.argv[3];
        const key = process.argv[4];
        if (!filePath || !key) {
          console.error('Usage: npm run s3:upload <filePath> <key>');
          process.exit(1);
        }
        const location = await s3Utils.uploadDocument(filePath, key);
        console.log(`Uploaded: ${location}`);
        break;

      case 'url':
        const urlBucketType = process.argv[3] as keyof S3Configuration;
        const urlKey = process.argv[4];
        const expires = parseInt(process.argv[5]) || 3600;
        if (!urlBucketType || !urlKey) {
          console.error('Usage: npm run s3:url <bucketType> <key> [expires]');
          process.exit(1);
        }
        const url = await s3Utils.generatePresignedUrl(urlBucketType, urlKey, expires);
        console.log(`Presigned URL: ${url}`);
        break;

      default:
        console.log('Available commands:');
        console.log('  config  - Show bucket configuration');
        console.log('  health  - Check bucket health');
        console.log('  metrics - Show bucket metrics [bucketType]');
        console.log('  list    - List documents [prefix]');
        console.log('  cleanup - Cleanup temp files [hours]');
        console.log('  upload  - Upload file <filePath> <key>');
        console.log('  url     - Generate presigned URL <bucketType> <key> [expires]');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { S3Utils };