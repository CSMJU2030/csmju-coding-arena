import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateProblemDto, UpdateProblemDto } from './dto/create-problem.dto';

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

  async findAllActive() {
    return this.prisma.problem.findMany({
      where: { isActive: true },
      select: { id: true, title: true, timeLimitMs: true },
    });
  }

  async findAll() {
    return this.prisma.problem.findMany({
      orderBy: { title: 'asc' },
      include: { _count: { select: { testCases: true } } },
    });
  }

  async update(id: string, dto: UpdateProblemDto) {
    await this.assertNotInActiveMatch(id);
    const result = await this.prisma.problem.updateMany({
      where: { id },
      data: dto,
    });
    if (!result.count) {
      throw new NotFoundException('Problem not found');
    }
    return this.prisma.problem.findUniqueOrThrow({ where: { id } });
  }

  async deactivate(id: string) {
    await this.assertNotInActiveMatch(id);
    const result = await this.prisma.problem.updateMany({
      where: { id },
      data: { isActive: false },
    });
    if (!result.count) {
      throw new NotFoundException('Problem not found');
    }
    return { id, isActive: false };
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

  private async assertNotInActiveMatch(id: string) {
    const activeMatchRound = await this.prisma.matchRound.findFirst({
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
