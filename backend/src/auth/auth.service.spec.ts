import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const previousEnvironment = {
    CORE_HUB_ISSUER: process.env.CORE_HUB_ISSUER,
    CORE_HUB_AUDIENCE: process.env.CORE_HUB_AUDIENCE,
    CORE_HUB_JWKS_URL: process.env.CORE_HUB_JWKS_URL,
    SUBSYSTEM_ID: process.env.SUBSYSTEM_ID,
  };

  beforeEach(() => {
    process.env.CORE_HUB_ISSUER = 'core-hub';
    process.env.CORE_HUB_AUDIENCE = 'csmju2030';
    process.env.CORE_HUB_JWKS_URL = 'https://core-hub.example/jwks';
    process.env.SUBSYSTEM_ID = 'csmju-coding-arena';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    jest.restoreAllMocks();
  });

  it('rejects unsafe or auth-local next paths', () => {
    const service = new AuthService();

    expect(service.safeNext('/arena/problem-1?tab=code')).toBe(
      '/arena/problem-1?tab=code',
    );
    expect(service.safeNext('//attacker.example')).toBe('/');
    expect(service.safeNext('/auth/logout')).toBe('/');
    expect(service.safeNext('/\\attacker.example')).toBe('/');
  });

  it('verifies RS256 tokens using the matching public JWKS key', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'core-hub-test-key';
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
      );

    const token = await new SignJWT({ role: 'student' })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuer('core-hub')
      .setAudience('csmju2030')
      .setSubject('user-002')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey);

    await expect(
      new AuthService().verifyAccessToken(token),
    ).resolves.toMatchObject({
      coreUserId: 'user-002',
      coreRole: 'student',
    });
  });

  it('rejects tokens issued for another subsystem', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'core-hub-test-key';
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
      );

    const token = await new SignJWT({
      role: 'student',
      azp: 'another-subsystem',
    })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuer('core-hub')
      .setAudience('csmju2030')
      .setSubject('user-002')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey);

    await expect(new AuthService().verifyAccessToken(token)).rejects.toThrow(
      'Invalid access token',
    );
  });
});
