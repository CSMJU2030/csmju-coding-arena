import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { importJWK, jwtVerify, type JWK, type JWTPayload } from 'jose';

interface CachedJwks {
  keys: JWK[];
  expiresAt: number;
}

export type CoreRole =
  'student' | 'alumni' | 'staff' | 'lecturer' | 'guest' | 'admin';

function isCoreRole(value: string): value is CoreRole {
  return (
    value === 'student' ||
    value === 'alumni' ||
    value === 'staff' ||
    value === 'lecturer' ||
    value === 'guest' ||
    value === 'admin'
  );
}

export interface CoreUser {
  coreUserId: string;
  coreRole: CoreRole;
  email?: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private jwksCache: CachedJwks | null = null;
  private lastRefreshAt = 0;

  get subsystemId(): string {
    return this.requiredSetting('SUBSYSTEM_ID');
  }

  get cookiePrefix(): string {
    return this.subsystemId.replace(/-/g, '_');
  }

  get webUrl(): string {
    return this.requiredSetting('CORE_HUB_WEB_URL').replace(/\/+$/, '');
  }

  createState(): string {
    return randomBytes(32).toString('base64url');
  }

  authorizeUrl(state: string): string {
    const url = new URL('/sso/authorize', this.webUrl);
    url.searchParams.set('subsystem', this.subsystemId);
    url.searchParams.set('state', state);
    return url.toString();
  }

  safeNext(value: unknown): string {
    if (typeof value !== 'string' || value.length < 1 || value.length > 512) {
      return '/';
    }

    if (
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.includes('\\') ||
      this.hasControlCharacters(value)
    ) {
      return '/';
    }

    try {
      const destination = new URL(value, 'http://subsystem.local');
      if (
        destination.origin !== 'http://subsystem.local' ||
        destination.pathname === '/auth' ||
        destination.pathname.startsWith('/auth/')
      ) {
        return '/';
      }
      return `${destination.pathname}${destination.search}${destination.hash}`;
    } catch {
      return '/';
    }
  }

  encodeNext(value: string): string {
    return Buffer.from(value).toString('base64url');
  }

  decodeNext(value: string): string {
    try {
      const decoded = Buffer.from(value, 'base64url').toString('utf8');
      if (Buffer.from(decoded).toString('base64url') !== value) {
        return '/';
      }
      return this.safeNext(decoded);
    } catch {
      return '/';
    }
  }

  async verifyAccessToken(token: string): Promise<CoreUser> {
    let header: { alg?: string; kid?: string };
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Malformed JWT');
      }
      const decodedHeader: unknown = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      );
      if (
        !decodedHeader ||
        typeof decodedHeader !== 'object' ||
        !('alg' in decodedHeader) ||
        !('kid' in decodedHeader)
      ) {
        throw new Error('Malformed JWT header');
      }
      header = {
        alg:
          typeof decodedHeader.alg === 'string' ? decodedHeader.alg : undefined,
        kid:
          typeof decodedHeader.kid === 'string' ? decodedHeader.kid : undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (
      header.alg !== 'RS256' ||
      typeof header.kid !== 'string' ||
      !header.kid
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    const key = await this.getPublicKey(header.kid);
    const issuer = this.requiredSetting('CORE_HUB_ISSUER');
    const audience = this.requiredSetting('CORE_HUB_AUDIENCE');
    const clockTolerance = Math.min(
      this.numberSetting('JWT_CLOCK_TOLERANCE_SEC', 60),
      60,
    );
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, key, {
        algorithms: ['RS256'],
        issuer,
        audience,
        clockTolerance,
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      payload.sub.length > 64 ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > 900 + clockTolerance ||
      payload.iat > now + clockTolerance ||
      (payload.azp !== undefined && payload.azp !== this.subsystemId)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    const role =
      typeof payload.role === 'string' ? payload.role.toLowerCase() : '';
    if (!isCoreRole(role)) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      coreUserId: payload.sub,
      coreRole: role,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      expiresAt: payload.exp,
    };
  }

  private async getPublicKey(kid: string) {
    const cached = this.jwksCache;
    const cachedJwk = cached?.keys.find((key) => key.kid === kid);
    const now = Date.now();

    if (cachedJwk && cached && now < cached.expiresAt) {
      return this.importPublicKey(cachedJwk);
    }

    const refreshAllowed =
      !cached ||
      now - this.lastRefreshAt >=
        Math.max(
          this.numberSetting('JWKS_MIN_REFRESH_INTERVAL_MS', 30_000),
          30_000,
        );
    if (refreshAllowed) {
      try {
        await this.refreshJwks();
      } catch (error) {
        const staleKey = this.jwksCache?.keys.find((key) => key.kid === kid);
        if (staleKey) {
          return this.importPublicKey(staleKey);
        }
        if (error instanceof ServiceUnavailableException) {
          throw error;
        }
        throw new ServiceUnavailableException(
          'Core Hub authentication is unavailable',
        );
      }
    }

    const jwk = this.jwksCache?.keys.find((key) => key.kid === kid);
    if (!jwk) {
      throw new UnauthorizedException('Unknown signing key');
    }

    return this.importPublicKey(jwk);
  }

  private async importPublicKey(jwk: JWK) {
    try {
      return await importJWK(jwk, 'RS256');
    } catch {
      throw new UnauthorizedException('Invalid signing key');
    }
  }

  private isPublicJwk(value: unknown): value is JWK {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const jwk = value as Record<string, unknown>;
    return typeof jwk.kid === 'string' && jwk.kty === 'RSA' && !('d' in jwk);
  }

  private hasControlCharacters(value: string): boolean {
    return Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    });
  }

  private async refreshJwks(): Promise<void> {
    this.lastRefreshAt = Date.now();
    let response: Response;
    try {
      response = await fetch(this.requiredSetting('CORE_HUB_JWKS_URL'), {
        signal: AbortSignal.timeout(
          this.numberSetting('JWKS_REQUEST_TIMEOUT_MS', 5_000),
        ),
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Core Hub authentication is unavailable',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Core Hub authentication is unavailable',
      );
    }

    let keys: unknown;
    try {
      const body: unknown = await response.json();
      keys =
        body && typeof body === 'object' && 'keys' in body
          ? body.keys
          : undefined;
    } catch {
      throw new ServiceUnavailableException(
        'Core Hub returned an invalid JWKS',
      );
    }

    if (!Array.isArray(keys)) {
      throw new ServiceUnavailableException(
        'Core Hub returned an invalid JWKS',
      );
    }

    const entries: unknown[] = keys;
    const publicKeys = entries.filter((key) => this.isPublicJwk(key));
    this.jwksCache = {
      keys: publicKeys,
      expiresAt: Date.now() + this.numberSetting('JWKS_CACHE_TTL_MS', 600_000),
    };
  }

  private requiredSetting(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new InternalServerErrorException(
        `Required authentication setting ${name} is missing`,
      );
    }
    return value;
  }

  private numberSetting(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
