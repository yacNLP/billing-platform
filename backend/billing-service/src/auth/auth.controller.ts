import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginResponse } from './types/auth-response.type';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    // Await the service call to satisfy ESLint and TS
    return await this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<LoginResponse> {
    return await this.authService.signup(dto);
  }
}
