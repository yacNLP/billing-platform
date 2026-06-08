import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';

type HttpRequestLike = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
};

type HttpResponseLike = {
  setHeader(name: string, value: string): void;
  statusCode: number;
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<HttpRequestLike>();
    const res = ctx.switchToHttp().getResponse<HttpResponseLike>();
    const { method, url } = req;
    const requestId = getRequestId(req);
    const start = Date.now();

    res.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `requestId=${requestId} method=${method} url=${url} statusCode=${res.statusCode} durationMs=${Date.now() - start}`,
          );
        },
        error: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'error';
          const statusCode =
            err instanceof HttpException ? err.getStatus() : res.statusCode;

          this.logger.error(
            `requestId=${requestId} method=${method} url=${url} statusCode=${statusCode} durationMs=${Date.now() - start} error="${msg}"`,
          );
        },
      }),
    );
  }
}

function getRequestId(req: HttpRequestLike): string {
  const header = req.headers['x-request-id'];

  if (Array.isArray(header)) {
    return header[0] || randomUUID();
  }

  return header || randomUUID();
}
