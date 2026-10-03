import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './dto/create-test-case.dto';

@Injectable()
export class TestCasesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTestCaseDto) {
    await this.assertProblemEditable(dto.problemId);
    return this.prisma.testCase.create({
      data: {
        problemId: dto.problemId,
        inputData: dto.inputData,
        expectedOutput: dto.expectedOutput,
        isHidden: dto.isHidden,
      },
    });
  }

  async findByProblemId(problemId: string) {
    return this.prisma.testCase.findMany({
      where: { problemId },
    });
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      select: { problemId: true },
    });
    if (!testCase) throw new NotFoundException('Test case not found');
    await this.assertProblemEditable(testCase.problemId);
    const result = await this.prisma.testCase.updateMany({
      where: { id },
      data: dto,
    });
    if (!result.count) {
      throw new NotFoundException('Test case not found');
    }
    return this.prisma.testCase.findUniqueOrThrow({ where: { id } });
  }

  async remove(id: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      select: { problemId: true },
    });
    if (!testCase) throw new NotFoundException('Test case not found');
    await this.assertProblemEditable(testCase.problemId);
    const result = await this.prisma.testCase.deleteMany({ where: { id } });
    if (!result.count) {
      throw new NotFoundException('Test case not found');
    }
    return { id };
  }

  private async assertProblemEditable(problemId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const activeMatchRound = await this.prisma.matchRound.findFirst({
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
