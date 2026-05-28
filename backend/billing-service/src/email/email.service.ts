import { Injectable, Logger } from '@nestjs/common';
import { SendEmailInput, SendEmailResult } from './email.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const emailMode = process.env.EMAIL_MODE?.trim().toLowerCase();
    const resendApiKey = process.env.RESEND_API_KEY?.trim();

    if (emailMode === 'noop' || !resendApiKey) {
      this.logger.log(
        `noop email to=${input.to} subject="${input.subject}" attachments=${input.attachments?.length ?? 0}`,
      );

      return Promise.resolve({
        messageId: null,
        provider: 'noop',
        sent: true,
      });
    }

    this.logger.log(
      `noop email to=${input.to} subject="${input.subject}" attachments=${input.attachments?.length ?? 0}`,
    );

    return Promise.resolve({
      messageId: null,
      provider: 'noop',
      sent: true,
    });
  }
}
