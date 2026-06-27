import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

/**
 * S3-compatible object storage (self-hosted SeaweedFS in Docker, S3 API on :8333).
 * Endpoint/credentials come from env with dev defaults that match db/seaweedfs-s3.json.
 * `forcePathStyle` is REQUIRED for non-AWS S3 backends.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  readonly bucket = process.env.S3_BUCKET || 'manga-uploads';

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:8333',
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'manga',
        secretAccessKey: process.env.S3_SECRET_KEY || 'manga-s3-dev-secret',
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created S3 bucket "${this.bucket}"`);
      } catch (e) {
        this.logger.warn(
          `Could not ensure S3 bucket "${this.bucket}" (storage may be down): ${(e as Error).message}`,
        );
      }
    }
  }

  async put(key: string, body: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<{
    stream: Readable;
    contentType?: string;
    contentLength?: number;
  }> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      stream: res.Body as Readable,
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  }
}
