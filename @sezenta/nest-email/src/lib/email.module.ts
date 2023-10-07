import {Global, Module} from '@nestjs/common';
import { EmailService } from './EmailService';
import { ConfigModule } from '@nestjs/config';
import {ConfigurableModuleClass} from "./email.definitions";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule extends ConfigurableModuleClass {}
