export default () => {
  const url = process.env.CORE_HUB_URL ?? 'https://csmju2030.jowave.com';
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    subsystemId: process.env.SUBSYSTEM_ID ?? 'csmju-coding-arena',
    coreHub: {
      url,
      webUrl: process.env.CORE_HUB_WEB_URL ?? url,
      jwksUrl:
        process.env.CORE_HUB_JWKS_URL ?? `${url}/api/v1/.well-known/jwks.json`,
      issuer: process.env.CORE_HUB_ISSUER ?? 'core-hub',
      audience: process.env.CORE_HUB_AUDIENCE ?? 'csmju2030',
      jwksCacheTtlMs: 600000,
      jwksMinRefreshIntervalMs: 30000,
      jwksRequestTimeoutMs: 5000,
      clockToleranceSec: 60,
      dataCacheTtlMs: 600000,
      dataMinRefreshIntervalMs: 30000,
      dataRequestTimeoutMs: 5000,
    },
  };
};
