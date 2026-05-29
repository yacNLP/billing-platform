import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
