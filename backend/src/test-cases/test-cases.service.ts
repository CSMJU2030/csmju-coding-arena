import type { Prisma } from '../../generated/prisma/client';
import { withCompetitionLock } from '../matches/competition-lock';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginationQueryDto,
  buildPaginationMeta,
} from '../common/dto/pagination.dto';
import { CollectionResult } from '../common/api-response';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './dto/create-test-case.dto';

@Injectable()
export class TestCasesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTestCaseDto) {
    return withCompetitionLock(this.prisma, async (tx) => {
      await this.assertProblemEditable(dto.problemId, tx);
      return tx.testCase.create({
        data: {
          problemId: dto.problemId,
          inputData: dto.inputData,
          expectedOutput: dto.expectedOutput,
          isHidden: dto.isHidden,
        },
      });
    });
  }

  async findByProblemId(problemId: string, query = new PaginationQueryDto()) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.testCase.findMany({
        where: { problemId },
        orderBy: { id: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.testCase.count({ where: { problemId } }),
    ]);
    return new CollectionResult(
      data,
      buildPaginationMeta(total, query.page ?? 1, query.take),
    );
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    return withCompetitionLock(this.prisma, async (tx) => {
      const testCase = await tx.testCase.findUnique({
        where: { id },
        select: { problemId: true },
      });
      if (!testCase) throw new NotFoundException('Test case not found');
      await this.assertProblemEditable(testCase.problemId, tx);
      const result = await tx.testCase.updateMany({
        where: { id },
        data: dto,
      });
      if (!result.count) {
        throw new NotFoundException('Test case not found');
      }
      return tx.testCase.findUniqueOrThrow({ where: { id } });
    });
  }

  async remove(id: string) {
    return withCompetitionLock(this.prisma, async (tx) => {
      const testCase = await tx.testCase.findUnique({
        where: { id },
        select: { problemId: true },
      });
      if (!testCase) throw new NotFoundException('Test case not found');
      await this.assertProblemEditable(testCase.problemId, tx);
      const result = await tx.testCase.deleteMany({ where: { id } });
      if (!result.count) {
        throw new NotFoundException('Test case not found');
      }
      return { id, deleted: true };
    });
  }

  private async assertProblemEditable(
    problemId: string,
    tx: Prisma.TransactionClient,
  ) {
    const problem = await tx.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const activeMatchRound = await tx.matchRound.findFirst({
      where: { problemId, match: { status: 'ACTIVE' } },
      select: { id: true },
    });
    if (activeMatchRound) {
      throw new ConflictException(
        'Test cases cannot change while the problem is assigned to an active match',
      );
    }
  }
}
