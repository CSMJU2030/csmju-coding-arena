import type { Prisma } from '../../generated/prisma/client';
import { withCompetitionLock } from '../matches/competition-lock';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateProblemDto, UpdateProblemDto } from './dto/create-problem.dto';
import {
  PaginationQueryDto,
  buildPaginationMeta,
} from '../common/dto/pagination.dto';
import { CollectionResult } from '../common/api-response';

@Injectable()
export class ProblemsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async create(authorId: string, dto: CreateProblemDto) {
    const author = await this.usersService.ensureUser(authorId);

    return this.prisma.problem.create({
      data: {
        authorId: author.id,
        title: dto.title,
        description: dto.description,
        timeLimitMs: dto.timeLimitMs,
        isActive: dto.isActive,
      },
    });
  }

  async findAllActive(query = new PaginationQueryDto()) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        where: { isActive: true },
        select: { id: true, title: true, timeLimitMs: true },
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.problem.count({ where: { isActive: true } }),
    ]);
    return new CollectionResult(
      data,
      buildPaginationMeta(total, query.page ?? 1, query.take),
    );
  }

  async findAll(query = new PaginationQueryDto()) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
        include: { _count: { select: { testCases: true } } },
      }),
      this.prisma.problem.count(),
    ]);
    return new CollectionResult(
      data,
      buildPaginationMeta(total, query.page ?? 1, query.take),
    );
  }

  async update(id: string, dto: UpdateProblemDto) {
    return withCompetitionLock(this.prisma, async (tx) => {
      await this.assertNotInActiveMatch(id, tx);
      const result = await tx.problem.updateMany({
        where: { id },
        data: dto,
      });
      if (!result.count) {
        throw new NotFoundException('Problem not found');
      }
      return tx.problem.findUniqueOrThrow({ where: { id } });
    });
  }

  async deactivate(id: string) {
    return withCompetitionLock(this.prisma, async (tx) => {
      await this.assertNotInActiveMatch(id, tx);
      const result = await tx.problem.updateMany({
        where: { id },
        data: { isActive: false },
      });
      if (!result.count) {
        throw new NotFoundException('Problem not found');
      }
      return { id, deleted: true };
    });
  }

  async findOne(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id, isActive: true },
      select: { id: true, title: true, description: true, timeLimitMs: true },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found or inactive');
    }

    return problem;
  }

  private async assertNotInActiveMatch(
    id: string,
    tx: Prisma.TransactionClient,
  ) {
    const activeMatchRound = await tx.matchRound.findFirst({
      where: { problemId: id, match: { status: 'ACTIVE' } },
      select: { id: true },
    });
    if (activeMatchRound) {
      throw new ConflictException(
        'Problem is assigned to an active match and cannot be edited yet',
      );
    }
  }
}
