import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException, ErrorCode } from '../common/errors';
import { findLanguage } from './languages';
import {
  PolyglotRunner,
  PolyglotUnavailableError,
  type RunResult,
} from './polyglot-runner';

const RUN_LIMIT_MS = 5000;

/**
 * playground: รันโค้ดของผู้ใช้ทีละงาน (deployment.md 8.3 — RAM ของ server ใช้ร่วมกัน)
 *
 * - คิวรอได้ไม่เกิน `POLYGLOT_QUEUE` งาน (ค่าเริ่ม 8) · เกิน = 503 พร้อม Retry-After
 * - ผู้ใช้หนึ่งคนมีงานค้างได้ครั้งละ 1 งาน · ซ้อน = 429
 * - log แค่ภาษา สถานะ และเวลา — ไม่ log โค้ดหรือ input
 */
@Injectable()
export class CodeRunsService {
  private readonly logger = new Logger(CodeRunsService.name);
  private readonly busyUsers = new Set<string>();
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private readonly runner: PolyglotRunner) {}

  private get concurrency() {
    return Math.max(1, Number(process.env.POLYGLOT_CONCURRENCY ?? 1) || 1);
  }

  private get queueLimit() {
    return Math.max(0, Number(process.env.POLYGLOT_QUEUE ?? 8) || 0);
  }

  private async slot(): Promise<() => void> {
    if (this.active >= this.concurrency) {
      if (this.queue.length >= this.queueLimit)
        throw AppException.serviceUnavailable(
          'ตัวรันโค้ดคิวเต็ม กรุณาลองใหม่อีกครั้ง',
          10,
        );
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;

    return () => {
      this.active--;
      this.queue.shift()?.();
    };
  }

  async create(
    coreUserId: string,
    languageId: string,
    code: string,
    stdin = '',
  ) {
    const language = findLanguage(languageId);

    if (!language) throw AppException.badRequest(`ไม่รู้จักภาษา ${languageId}`);
    if (language.runtime !== 'sandbox')
      throw AppException.badRequest(
        'ภาษานี้รันในเบราว์เซอร์ ไม่ต้องส่งมาที่ server',
      );
    if (this.busyUsers.has(coreUserId)) {
      throw new AppException(
        ErrorCode.TOO_MANY_REQUESTS,
        'กำลังรันโค้ดก่อนหน้าอยู่ รอผลก่อน',
        HttpStatus.TOO_MANY_REQUESTS,
        undefined,
        5,
      );
    }

    this.busyUsers.add(coreUserId);
    try {
      const release = await this.slot();
      try {
        const result: RunResult = await this.runner.run(
          language,
          code,
          stdin,
          RUN_LIMIT_MS,
        );

        this.logger.log(
          JSON.stringify({
            event: 'code-run.finished',
            language: language.id,
            status: result.status,
            timeMs: result.timeMs,
          }),
        );

        return { language: language.id, ...result };
      } finally {
        release();
      }
    } catch (error) {
      if (error instanceof PolyglotUnavailableError) {
        this.logger.warn(
          JSON.stringify({
            event: 'code-run.unavailable',
            language: language.id,
          }),
        );
        throw AppException.serviceUnavailable(
          'ตัวรันโค้ดยังไม่พร้อมใช้งาน',
          30,
        );
      }
      throw error;
    } finally {
      this.busyUsers.delete(coreUserId);
    }
  }
}
