import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PreSignedUrlResponse } from './file.dto';
import { MODULE_OPTIONS_TOKEN } from './file.definitions';

interface FilesModuleOptions {
  s3Bucket: string;
  prefix?: string;
  filesUrl: string;
}
@Injectable()
export class FileService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: FilesModuleOptions,
  ) {}
  public getPreSignedUrl = async (
    mimeType: string,
    filename: string,
    mask: boolean,
  ): Promise<PreSignedUrlResponse> => {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new ForbiddenException('Invalid file type');
    }

    const mimeParts = mimeType.split('/');
    if (mimeParts.length !== 2) {
      throw new ForbiddenException('Invalid file type');
    }

    // if (!(mimeParts[0] === 'image' || mimeParts[0] === 'video' || mimeParts[0] === 'audio')) {
    //   throw new ServiceError(ResponseCode.forbidden, 'INVALID_MIME_TYPE', 'Invalid file type');
    // }
    const uniqueId = uuid();
    const parts = filename.split('.');
    const name = mask
      ? `${uniqueId}.${parts[parts.length - 1]}`
      : [uniqueId, filename].join('/');
    const s3Key = [this.options.prefix ?? 'files', name].join('/');
    console.log('ACCESS', process.env['AWS_ACCESS_KEY_ID']);
    const s3 = new S3();
    const signedUrlExpireSeconds = 60 * 60;

    const params = {
      Bucket: this.options.s3Bucket,
      Key: s3Key,
      ACL: 'public-read',
      ContentType: mimeType,
    };

    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand(params), {
      expiresIn: signedUrlExpireSeconds,
    });

    return {
      upload: uploadUrl,
      download: `s3://${s3Key}`,
    };
  };

  async uploadBuffer(key: string, contentType: string, buffer: Buffer) {
    const s3Key = [this.options.prefix ?? 'files', key].join('/');
    const s3 = new S3();
    const res = await s3.putObject({
      Bucket: this.options.s3Bucket,
      Key: s3Key,
      ContentType: contentType,
      Body: buffer,
    });
    console.log('PUT S3 Object Resp', res);
    return `s3://${s3Key}`;
  }
}
