import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ISlowQueryEntry {
  endpoint: string;
  duration: number;
  timestamp: number;
  userId: string | null;
}

export const slowQueryLog: ISlowQueryEntry[] = [];
const SLOW_THRESHOLD_MS = 500;
const SLOW_LOG_MAX = 100;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    // Skip non-HTTP contexts (e.g. WebSocket, RPC)
    if (!req) {
      return next.handle();
    }

    const start = Date.now();
    const route: string = req.route?.path || req.url;
    const method: string = req.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          if (duration > SLOW_THRESHOLD_MS) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userId: string | null = (req.user as any)?.id ?? null;
            this.logger.warn(
              `SLOW ${method} ${route} — ${duration}ms (user: ${userId ?? 'anon'})`
            );
            slowQueryLog.unshift({ endpoint: `${method} ${route}`, duration, timestamp: Date.now(), userId });
            if (slowQueryLog.length > SLOW_LOG_MAX) slowQueryLog.pop();
          }
        },
        error: (err: unknown) => {
          const duration = Date.now() - start;
          if (duration > SLOW_THRESHOLD_MS) {
            this.logger.warn(
              `SLOW (error) ${method} ${route} — ${duration}ms — ${err instanceof Error ? err.message : String(err)}`
            );
          }
        },
      })
    );
  }
}
