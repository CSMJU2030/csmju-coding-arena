import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export class JudgeUnavailableError extends Error {}
export class JudgeExecutionError extends Error {
  constructor(readonly verdict: 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR') {
    super(verdict);
  }
}

// Linux container timer starts after the container boots, so launch latency is not charged to contestants.
const PYTHON_LAUNCHER = `import sys,json,subprocess
p=json.loads(sys.stdin.read())
sys.stderr.write('ARENA_READY\\n');sys.stderr.flush()
try:
 r=subprocess.run([sys.executable,'-I','-c',p['code']],input=p['input'].encode(),timeout=p['limit']/1000)
 sys.exit(r.returncode if r.returncode>=0 else 1)
except subprocess.TimeoutExpired:
 sys.exit(124)`;

@Injectable()
export class SandboxRunner {
  async run(code: string, input: string, timeLimitMs: number): Promise<string> {
    const image = process.env.JUDGE_IMAGE ?? 'python:3.12-alpine';
    const name = `coding-arena-judge-${randomUUID()}`;
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
      '--memory=128m',
      '--memory-swap=128m',
      '--cpus=1',
      '--pids-limit=32',
      '--tmpfs=/tmp:rw,noexec,nosuid,size=16m',
      '-i',
      image,
      'python',
      '-I',
      '-c',
      PYTHON_LAUNCHER,
    ];
    try {
      return await new Promise<string>((resolve, reject) => {
        const child = spawn('docker', args, { windowsHide: true });
        let output = '';
        let outputBytes = 0;
        let done = false;
        const finish = (error?: Error) => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          if (error) {
            child.kill();
            reject(error);
          } else resolve(output);
        };
        let timeout = setTimeout(
          () => finish(new JudgeUnavailableError('Judge did not start')),
          15000,
        );
        child.on('error', () =>
          finish(new JudgeUnavailableError('Docker judge unavailable')),
        );
        child.stdin.on('error', () => {
          /* close/error reports the verdict */
        });
        child.stdout.on('data', (data: Buffer) => {
          outputBytes += data.length;
          if (outputBytes > 65536)
            finish(new JudgeExecutionError('RUNTIME_ERROR'));
          else output += data.toString('utf8');
        });
        // Drain stderr without exposing submitted code, hidden tests or server details.
        let started = false;
        let readiness = '';
        child.stderr.on('data', (data: Buffer) => {
          if (started) return;
          readiness = (readiness + data.toString('utf8')).slice(-256);
          if (readiness.includes('ARENA_READY')) {
            started = true;
            clearTimeout(timeout);
            timeout = setTimeout(
              () => finish(new JudgeExecutionError('TIME_LIMIT_EXCEEDED')),
              timeLimitMs + 500,
            );
          }
        });
        child.on('close', (code) => {
          if (code === 0) finish();
          else if (code === 124)
            finish(new JudgeExecutionError('TIME_LIMIT_EXCEEDED'));
          else if (code === 125 || code === null)
            finish(new JudgeUnavailableError('Docker judge unavailable'));
          else finish(new JudgeExecutionError('RUNTIME_ERROR'));
        });
        child.stdin.end(JSON.stringify({ code, input, limit: timeLimitMs }));
      });
    } finally {
      // Removing a container also kills descendants; never rely on killing the Docker client alone.
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
