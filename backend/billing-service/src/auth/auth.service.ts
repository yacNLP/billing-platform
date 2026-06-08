import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuditLogAction } from '../audit-logs/audit-log-action';
import { AuditLogEntityType } from '../audit-logs/audit-log-entity-type';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

type OkResponse = {
  ok: true;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const billingEmail = dto.billingEmail?.trim().toLowerCase() ?? email;
    const defaultCurrency = dto.defaultCurrency?.trim().toUpperCase() ?? 'EUR';

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.createTenantWorkspace({
      companyName: dto.companyName.trim(),
      email,
      hashedPassword,
      billingEmail,
      defaultCurrency,
    });

    return this.signAccessToken(user.id, user.tenantId, user.role);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<OkResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, tenantId: true },
    });

    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = addMinutes(new Date(), PASSWORD_RESET_TOKEN_TTL_MINUTES);

    await this.prisma.$transaction(async (tx) => {
      await this.cleanupExpiredOrUsedPasswordResetTokens(tx);

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: AuditLogAction.AuthPasswordResetRequested,
          entityType: AuditLogEntityType.Auth,
          entityId: user.id,
          metadata: {
            email: user.email,
          },
        },
      });
    });

    const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`;

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Reset your RevenueOps password',
      text: `Reset your RevenueOps password: ${resetUrl}`,
      html: `<p>Reset your RevenueOps password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<OkResponse> {
    const tokenHash = hashPasswordResetToken(dto.token);
    const now = new Date();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              tenantId: true,
            },
          },
        },
      });

      if (!resetToken) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id },
        },
        data: { usedAt: now },
      });

      await tx.auditLog.create({
        data: {
          tenantId: resetToken.user.tenantId,
          actorUserId: resetToken.user.id,
          action: AuditLogAction.AuthPasswordResetCompleted,
          entityType: AuditLogEntityType.Auth,
          entityId: resetToken.user.id,
          metadata: {
            email: resetToken.user.email,
          },
        },
      });
    });

    return { ok: true };
  }

  private async cleanupExpiredOrUsedPasswordResetTokens(
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });
  }

  private async createTenantWorkspace(input: {
    billingEmail: string;
    companyName: string;
    defaultCurrency: string;
    email: string;
    hashedPassword: string;
  }) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: input.companyName,
          },
        });

        const createdUser = await tx.user.create({
          data: {
            email: input.email,
            password: input.hashedPassword,
            role: Role.ADMIN,
            tenantId: tenant.id,
          },
        });

        await tx.tenantSettings.create({
          data: {
            tenantId: tenant.id,
            companyName: tenant.name,
            billingEmail: input.billingEmail,
            addressLine1: '',
            city: '',
            postalCode: '',
            country: '',
            defaultCurrency: input.defaultCurrency,
            paymentTerms: 30,
          },
        });

        return createdUser;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signAccessToken(user.id, user.tenantId, user.role);
  }

  private signAccessToken(userId: number, tenantId: number, role: Role) {
    return {
      accessToken: this.jwt.sign({
        sub: userId,
        tenantId,
        role,
      }),
    };
  }
}

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL?.trim() || 'http://localhost:3001';
}
