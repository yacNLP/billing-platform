import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginResponse } from './types/auth-response.type';
import { Public } from './public.decorator';
import {
  resolveAuthThrottleLimit,
  resolveAuthThrottleTtlMilliseconds,
} from './auth-throttle.config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: () => resolveAuthThrottleLimit('AUTH_LOGIN_LIMIT', 5),
      ttl: () =>
        resolveAuthThrottleTtlMilliseconds('AUTH_LOGIN_TTL_SECONDS', 60),
    },
  })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    // Await the service call to satisfy ESLint and TS
    return await this.authService.login(dto.email, dto.password);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: () => resolveAuthThrottleLimit('AUTH_SIGNUP_LIMIT', 3),
      ttl: () =>
        resolveAuthThrottleTtlMilliseconds('AUTH_SIGNUP_TTL_SECONDS', 300),
    },
  })
  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<LoginResponse> {
    return await this.authService.signup(dto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: () => resolveAuthThrottleLimit('AUTH_PASSWORD_RESET_LIMIT', 5),
      ttl: () =>
        resolveAuthThrottleTtlMilliseconds(
          'AUTH_PASSWORD_RESET_TTL_SECONDS',
          300,
        ),
    },
  })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    return await this.authService.forgotPassword(dto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: () => resolveAuthThrottleLimit('AUTH_PASSWORD_RESET_LIMIT', 5),
      ttl: () =>
        resolveAuthThrottleTtlMilliseconds(
          'AUTH_PASSWORD_RESET_TTL_SECONDS',
          300,
        ),
    },
  })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    return await this.authService.resetPassword(dto);
  }
}
