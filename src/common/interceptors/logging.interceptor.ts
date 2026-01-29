import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

type HttpRequestLike = { method: string; url: string };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<HttpRequestLike>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${method} ${url} ${Date.now() - start}ms`);
        },
        error: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'error';

          this.logger.error(
            `${method} ${url} ${Date.now() - start}ms -> ${msg}`,
          );
        },
      }),
    );
  }
}
