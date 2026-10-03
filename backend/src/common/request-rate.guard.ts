import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { AppException, ErrorCode } from './errors';

/** Per-user limits let contestants behind the same campus Wi-Fi poll independently. */
@Injectable()
export class RequestRateGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; endsAt: number }>();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: CoreHubIdentity }>();
    if (request.path === '/api/health') return true;
    const writes = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const key = `${request.user?.id ?? request.ip}:${writes ? 'write' : 'read'}`;
    const now = Date.now();
    for (const [key, value] of this.windows) if (value.endsAt <= now) this.windows.delete(key);
    const window = this.windows.get(key) ?? { count: 0, endsAt: now + 60000 };
    window.count += 1;
    this.windows.set(key, window);
    if (window.count > (writes ? 30 : 120)) {
      throw new AppException(ErrorCode.TOO_MANY_REQUESTS, 'Too many requests', HttpStatus.TOO_MANY_REQUESTS,
        undefined, Math.ceil((window.endsAt - now) / 1000));
    }
    return true;
  }
}
