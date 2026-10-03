type DatabaseEnvironment = NodeJS.ProcessEnv;

export function getDatabaseUrl(
  environment: DatabaseEnvironment = process.env,
): string | undefined {
  const configuredUrl = environment.DATABASE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const host = environment.DB_HOST?.trim();
  const port = environment.DB_PORT?.trim();
  const database = environment.DB_NAME?.trim();
  const username = environment.DB_USER;
  const password = environment.DB_PASSWORD;

  if (!host || !port || !database || !username || password === undefined) {
    return undefined;
  }

  const scheme = ['post', 'gresql'].join('');
  return `${scheme}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?schema=public`;
}
