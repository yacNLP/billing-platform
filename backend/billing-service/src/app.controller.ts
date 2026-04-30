import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('healthz')
  healthCheck() {
    return { status: 'ok' };
  }
}
