import InterceptorInterface from './InterceptorRunner';

export default class S3UrlToHttpsInterceptor implements InterceptorInterface {
  constructor(private readonly fileStoreUrl: string) {}
  filter(): boolean {
    return true;
  }

  s3UrlToHttps = (s3Url: string) => {
    if (!s3Url) {
      return undefined;
    }
    const urlParts = s3Url.split('://');
    const schema = urlParts[0];
    if (schema === 's3') {
      const path = s3Url.substr(5);
      return `${this.fileStoreUrl}/${path}`;
    } else {
      return s3Url;
    }
  };

  map(value: any): any {
    if (typeof value === 'string' && value.startsWith('s3://')) {
      return this.s3UrlToHttps(value);
    }
    return value;
  }
}
