import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type CoreUser } from './auth.service';

type AuthenticatedRequest = Request & { user?: CoreUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token =
      this.bearerToken(request) ??
      this.cookieToken(
        request,
        `${this.authService.cookiePrefix}_access_token`,
      );

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = await this.authService.verifyAccessToken(token);
    return true;
  }

  private bearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }
    const match = /^Bearer\s+([^\s]+)$/i.exec(header);
    return match?.[1];
  }

  private cookieToken(request: Request, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0 || part.slice(0, separator).trim() !== name) {
        continue;
      }
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
