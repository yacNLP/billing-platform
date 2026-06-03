import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateEmailOptions, Resend } from 'resend';
import {
  EmailAttachment,
  SendEmailInput,
  SendEmailResult,
} from './email.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const emailMode = getEmailMode();

    if (emailMode === 'noop') {
      this.logger.log(
        `noop email to=${input.to} subject="${input.subject}" attachments=${input.attachments?.length ?? 0}`,
      );

      return {
        messageId: null,
        provider: 'noop',
        sent: true,
      };
    }

    return await this.sendWithResend(input);
  }

  private async sendWithResend(
    input: SendEmailInput,
  ): Promise<SendEmailResult> {
    const resendApiKey = process.env.RESEND_API_KEY?.trim();

    if (!resendApiKey) {
      throw new InternalServerErrorException(
        'RESEND_API_KEY is required when EMAIL_MODE=resend',
      );
    }

    const from = input.from?.trim() || process.env.EMAIL_FROM?.trim();

    if (!from) {
      throw new InternalServerErrorException(
        'EMAIL_FROM is required when EMAIL_MODE=resend and no sender is provided',
      );
    }

    const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
    const resend = new Resend(resendApiKey);

    try {
      const basePayload = {
        to: input.to,
        from,
        subject: input.subject,
        ...(replyTo ? { replyTo } : {}),
        ...(input.attachments?.length
          ? { attachments: input.attachments.map(toResendAttachment) }
          : {}),
      };
      const payload: CreateEmailOptions = input.html
        ? {
            ...basePayload,
            html: input.html,
            ...(input.text ? { text: input.text } : {}),
          }
        : {
            ...basePayload,
            text: input.text ?? '',
          };

      const { data, error } = await resend.emails.send(payload);

      if (error) {
        this.logger.error(
          `Resend email failed to=${input.to} subject="${input.subject}" error=${getErrorMessage(error)}`,
        );
        throw new InternalServerErrorException('Unable to send email');
      }

      return {
        messageId: data?.id ?? null,
        provider: 'resend',
        sent: true,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Resend email failed to=${input.to} subject="${input.subject}" error=${getErrorMessage(error)}`,
      );
      throw new InternalServerErrorException('Unable to send email');
    }
  }
}

function getEmailMode(): 'noop' | 'resend' {
  const emailMode = process.env.EMAIL_MODE?.trim().toLowerCase();

  if (!emailMode || emailMode === 'noop') {
    return 'noop';
  }

  if (emailMode === 'resend') {
    return 'resend';
  }

  throw new InternalServerErrorException(
    'EMAIL_MODE must be either noop or resend',
  );
}

function toResendAttachment(attachment: EmailAttachment) {
  return {
    filename: attachment.filename,
    contentType: attachment.contentType,
    content: Buffer.isBuffer(attachment.content)
      ? attachment.content.toString('base64')
      : attachment.content,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'unknown provider error';
}
