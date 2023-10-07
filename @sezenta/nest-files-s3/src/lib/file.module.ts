import {Global, Module} from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { ConfigurableModuleClass } from './file.definitions';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FileUrlInterceptor } from './FileUrlInterceptor';

@Global()
@Module({
  providers: [
    FileService,
    {
      provide: APP_INTERCEPTOR,
      useClass: FileUrlInterceptor,
    },
  ],
  controllers: [FileController],
  exports: [FileService],
})
export class FileModule extends ConfigurableModuleClass {}
