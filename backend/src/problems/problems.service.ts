import type { Prisma } from '../../generated/prisma/client';
import { withCompetitionLock } from '../matches/competition-lock';
import {
  BadRequestException,
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
import { MAX_TEST_CASES } from '../matches/browser-judge';
import { ProblemListQueryDto } from './dto/create-problem.dto';

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

  /** โจทย์ที่เปิดอยู่และมีชุดทดสอบ (เล่นได้จริง) กรองตามหมวด/ระดับได้ */
  async findAllActive(query: ProblemListQueryDto = new ProblemListQueryDto()) {
    const where = {
      isActive: true,
      testCases: { some: {} },
      ...(query.category ? { category: query.category } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        where,
        select: {
          id: true,
          title: true,
          timeLimitMs: true,
          category: true,
          difficulty: true,
          isBuiltIn: true,
        },
        orderBy: [
          { category: 'asc' },
          { difficulty: 'asc' },
          { title: 'asc' },
          { id: 'asc' },
        ],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.problem.count({ where }),
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

  async testInputs(id: string) {
    const problem = await this.prisma.problem.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        timeLimitMs: true,
        testCases: { orderBy: { id: 'asc' }, select: { inputData: true } },
      },
    });
    if (!problem) throw new NotFoundException('Problem not found');
    if (!problem.testCases.length)
      throw new BadRequestException('Problem has no test cases');
    return {
      problemId: problem.id,
      timeLimitMs: problem.timeLimitMs,
      inputs: problem.testCases
        .slice(0, MAX_TEST_CASES)
        .map((testCase) => testCase.inputData),
    };
  }

  async findOne(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimitMs: true,
        category: true,
        difficulty: true,
        isBuiltIn: true,
      },
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
