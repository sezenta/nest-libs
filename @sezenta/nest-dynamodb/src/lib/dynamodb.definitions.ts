import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface DynamoDbModuleOptions {
  prefix: string;
  region: string;
  tables: Record<string, any>;
}
const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<DynamoDbModuleOptions>().setClassMethodName('forRoot').build();

export { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN };
