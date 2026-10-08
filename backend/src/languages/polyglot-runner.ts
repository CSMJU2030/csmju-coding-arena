import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { LanguageSpec } from './languages';

export type RunStatus =
  | 'OK'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED';

export interface RunResult {
  status: RunStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number;
  truncated?: boolean;
}

/** Docker/daemon หรือ image ไม่พร้อม — ไม่ใช่ความผิดของโค้ดผู้ใช้ */
export class PolyglotUnavailableError extends Error {}

const COMPILE_LIMIT_MS = 30_000;
const BOOT_LIMIT_MS = 20_000;
const MAX_REPLY_BYTES = 512 * 1024;

/**
 * รันโค้ดหลายภาษาใน container ของ image polyglot — standards docs/deployment.md ข้อ 8.3
 *
 * flag ครบตามขั้นต่ำ: ไม่มีเน็ต · root fs อ่านอย่างเดียว · /tmp noexec · ไม่ใช่ root · ตัด capability ·
 * จำกัด RAM (ไม่มี swap) / CPU / pids / ไฟล์ที่เปิด · `--pull=never` · ลบ container ใน finally
 *
 * เพิ่ม `/box` (tmpfs ที่รันไฟล์ได้ · nosuid · nodev) เพราะภาษาคอมไพล์ต้องรันไฟล์ที่เพิ่งคอมไพล์ —
 * **ข้อนี้ต้องให้ PM อนุมัติพร้อมการเปิดใช้ตัวรันโค้ดบน server** (บันทึกไว้ใน README หัวข้อ Polyglot)
 */
@Injectable()
export class PolyglotRunner {
  image(): string {
    return process.env.POLYGLOT_IMAGE ?? 'coding-arena-polyglot:dev';
  }

  async run(
    language: LanguageSpec,
    code: string,
    input: string,
    limitMs: number,
  ): Promise<RunResult> {
    const name = `coding-arena-run-${randomUUID()}`;
    const memory = `${language.memoryMb ?? 256}m`;
    const args = [
      'run',
      '--rm',
      '--pull=never',
      '--name',
      name,
      '--network=none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--user=65534:65534',
      `--memory=${memory}`,
      `--memory-swap=${memory}`,
      '--cpus=1',
      '--pids-limit=64',
      '--ulimit=nofile=256:256',
      '--tmpfs=/tmp:rw,noexec,nosuid,size=16m',
      '--tmpfs=/box:rw,exec,nosuid,nodev,size=256m,uid=65534,gid=65534',
      '-i',
      this.image(),
    ];
    const job = JSON.stringify({
      files: [{ name: language.file, content: code }],
      compile: language.compile ?? null,
      run: language.run,
      input,
      limitMs,
      compileLimitMs: COMPILE_LIMIT_MS,
    });

    try {
      return await new Promise<RunResult>((resolve, reject) => {
        const child = spawn('docker', args, { windowsHide: true });
        let reply = '';
        let replyBytes = 0;
        let done = false;
        let started = false;
        let readiness = '';
        const finish = (error: Error | null, result?: RunResult) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (error) {
            child.kill();
            reject(error);
          } else resolve(result as RunResult);
        };
        // ก่อน ARENA_READY = บูต + คอมไพล์ · หลังจากนั้นให้เวลาแค่เวลารันของผู้ใช้ + ส่วนเผื่อ
        let timer = setTimeout(
          () => finish(new PolyglotUnavailableError('sandbox did not answer')),
          BOOT_LIMIT_MS + COMPILE_LIMIT_MS,
        );

        child.on('error', () =>
          finish(new PolyglotUnavailableError('docker unavailable')),
        );
        child.stdin.on('error', () => {
          /* close รายงานผลเอง */
        });
        child.stdout.on('data', (data: Buffer) => {
          replyBytes += data.length;
          if (replyBytes <= MAX_REPLY_BYTES) reply += data.toString('utf8');
        });
        child.stderr.on('data', (data: Buffer) => {
          if (started) return;
          readiness = (readiness + data.toString('utf8')).slice(-512);
          if (readiness.includes('ARENA_READY')) {
            started = true;
            clearTimeout(timer);
            timer = setTimeout(
              () =>
                finish(null, {
                  status: 'TIME_LIMIT_EXCEEDED',
                  exitCode: null,
                  stdout: '',
                  stderr: '',
                  compileOutput: '',
                  timeMs: limitMs,
                }),
              limitMs + 3000,
            );
          }
        });
        child.on('close', (code) => {
          if (done) return;
          const line = reply.trim().split('\n').pop() ?? '';

          try {
            const parsed = JSON.parse(line) as RunResult;

            finish(null, parsed);
            return;
          } catch {
            // ไม่มีผล JSON: ถูกฆ่าเพราะ RAM เกิน (137) หรือ daemon/image ไม่พร้อม (125)
          }
          if (code === 137) {
            finish(null, {
              status: 'MEMORY_LIMIT_EXCEEDED',
              exitCode: 137,
              stdout: '',
              stderr: '',
              compileOutput: '',
              timeMs: 0,
            });
          } else finish(new PolyglotUnavailableError(`sandbox exited ${code}`));
        });
        child.stdin.end(job);
      });
    } finally {
      await new Promise<void>((resolve) => {
        const cleanup = spawn('docker', ['rm', '-f', name], {
          windowsHide: true,
          stdio: 'ignore',
        });
        const timer = setTimeout(() => {
          cleanup.kill();
          resolve();
        }, 5000);
        cleanup.on('error', () => {
          clearTimeout(timer);
          resolve();
        });
        cleanup.on('close', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }
}
