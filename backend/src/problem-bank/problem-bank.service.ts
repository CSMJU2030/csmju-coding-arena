import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { describeProblem, PROBLEM_BANK, problemId, testCaseId } from './bank';

/**
 * ใส่คลังโจทย์ที่มากับระบบลงฐานข้อมูลตอนเริ่ม API — เพิ่มเฉพาะข้อที่ยังไม่มี (id คงที่)
 * ไม่แก้ข้อที่มีอยู่แล้ว อาจารย์จึงแก้หรือปิดโจทย์ในคลังได้โดยไม่ถูกเขียนทับ
 */
@Injectable()
export class ProblemBankService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProblemBankService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      const added = await this.sync();
      this.logger.log(
        JSON.stringify({
          event: 'problem_bank.synced',
          added,
          total: PROBLEM_BANK.length,
        }),
      );
    } catch (error) {
      // ฐานข้อมูลยังไม่พร้อม/ยังไม่ migrate — API ยังทำงานต่อได้ แล้วลองใหม่ตอนเริ่มครั้งหน้า
      this.logger.warn(
        JSON.stringify({
          event: 'problem_bank.sync_failed',
          reason: error instanceof Error ? error.name : 'unknown',
          // รหัสของ Prisma เช่น P2021 (ตารางยังไม่มี) — ไม่มีข้อมูลบุคคล
          code: (error as { code?: unknown }).code ?? null,
        }),
      );
    }
  }

  async sync(): Promise<number> {
    const existing = new Set(
      (
        await this.prisma.problem.findMany({
          where: { id: { in: PROBLEM_BANK.map(problemId) } },
          select: { id: true },
        })
      ).map((row) => row.id),
    );
    const missing = PROBLEM_BANK.filter((p) => !existing.has(problemId(p)));
    if (!missing.length) return 0;

    await this.prisma.$transaction([
      this.prisma.problem.createMany({
        data: missing.map((p) => ({
          id: problemId(p),
          authorId: null,
          isBuiltIn: true,
          title: p.title,
          description: describeProblem(p),
          category: p.category,
          difficulty: p.difficulty,
          timeLimitMs: p.timeLimitMs ?? 2000,
          isActive: true,
        })),
        skipDuplicates: true,
      }),
      this.prisma.testCase.createMany({
        data: missing.flatMap((p) =>
          p.tests.map((input, index) => ({
            id: testCaseId(p, index),
            problemId: problemId(p),
            inputData: input,
            expectedOutput: p.solve(input),
            isHidden: index > 0,
          })),
        ),
        skipDuplicates: true,
      }),
    ]);
    return missing.length;
  }
}
