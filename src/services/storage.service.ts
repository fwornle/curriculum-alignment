/**
 * File Storage Service
 * 
 * Service for managing file storage operations with AWS S3, including
 * multipart uploads, encryption, versioning, and document management.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectTaggingCommand,
  PutObjectTaggingCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../config/environment';
import { logger } from './logging.service';
import { metrics } from './metrics.service';
import { errorHandler } from '../utils/error-handler';
import { StorageError } from '../types/errors';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Storage object metadata
 */
export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  versionId?: string;
  storageClass?: string;
}

/**
 * File upload options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  encryption?: 'AES256' | 'aws:kms';
  kmsKeyId?: string;
  acl?: 'private' | 'public-read' | 'public-read-write';
  storageClass?: 'STANDARD' | 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  cacheControl?: string;
  contentDisposition?: string;
  expires?: Date;
  multipart?: boolean;
  partSize?: number; // Bytes, minimum 5MB
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Download options
 */
export interface DownloadOptions {
  versionId?: string;
  range?: { start: number; end: number };
  ifModifiedSince?: Date;
  ifUnmodifiedSince?: Date;
  ifMatch?: string;
  ifNoneMatch?: string;
}

/**
 * List options
 */
export interface ListOptions {
  prefix?: string;
  delimiter?: string;
  maxResults?: number;
  continuationToken?: string;
  startAfter?: string;
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  remainingTime?: number; // seconds
}

/**
 * Presigned URL options
 */
export interface PresignedUrlOptions {
  expiresIn?: number; // seconds
  versionId?: string;
  responseContentType?: string;
  responseContentDisposition?: string;
}

/**
 * Document storage metadata
 */
export interface DocumentMetadata {
  documentId: string;
  documentType: 'syllabus' | 'accreditation' | 'report' | 'analysis' | 'other';
  userId?: string;
  universityId?: string;
  programId?: string;
  courseId?: string;
  uploadedAt: Date;
  processedAt?: Date;
  extractedText?: boolean;
  language?: string;
  pageCount?: number;
  wordCount?: number;
  checksum?: string;
}

/**
 * Storage bucket configuration
 */
interface BucketConfig {
  name: string;
  region: string;
  versioning: boolean;
  encryption: boolean;
  lifecycle: boolean;
}

/**
 * File Storage Service
 */
