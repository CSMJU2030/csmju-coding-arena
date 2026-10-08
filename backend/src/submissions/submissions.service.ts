import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  PaginationQueryDto,
  buildPaginationMeta,
} from '../common/dto/pagination.dto';
import { CollectionResult } from '../common/api-response';
import {
  type BrowserJudgedSubmissionDto,
  judgeOutputs,
  MAX_TEST_CASES,
} from '../matches/browser-judge';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  /** คำตอบฝึกซ้อม: เบราว์เซอร์รันมาแล้ว server เทียบกับ expected output แล้วตัดสินทันที */
  async submit(coreUserId: string, dto: BrowserJudgedSubmissionDto) {
    const student = await this.usersService.ensureUser(coreUserId);
    const problem = await this.prisma.problem.findFirst({
      where: { id: dto.problemId, isActive: true },
      select: {
        testCases: {
          orderBy: { id: 'asc' },
          select: { expectedOutput: true },
        },
      },
    });
    if (!problem) throw new NotFoundException('Problem not found');
    if (!problem.testCases.length)
      throw new BadRequestException('Problem has no test cases');
    const verdict = judgeOutputs(
      problem.testCases
        .slice(0, MAX_TEST_CASES)
        .map((testCase) => testCase.expectedOutput),
      dto.outcome,
      dto.outputs,
    );
    if (!verdict) {
      throw new BadRequestException(
        'จำนวนผลลัพธ์ไม่ตรงกับจำนวนชุดทดสอบ กรุณาโหลดหน้าใหม่แล้วส่งอีกครั้ง',
      );
    }
    const evaluatedAt = new Date();
    const submission = await this.prisma.submission.create({
      data: {
        studentId: student.id,
        problemId: dto.problemId,
        sourceCode: dto.sourceCode,
        language: dto.language,
        status: verdict.status,
        evaluationStartedAt: evaluatedAt,
        evaluatedAt,
      },
      select: {
        id: true,
        status: true,
        language: true,
        createdAt: true,
        evaluatedAt: true,
      },
    });
    return { ...submission, failedTest: verdict.failedTest };
  }

  async findAll(coreUserId: string, query = new PaginationQueryDto()) {
    const student = await this.usersService.ensureUser(coreUserId);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where: { studentId: student.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.submission.count({ where: { studentId: student.id } }),
    ]);
    return new CollectionResult(
      data,
      buildPaginationMeta(total, query.page ?? 1, query.take),
    );
  }
}
