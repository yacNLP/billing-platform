import { InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailService } from './email.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.EMAIL_MODE;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_REPLY_TO;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns noop provider by default and does not contact Resend', async () => {
    const service = new EmailService();

    const result = await service.sendEmail({
      to: 'customer@example.com',
      subject: 'Hello',
      text: 'Hello customer',
    });

    expect(result).toEqual({
      messageId: null,
      provider: 'noop',
      sent: true,
    });
    expect(Resend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('keeps noop mode explicit and does not contact Resend', async () => {
    process.env.EMAIL_MODE = 'noop';
    process.env.RESEND_API_KEY = 're_test_key';
    const service = new EmailService();

    const result = await service.sendEmail({
      to: 'customer@example.com',
      subject: 'Hello',
      html: '<p>Hello customer</p>',
    });

    expect(result.provider).toBe('noop');
    expect(Resend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('throws a clear error when resend mode has no RESEND_API_KEY', async () => {
    process.env.EMAIL_MODE = 'resend';
    process.env.EMAIL_FROM = 'RevenueOps <billing@example.com>';
    const service = new EmailService();

    await expect(
      service.sendEmail({
        to: 'customer@example.com',
        subject: 'Hello',
        text: 'Hello customer',
      }),
    ).rejects.toThrow('RESEND_API_KEY is required when EMAIL_MODE=resend');
  });

  it('sends through Resend and maps the provider message id', async () => {
    process.env.EMAIL_MODE = 'resend';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'RevenueOps <billing@example.com>';
    process.env.EMAIL_REPLY_TO = 'support@example.com';
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });
    const service = new EmailService();

    const result = await service.sendEmail({
      to: 'customer@example.com',
      subject: 'Invoice INV-1',
      text: 'Invoice text',
      html: '<p>Invoice html</p>',
    });

    expect(Resend).toHaveBeenCalledWith('re_test_key');
    expect(mockSend).toHaveBeenCalledWith({
      to: 'customer@example.com',
      from: 'RevenueOps <billing@example.com>',
      subject: 'Invoice INV-1',
      text: 'Invoice text',
      html: '<p>Invoice html</p>',
      replyTo: 'support@example.com',
    });
    expect(result).toEqual({
      messageId: 'email_123',
      provider: 'resend',
      sent: true,
    });
  });

  it('uses input.from before EMAIL_FROM when sending through Resend', async () => {
    process.env.EMAIL_MODE = 'resend';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'RevenueOps <billing@example.com>';
    mockSend.mockResolvedValue({ data: { id: 'email_456' }, error: null });
    const service = new EmailService();

    await service.sendEmail({
      to: 'customer@example.com',
      from: 'Tenant Billing <tenant@example.com>',
      subject: 'Invoice INV-2',
      text: 'Invoice text',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Tenant Billing <tenant@example.com>',
      }),
    );
  });

  it('encodes Buffer attachments as base64 for Resend', async () => {
    process.env.EMAIL_MODE = 'resend';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'RevenueOps <billing@example.com>';
    mockSend.mockResolvedValue({ data: { id: 'email_pdf' }, error: null });
    const service = new EmailService();

    await service.sendEmail({
      to: 'customer@example.com',
      subject: 'Invoice PDF',
      text: 'Attached invoice',
      attachments: [
        {
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('%PDF-test'),
        },
      ],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: 'invoice.pdf',
            contentType: 'application/pdf',
            content: Buffer.from('%PDF-test').toString('base64'),
          },
        ],
      }),
    );
  });

  it('throws a clean error when Resend returns an error', async () => {
    process.env.EMAIL_MODE = 'resend';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'RevenueOps <billing@example.com>';
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Provider rejected the request' },
    });
    const service = new EmailService();

    await expect(
      service.sendEmail({
        to: 'customer@example.com',
        subject: 'Hello',
        text: 'Hello customer',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
