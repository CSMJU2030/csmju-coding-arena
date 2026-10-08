import { Injectable } from '@nestjs/common';
import { CollectionResult } from '../common/api-response';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import { AppException } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import {
  LEVEL_COUNTS,
  type CssGameName,
  type LevelClearQueryDto,
} from './level-clears.dto';

const SELECT = { id: true, game: true, level: true, createdAt: true } as const;

/** ด่านเกม CSS ที่ผ่านแล้วของผู้ใช้คนนั้นเอง (เห็นได้เฉพาะของตัวเอง) */
@Injectable()
export class LevelClearsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(coreUserId: string, query: LevelClearQueryDto) {
    const where = { coreUserId, ...(query.game ? { game: query.game } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.levelClear.findMany({
        where,
        select: SELECT,
        orderBy: [{ game: 'asc' }, { level: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.levelClear.count({ where }),
    ]);

    return new CollectionResult(
      data,
      buildPaginationMeta(total, query.page ?? 1, query.take),
    );
  }

  /** บันทึกซ้ำได้ (ผ่านด่านเดิมอีกรอบ) — คืนแถวเดิม ไม่สร้างใหม่ */
  async create(coreUserId: string, game: CssGameName, level: number) {
    if (level > LEVEL_COUNTS[game]) {
      throw AppException.badRequest(
        `เกม ${game} มี ${LEVEL_COUNTS[game]} ด่าน`,
      );
    }

    return this.prisma.levelClear.upsert({
      where: { coreUserId_game_level: { coreUserId, game, level } },
      create: { coreUserId, game, level },
      update: {},
      select: SELECT,
    });
  }
}
