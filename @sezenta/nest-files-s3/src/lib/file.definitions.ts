import { ConfigurableModuleBuilder } from '@nestjs/common';

interface FilesModuleOptions {
  s3Bucket: string;
  prefix?: string;
  filesUrl: string;
}
const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<FilesModuleOptions>().build();

export { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN };
