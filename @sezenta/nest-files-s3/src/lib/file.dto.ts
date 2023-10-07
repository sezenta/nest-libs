import {
  IsBoolean, IsMimeType, IsOptional, IsString, IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreSignedUrlRequest {
  @IsMimeType()
  @ApiProperty({
    description: 'Mime type of the file',
  })
  mimeType: string;

  @IsString()
  @ApiProperty({
    description: 'The file name',
  })
  fileName: string;

  @IsBoolean()
  @IsOptional()
  mask?: boolean;
}

export class PreSignedUrlResponse {
  @IsUrl()
  @ApiProperty({
    description: 'Pre-signed upload URL',
  })
  upload: string;

  @IsUrl()
  @ApiProperty({
    description: 'Download URL after uploading the file',
  })
  download: string;
}
