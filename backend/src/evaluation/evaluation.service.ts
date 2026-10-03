import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SandboxRunner,
  JudgeExecutionError,
  JudgeUnavailableError,
} from './sandbox-runner';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);
  private running = false;
  private retryAfter = 0;
  constructor(
    private prisma: PrismaService,
    private matchesService: MatchesService,
    private runner: SandboxRunner,
  ) {}

  @Cron(CronExpression.EVERY_SECOND, { timeZone: 'Asia/Bangkok' })
  async evaluatePendingSubmissions() {
    if (this.running || Date.now() < this.retryAfter) return;
    this.running = true;
    try {
      // Recover work after a process restart. Individual test execution is capped at 60s.
      await this.prisma.submission.updateMany({
        where: {
          status: SubmissionStatus.EVALUATING,
          evaluationStartedAt: { lt: new Date(Date.now() - 300000) },
        },
        data: { status: SubmissionStatus.PENDING, evaluationStartedAt: null },
      });
      const submission = await this.prisma.submission.findFirst({
        where: { status: SubmissionStatus.PENDING },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: {
          problem: { include: { testCases: { orderBy: { id: 'asc' } } } },
        },
      });
      if (!submission) return;
      const claimed = await this.prisma.submission.updateMany({
        where: { id: submission.id, status: SubmissionStatus.PENDING },
        data: {
          status: SubmissionStatus.EVALUATING,
          evaluationStartedAt: new Date(),
        },
      });
      if (!claimed.count) return;
      let finalStatus: SubmissionStatus = SubmissionStatus.ACCEPTED;
      try {
        if (!submission.problem.testCases.length)
          throw new JudgeUnavailableError('Problem has no tests');
        for (const testCase of submission.problem.testCases) {
          // Extend the worker lease between tests; another worker must not evaluate this submission again.
          await this.prisma.submission.update({
            where: { id: submission.id },
            data: { evaluationStartedAt: new Date() },
          });
          const output = await this.runner.run(
            submission.sourceCode,
            testCase.inputData,
            submission.problem.timeLimitMs,
          );
          if (output.trim() !== testCase.expectedOutput.trim()) {
            finalStatus = SubmissionStatus.WRONG_ANSWER;
            break;
          }
        }
      } catch (error) {
        if (error instanceof JudgeExecutionError)
          finalStatus = SubmissionStatus[error.verdict];
        else {
          await this.prisma.submission.update({
            where: { id: submission.id },
            data: {
              status: SubmissionStatus.PENDING,
              evaluationStartedAt: null,
            },
          });
          this.retryAfter = Date.now() + 30000;
          this.logger.warn(
            JSON.stringify({
              event: 'judge.unavailable',
              submissionId: submission.id,
            }),
          );
          return;
        }
      }
      const evaluatedAt = new Date();
      await this.prisma.submission.update({
        where: { id: submission.id },
        data: { status: finalStatus, evaluatedAt, evaluationStartedAt: null },
      });
      await this.matchesService.recordEvaluation(submission.id, evaluatedAt);
      this.logger.log(
        JSON.stringify({
          event: 'submission.evaluated',
          submissionId: submission.id,
          status: finalStatus,
        }),
      );
    } finally {
      this.running = false;
    }
  }
}
