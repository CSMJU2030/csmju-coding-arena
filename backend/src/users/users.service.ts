import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  ensureUser(coreUserId: string) {
    const suffix = createHash('sha256')
      .update(coreUserId)
      .digest('hex')
      .slice(0, 12);

    return this.prisma.user.upsert({
      where: { coreUserId },
      create: { coreUserId, displayName: `Player-${suffix}` },
      update: {},
    });
  }

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { hasCompetitiveRating: true },
      orderBy: [{ eloRating: 'desc' }, { id: 'asc' }],
      select: { displayName: true, eloRating: true },
      take: 5,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      displayName: user.displayName,
      eloRating: user.eloRating,
    }));
  }
}