export class StorageService {
  private client: S3Client;
  private bucketConfig: BucketConfig;
  private readonly MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
  private readonly MULTIPART_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: env.NODE_ENV === 'development' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      } : undefined,
    });

    this.bucketConfig = {
      name: env.S3_BUCKET || `curriculum-alignment-${env.NODE_ENV}`,
      region: env.AWS_REGION,
      versioning: true,
      encryption: true,
      lifecycle: true,
    };
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    key: string,
    content: Buffer | Uint8Array | string | NodeJS.ReadableStream,
    options: UploadOptions = {}
  ): Promise<StorageObject> {
    try {
      const startTime = Date.now();
      
      // Determine content size if possible
      let contentLength: number | undefined;
      if (Buffer.isBuffer(content)) {
        contentLength = content.length;
      } else if (content instanceof Uint8Array) {
        contentLength = content.byteLength;
      } else if (typeof content === 'string') {
        contentLength = Buffer.byteLength(content);
      }

      // Use multipart upload for large files
      if (options.multipart || (contentLength && contentLength > this.MULTIPART_THRESHOLD)) {
        return await this.multipartUpload(key, content, options);
      }

      // Standard upload
      const command = new PutObjectCommand({
        Bucket: this.bucketConfig.name,
        Key: key,
        Body: content,
        ContentType: options.contentType || this.getContentType(key),
        Metadata: options.metadata,
        ServerSideEncryption: options.encryption || 'AES256',
        SSEKMSKeyId: options.kmsKeyId,
        ACL: options.acl || 'private',
        StorageClass: options.storageClass || 'STANDARD',
        CacheControl: options.cacheControl,
        ContentDisposition: options.contentDisposition,
        Expires: options.expires,
        Tagging: options.tags ? this.formatTags(options.tags) : undefined,
      });

      const response = await this.client.send(command);

      // Apply tags if provided
      if (options.tags) {
        await this.setObjectTags(key, options.tags, response.VersionId);
      }

      const duration = Date.now() - startTime;
      
      // Record metrics
      metrics.gauge('storage.upload.duration', duration, 'Milliseconds');
      if (contentLength) {
        metrics.counter('storage.upload.bytes', contentLength);
      }

      logger.info('File uploaded successfully', {
        key,
        size: contentLength,
        duration,
        versionId: response.VersionId,
      });

      return {
        key,
        size: contentLength || 0,
        lastModified: new Date(),
        etag: response.ETag,
        contentType: options.contentType,
        metadata: options.metadata,
        tags: options.tags,
        versionId: response.VersionId,
        storageClass: options.storageClass,
      };

    } catch (error) {
      logger.error('Failed to upload file', error as Error, { key });
      throw new StorageError(
        `Failed to upload file: ${(error as Error).message}`,
        's3',
        'upload',
        key,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Download file from S3
   */
  async downloadFile(key: string, options: DownloadOptions = {}): Promise<{
    content: Buffer;
    metadata: StorageObject;
  }> {
    try {
      const startTime = Date.now();

      const command = new GetObjectCommand({
        Bucket: this.bucketConfig.name,
        Key: key,
        VersionId: options.versionId,
        Range: options.range ? `bytes=${options.range.start}-${options.range.end}` : undefined,
        IfModifiedSince: options.ifModifiedSince,
        IfUnmodifiedSince: options.ifUnmodifiedSince,
        IfMatch: options.ifMatch,
        IfNoneMatch: options.ifNoneMatch,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('No content received from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as NodeJS.ReadableStream;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const content = Buffer.concat(chunks);
      const duration = Date.now() - startTime;

      // Record metrics
      metrics.gauge('storage.download.duration', duration, 'Milliseconds');
      metrics.counter('storage.download.bytes', content.length);

      logger.info('File downloaded successfully', {
        key,
        size: content.length,
        duration,
        versionId: response.VersionId,
      });

      return {
        content,
        metadata: {
          key,
          size: response.ContentLength || content.length,
          lastModified: response.LastModified || new Date(),
          etag: response.ETag,
          contentType: response.ContentType,
          metadata: response.Metadata,
          versionId: response.VersionId,
          storageClass: response.StorageClass,
        },
      };

    } catch (error) {
      logger.error('Failed to download file', error as Error, { key });
      throw new StorageError(
        `Failed to download file: ${(error as Error).message}`,
        's3',
        'download',
        key,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string, versionId?: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketConfig.name,
        Key: key,
        VersionId: versionId,
      });

      await this.client.send(command);

      logger.info('File deleted successfully', { key, versionId });

    } catch (error) {
      logger.error('Failed to delete file', error as Error, { key });
      throw new StorageError(
        `Failed to delete file: ${(error as Error).message}`,
        's3',
        'delete',
        key,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * List files in S3
   */
  async listFiles(options: ListOptions = {}): Promise<{
    objects: StorageObject[];
    continuationToken?: string;
    isTruncated: boolean;
  }> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketConfig.name,
        Prefix: options.prefix,
        Delimiter: options.delimiter,
        MaxKeys: options.maxResults || 1000,
        ContinuationToken: options.continuationToken,
        StartAfter: options.startAfter,
      });

      const response = await this.client.send(command);

      const objects: StorageObject[] = (response.Contents || []).map(item => ({
        key: item.Key!,
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        etag: item.ETag,
        storageClass: item.StorageClass,
      }));

      logger.debug('Files listed successfully', {
        count: objects.length,
        prefix: options.prefix,
      });

      return {
        objects,
        continuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };

    } catch (error) {
      logger.error('Failed to list files', error as Error, options);
      throw new StorageError(
        `Failed to list files: ${(error as Error).message}`,
        's3',
        'list',
        options.prefix,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string, versionId?: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketConfig.name,
        Key: key,
        VersionId: versionId,
      });

      await this.client.send(command);
      return true;

    } catch (error) {
      if ((error as any).name === 'NotFound' || (error as any).$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string, versionId?: string): Promise<StorageObject> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketConfig.name,
        Key: key,
        VersionId: versionId,
      });

      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
        contentType: response.ContentType,
        metadata: response.Metadata,
        versionId: response.VersionId,
        storageClass: response.StorageClass,
      };

    } catch (error) {
      logger.error('Failed to get file metadata', error as Error, { key });
      throw new StorageError(
        `Failed to get file metadata: ${(error as Error).message}`,
        's3',
        'head',
        key,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Copy file within S3
   */
  async copyFile(
    sourceKey: string,
    destinationKey: string,
    options?: { 
      metadata?: Record<string, string>;
      contentType?: string;
    }
  ): Promise<StorageObject> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketConfig.name,
        CopySource: `${this.bucketConfig.name}/${sourceKey}`,
        Key: destinationKey,
        Metadata: options?.metadata,
        MetadataDirective: options?.metadata ? 'REPLACE' : 'COPY',
        ContentType: options?.contentType,
      });

      const response = await this.client.send(command);

      logger.info('File copied successfully', {
        sourceKey,
        destinationKey,
        versionId: response.VersionId,
      });

      return await this.getFileMetadata(destinationKey);

    } catch (error) {
      logger.error('Failed to copy file', error as Error, { sourceKey, destinationKey });
      throw new StorageError(
        `Failed to copy file: ${(error as Error).message}`,
        's3',
        'copy',
        sourceKey,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async generatePresignedUrl(
    key: string,
    operation: 'get' | 'put' = 'get',
    options: PresignedUrlOptions = {}
  ): Promise<string> {
    try {
      const CommandClass = operation === 'get' ? GetObjectCommand : PutObjectCommand;
      
      const command = new CommandClass({
        Bucket: this.bucketConfig.name,
        Key: key,
        VersionId: options.versionId,
        ResponseContentType: options.responseContentType,
        ResponseContentDisposition: options.responseContentDisposition,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });

      logger.debug('Presigned URL generated', {
        key,
        operation,
        expiresIn: options.expiresIn,
      });

      return url;

    } catch (error) {
      logger.error('Failed to generate presigned URL', error as Error, { key });
      throw new StorageError(
        `Failed to generate presigned URL: ${(error as Error).message}`,
        's3',
        'presign',
        key,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Upload document with metadata
   */
  async uploadDocument(
    content: Buffer,
    metadata: DocumentMetadata,
    options?: UploadOptions
  ): Promise<StorageObject> {
    const key = this.generateDocumentKey(metadata);
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    metadata.checksum = checksum;

    // Prepare metadata
    const s3Metadata = {
      documentId: metadata.documentId,
      documentType: metadata.documentType,
      userId: metadata.userId || '',
      universityId: metadata.universityId || '',
      programId: metadata.programId || '',
      courseId: metadata.courseId || '',
      checksum,
    };

    // Upload with metadata
    const result = await this.uploadFile(key, content, {
      ...options,
      metadata: s3Metadata,
      tags: {
        documentType: metadata.documentType,
        processed: metadata.processedAt ? 'true' : 'false',
      },
    });

    logger.info('Document uploaded successfully', {
      documentId: metadata.documentId,
      key,
      size: content.length,
      checksum,
    });

    return result;
  }

  /**
   * Multipart upload for large files
   */
  private async multipartUpload(
    key: string,
    content: Buffer | Uint8Array | string | NodeJS.ReadableStream,
    options: UploadOptions
  ): Promise<StorageObject> {
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketConfig.name,
          Key: key,
          Body: content,
          ContentType: options.contentType || this.getContentType(key),
          Metadata: options.metadata,
          ServerSideEncryption: options.encryption || 'AES256',
          SSEKMSKeyId: options.kmsKeyId,
        },
        partSize: options.partSize || this.MULTIPART_CHUNK_SIZE,
        queueSize: 4, // Concurrent uploads
      });

      // Track progress
      if (options.onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          if (progress.loaded && progress.total) {
            options.onProgress!({
              loaded: progress.loaded,
              total: progress.total,
              percentage: Math.round((progress.loaded / progress.total) * 100),
            });
          }
        });
      }

      const response = await upload.done();

      logger.info('Multipart upload completed', {
        key,
        etag: response.ETag,
        versionId: response.VersionId,
      });

      return await this.getFileMetadata(key);

    } catch (error) {
      logger.error('Multipart upload failed', error as Error, { key });
      throw new StorageError(
        `Multipart upload failed: ${(error as Error).message}`,
        's3',
        'multipart',
        key,
        { bucket: this.bucketConfig.name }
      );
    }
  }

  /**
   * Set object tags
   */
  private async setObjectTags(key: string, tags: Record<string, string>, versionId?: string): Promise<void> {
    const command = new PutObjectTaggingCommand({
      Bucket: this.bucketConfig.name,
      Key: key,
      VersionId: versionId,
      Tagging: {
        TagSet: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      },
    });

    await this.client.send(command);
  }

  /**
   * Format tags for S3
   */
  private formatTags(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Generate document storage key
   */
  private generateDocumentKey(metadata: DocumentMetadata): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const parts = ['documents', year, month];
    
    if (metadata.universityId) {
      parts.push(metadata.universityId);
    }
    
    if (metadata.documentType) {
      parts.push(metadata.documentType);
    }
    
    parts.push(`${metadata.documentId}${this.getFileExtension(metadata.documentType)}`);
    
    return parts.join('/');
  }

  /**
   * Get file extension based on document type
   */
  private getFileExtension(documentType: string): string {
    const extensions: Record<string, string> = {
      syllabus: '.pdf',
      accreditation: '.pdf',
      report: '.pdf',
      analysis: '.json',
      other: '.bin',
    };

    return extensions[documentType] || '.bin';
  }

  /**
   * Get content type from file extension
   */
  private getContentType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Health check for storage service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      // Try to list with a limit of 1 to verify bucket access
      await this.listFiles({ maxResults: 1 });
      
      return {
        status: 'healthy',
        details: 'S3 connection successful',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `S3 connection failed: ${(error as Error).message}`,
      };
    }
  }
}

/**
 * Global storage service instance
 */
export const storage = new StorageService();

/**
 * Convenience functions for storage operations
 */
export const storageClient = {
  upload: (key: string, content: Buffer | string, options?: UploadOptions) =>
    storage.uploadFile(key, content, options),
  download: (key: string, options?: DownloadOptions) =>
    storage.downloadFile(key, options),
  delete: (key: string, versionId?: string) =>
    storage.deleteFile(key, versionId),
  list: (options?: ListOptions) =>
    storage.listFiles(options),
  exists: (key: string, versionId?: string) =>
    storage.fileExists(key, versionId),
  getMetadata: (key: string, versionId?: string) =>
    storage.getFileMetadata(key, versionId),
  copy: (source: string, destination: string, options?: { metadata?: Record<string, string>; contentType?: string }) =>
    storage.copyFile(source, destination, options),
  getPresignedUrl: (key: string, operation?: 'get' | 'put', options?: PresignedUrlOptions) =>
    storage.generatePresignedUrl(key, operation, options),
  uploadDocument: (content: Buffer, metadata: DocumentMetadata, options?: UploadOptions) =>
    storage.uploadDocument(content, metadata, options),
  health: () => storage.healthCheck(),
};

export default storage;