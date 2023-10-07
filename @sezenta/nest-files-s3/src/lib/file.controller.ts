import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { FileService } from './file.service';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { PreSignedUrlRequest, PreSignedUrlResponse } from './file.dto';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('pre-signed-url')
  @ApiBody({ type: PreSignedUrlRequest })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PreSignedUrlResponse,
    description: 'Get pre signed URL',
  })
  async getPreSignedUrl(
    @Body() preSignedRequest: PreSignedUrlRequest,
  ): Promise<PreSignedUrlResponse> {
    return await this.fileService.getPreSignedUrl(
      preSignedRequest.mimeType,
      preSignedRequest.fileName,
      preSignedRequest.mask ?? false,
    );
  }
}
