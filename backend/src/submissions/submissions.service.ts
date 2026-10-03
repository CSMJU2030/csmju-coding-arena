import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async submit(coreUserId: string, problemId: string, sourceCode: string) {
    const student = await this.usersService.ensureUser(coreUserId);
    return this.prisma.submission.create({
      data: {
        studentId: student.id,
        problemId,
        sourceCode,
      },
    });
  }

  async findAll(coreUserId: string) {
    const student = await this.usersService.ensureUser(coreUserId);
    return this.prisma.submission.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
