import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { getDatabaseUrl } from './src/prisma/database-url';

loadEnv({ path: '.env.local' });
loadEnv();

const databaseUrl = getDatabaseUrl();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
