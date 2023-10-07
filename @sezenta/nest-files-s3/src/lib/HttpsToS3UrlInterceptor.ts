import InterceptorInterface from './InterceptorRunner';

export default class HttpsToS3UrlInterceptor implements InterceptorInterface {
  constructor(private readonly fileStoreUrl: string) {}
  filter(): boolean {
    return true;
  }

  httpUrlToS3 = (url: string) => {
    if (!url) {
      return undefined;
    }
    if (!url.startsWith(`${this.fileStoreUrl}/`)) {
      return url;
    }
    return url.replace(`${this.fileStoreUrl}/`, 's3://');
  };

  map(value: any): any {
    if (typeof value === 'string' && value.startsWith('https://')) {
      return this.httpUrlToS3(value);
    }
    return value;
  }
}
