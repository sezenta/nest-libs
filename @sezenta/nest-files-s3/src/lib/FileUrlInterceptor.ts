import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { InterceptorRunner } from './InterceptorRunner';
import HttpsToS3UrlInterceptor from './HttpsToS3UrlInterceptor';
import S3UrlToHttpsInterceptor from './S3UrlToHttpsInterceptor';
import { MODULE_OPTIONS_TOKEN } from './file.definitions';
interface FilesModuleOptions {
  s3Bucket: string;
  prefix?: string;
  filesUrl: string;
}
@Injectable()
export class FileUrlInterceptor implements NestInterceptor {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: FilesModuleOptions,
  ) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    console.log(
      'Request: ',
      JSON.stringify({
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
        body: request.body,
      }),
    );
    if (request.body) {
      request.body = new InterceptorRunner(
        new HttpsToS3UrlInterceptor(this.options.filesUrl),
      ).run(request.body);
    }
    return next
      .handle()
      .pipe(
        map((data) => {
          if (data) {
            // if (CommonConfig.logResponse) {
            //   console.log('Response', JSON.stringify(data));
            // }
            return new InterceptorRunner(
              new S3UrlToHttpsInterceptor(this.options.filesUrl),
            ).run(data);
          }
          return data;
        }),
      )
      .pipe(
        catchError((err) => {
          console.error('Error:', err, JSON.stringify(err, null, 2));
          return throwError(() => err);
        }),
      );
  }
}
