
import { ConfigurableModuleBuilder } from '@nestjs/common';
export interface EmailModuleOptions {
  baseUrl: string;
  fromEmail: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  getTemplate: (name: string) => Promise<{ subject: string, body: string } | undefined>;
}
const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<EmailModuleOptions>().setClassMethodName('forRoot').build();

export { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN };
