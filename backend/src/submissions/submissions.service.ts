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

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async submit(coreUserId: string, problemId: string, sourceCode: string) {
    const student = await this.usersService.ensureUser(coreUserId);
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, isActive: true },
      include: { _count: { select: { testCases: true } } },
    });
    if (!problem) throw new NotFoundException('Problem not found');
    if (!problem._count.testCases)
      throw new BadRequestException('Problem has no test cases');
    return this.prisma.submission.create({
      data: {
        studentId: student.id,
        problemId,
        sourceCode,
      },
    });
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
