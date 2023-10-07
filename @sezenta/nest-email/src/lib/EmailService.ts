import {Inject, Injectable} from '@nestjs/common';
import { SES } from '@aws-sdk/client-ses';
import Handlebars from 'handlebars';
import {EmailModuleOptions, MODULE_OPTIONS_TOKEN} from "./email.definitions";
@Injectable()
export class EmailService {
  constructor( @Inject(MODULE_OPTIONS_TOKEN) private options: EmailModuleOptions) {}

  async sendEmail(template: string, to: string[], params: any) {
    const param = params ?? {};
    param.baseUrl = this.options.baseUrl;

    const templateDocument = await this.options.getTemplate(template);

    if (!templateDocument) {
      throw new Error(`No email template available with name ${template}`);
    }

    const compiledTemplateBody = Handlebars.compile(
      templateDocument.body,
    );
    const compiledTemplateSubject = Handlebars.compile(
      templateDocument.subject,
    );
    const subject = compiledTemplateSubject(params).toString();
    const body = compiledTemplateBody(params).toString();
    const ses = this.options.accessKeyId && this.options.secretAccessKey && this.options.region
      ? new SES({
          apiVersion: '2010-12-01',
          credentials: {
            accessKeyId: this.options.accessKeyId,
            secretAccessKey: this.options.secretAccessKey,
          },
          region: this.options.region,
        })
      : new SES();
    try {
      await ses.sendEmail({
        Source: this.options.fromEmail,
        Destination: { ToAddresses: to },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: body } },
        },
      });
    } catch (e) {
      console.error('Failed to send email', e);
    }
  }
}
