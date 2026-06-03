export type EmailAttachment = {
  content: Buffer | string;
  contentType: string;
  filename: string;
};

export type EmailProvider = 'noop' | 'resend';

export type SendEmailInput = {
  attachments?: EmailAttachment[];
  from?: string;
  html?: string;
  subject: string;
  text?: string;
  to: string;
};

export type SendEmailResult = {
  messageId: string | null;
  provider: EmailProvider;
  sent: boolean;
};
