import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private prisma: PrismaService,
    private matchesService: MatchesService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async evaluatePendingSubmissions() {
    // 1. หาข้อสอบ PENDING
    const submission = await this.prisma.submission.findFirst({
      where: { status: SubmissionStatus.PENDING },
      include: {
        problem: { include: { testCases: true } },
      },
    });

    if (!submission) return;

    const claimed = await this.prisma.submission.updateMany({
      where: { id: submission.id, status: SubmissionStatus.PENDING },
      data: { status: SubmissionStatus.EVALUATING },
    });
    if (!claimed.count) return;

    this.logger.log(`Evaluating submission: ${submission.id}`);

    let finalStatus: SubmissionStatus = SubmissionStatus.ACCEPTED;
    const tempDir = os.tmpdir();
    const codeFilePath = path.join(tempDir, `code_${submission.id}.py`);
    fs.writeFileSync(codeFilePath, submission.sourceCode);

    for (const testCase of submission.problem.testCases) {
      try {
        const output = await this.runPythonCode(
          codeFilePath,
          testCase.inputData,
          submission.problem.timeLimitMs || 1000,
        );

        const actualOutput = output.trim();
        const expectedOutput = (testCase.expectedOutput || '').trim();

        this.logger.log(`[Debug] TestCase ID: ${testCase.id}`);
        this.logger.log(
          `[Debug] Actual: "${actualOutput}" | Expected: "${expectedOutput}"`,
        );

        if (actualOutput !== expectedOutput) {
          finalStatus = SubmissionStatus.WRONG_ANSWER;
          break;
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown execution error';
        this.logger.error(`[Error] Execution failed: ${errorMessage}`);
        if (errorMessage === 'Time Limit Exceeded') {
          finalStatus = SubmissionStatus.TIME_LIMIT_EXCEEDED;
        } else {
          finalStatus = SubmissionStatus.RUNTIME_ERROR;
        }
        break;
      }
    }

    if (fs.existsSync(codeFilePath)) {
      fs.unlinkSync(codeFilePath);
    }

    // 4. บันทึกผลตรวจสุดท้ายลงฐานข้อมูล
    const evaluatedAt = new Date();
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { status: finalStatus, evaluatedAt },
    });

    await this.matchesService.recordEvaluation(submission.id, evaluatedAt);

    this.logger.log(
      `Submission ${submission.id} completed. Status: ${finalStatus}`,
    );
  }

  private runPythonCode(
    codeFilePath: string,
    inputData: string | null,
    timeLimitMs: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
      const child = spawn(pythonCommand, [codeFilePath]);

      let output = '';
      let errorOutput = '';

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Time Limit Exceeded'));
      }, timeLimitMs);

      if (inputData) {
        child.stdin.write(inputData);
        child.stdin.end();
      } else {
        child.stdin.end();
      }

      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code !== 0 && !errorOutput.includes('Time Limit Exceeded')) {
          reject(new Error(errorOutput.trim()));
        } else {
          resolve(output);
        }
      });
    });
  }
}
