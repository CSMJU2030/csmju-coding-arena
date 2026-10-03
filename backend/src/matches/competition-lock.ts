import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/** Share matchmaking's transaction lock so teachers cannot change assigned tests mid-match. */
export function withCompetitionLock<T>(
  prisma: PrismaService,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(81372041)::text`;
    return action(tx);
  });
}
