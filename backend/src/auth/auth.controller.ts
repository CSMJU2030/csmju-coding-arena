import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  login(@Query('next') next: unknown, @Res() response: Response): void {
    const state = this.authService.createState();
    const safeNext = this.authService.safeNext(next);
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(
      `${this.authService.cookiePrefix}_sso_state`,
      `${state}.${this.authService.encodeNext(safeNext)}`,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/auth/callback',
        maxAge: 600_000,
      },
    );
    response.redirect(302, this.authService.authorizeUrl(state));
  }

  @Get('callback')
  async callback(
    @Req() request: Request,
    @Query('access_token') accessToken: unknown,
    @Query('state') state: unknown,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    const stateValue = typeof state === 'string' ? state : '';
    const stateCookieName = `${this.authService.cookiePrefix}_sso_state`;
    const sessionCookieName = `${this.authService.cookiePrefix}_access_token`;
    const cookieState = this.readCookie(request, stateCookieName);

    if (stateValue) {
      response.clearCookie(stateCookieName, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/auth/callback',
      });
    }

    if (typeof accessToken !== 'string' || !accessToken) {
      throw new BadRequestException('Access token is required');
    }

    if (!stateValue) {
      response.redirect(302, '/auth/login');
      return;
    }

    const cookieParts = cookieState?.split('.');
    const cookieStateValue = cookieParts?.[0] ?? '';
    if (
      !this.constantTimeEqual(stateValue, cookieStateValue) ||
      !cookieParts?.[1]
    ) {
      if (request.accepts('html')) {
        response
          .status(401)
          .type('html')
          .send(
            '<!doctype html><html lang="th"><body><a href="/auth/login">เข้าสู่ระบบอีกครั้ง</a></body></html>',
          );
        return;
      }
      throw new UnauthorizedException('Invalid SSO state');
    }

    const user = await this.authService.verifyAccessToken(accessToken);
    const maxAge = Math.max(0, user.expiresAt - Math.floor(Date.now() / 1000));
    if (maxAge === 0) {
      throw new UnauthorizedException('Expired access token');
    }

    response.cookie(sessionCookieName, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: maxAge * 1000,
    });
    response.redirect(302, this.authService.decodeNext(cookieParts[1]));
  }

  @Post('logout')
  logout(@Res() response: Response): void {
    response.setHeader('Cache-Control', 'no-store');
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };
    response.clearCookie(`${this.authService.cookiePrefix}_access_token`, {
      ...cookieOptions,
      path: '/',
    });
    response.clearCookie(`${this.authService.cookiePrefix}_sso_state`, {
      ...cookieOptions,
      path: '/auth/callback',
    });
    response.redirect(
      303,
      new URL('/logout', this.authService.webUrl).toString(),
    );
  }

  private readCookie(request: Request, name: string): string | undefined {
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

  private constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
