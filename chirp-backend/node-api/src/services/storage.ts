import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Configure AWS SDK
const s3Config: AWS.S3.ClientConfiguration = {
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION || 'us-east-1',
};

// Use custom endpoint for MinIO in development
if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT;
  s3Config.s3ForcePathStyle = true;
}

const s3 = new AWS.S3(s3Config);
const bucketName = process.env.S3_BUCKET || 'chirp-media';

export class StorageService {
  /**
   * Upload a file buffer to S3
   */
  static async uploadFile(
    buffer: Buffer,
    contentType: string,
    folder: string = 'media',
    filename?: string
  ): Promise<string> {
    try {
      const key = filename || `${folder}/${uuidv4()}-${Date.now()}`;
      
      const params: AWS.S3.PutObjectRequest = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await s3.upload(params).promise();
      logger.info(`File uploaded successfully: ${result.Location}`);
      
      return key; // Return the key, not the full URL
    } catch (error) {
      logger.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Get a presigned URL for downloading
   */
  static async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
        Expires: expiresIn,
      };

      return s3.getSignedUrl('getObject', params);
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Get a presigned URL for uploading (for direct client uploads)
   */
  static async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        Expires: expiresIn,
      };

      return s3.getSignedUrl('putObject', params);
    } catch (error) {
      logger.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
      };

      await s3.deleteObject(params).promise();
      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error('File deletion error:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      await s3.headObject({
        Bucket: bucketName,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      if ((error as AWS.AWSError).statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
      };

      return await s3.headObject(params).promise();
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * List files with prefix
   */
  static async listFiles(prefix: string, maxKeys: number = 1000): Promise<AWS.S3.Object[]> {
    try {
      const params = {
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      };

      const result = await s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Copy file to new location
   */
  static async copyFile(sourceKey: string, destKey: string): Promise<void> {
    try {
      const params = {
        Bucket: bucketName,
        CopySource: `${bucketName}/${sourceKey}`,
        Key: destKey,
      };

      await s3.copyObject(params).promise();
      logger.info(`File copied from ${sourceKey} to ${destKey}`);
    } catch (error) {
      logger.error('File copy error:', error);
      throw new Error('Failed to copy file');
    }
  }

  /**
   * Generate a unique key for storing media files
   */
  static generateMediaKey(childId: string, sessionId: string, extension: string = 'mp4'): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `media/${childId}/${sessionId}/${timestamp}-${uuid}.${extension}`;
  }

  /**
   * Generate a unique key for TTS audio files
   */
  static generateTTSKey(text: string, voice: string = 'default'): string {
    const hash = require('crypto').createHash('md5').update(`${text}-${voice}`).digest('hex');
    return `tts/${hash}.mp3`;
  }

  /**
   * Clean up expired files based on retention policy
   */
  static async cleanupExpiredFiles(retentionDays: number = 365): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const files = await this.listFiles('media/');
      const expiredFiles = files.filter(file => 
        file.LastModified && file.LastModified < cutoffDate
      );

      for (const file of expiredFiles) {
        if (file.Key) {
          await this.deleteFile(file.Key);
          logger.info(`Cleaned up expired file: ${file.Key}`);
        }
      }

      logger.info(`Cleanup completed: ${expiredFiles.length} files removed`);
    } catch (error) {
      logger.error('Cleanup error:', error);
      throw new Error('Failed to cleanup expired files');
    }
  }
}