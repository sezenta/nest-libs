import {Global, Module} from '@nestjs/common';
import { DynamoDbDatabase } from './DynamoDbDatabase';
import { ConfigurableModuleClass } from './dynamodb.definitions';

@Global()
@Module({
  controllers: [],
  providers: [DynamoDbDatabase],
  exports: [DynamoDbDatabase],
})
export class DynamodbModule extends ConfigurableModuleClass {}
