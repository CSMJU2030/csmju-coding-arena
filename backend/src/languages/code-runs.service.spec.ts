import { AppException } from '../common/errors';
import { CodeRunsService } from './code-runs.service';
import {
  PolyglotRunner,
  PolyglotUnavailableError,
  type RunResult,
} from './polyglot-runner';

const ok: RunResult = {
  status: 'OK',
  exitCode: 0,
  stdout: 'Hello, CS Arena!\n',
  stderr: '',
  compileOutput: '',
  timeMs: 12,
};

function setup(run: jest.Mock) {
  return new CodeRunsService({ run } as unknown as PolyglotRunner);
}

async function expectCode(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toBeInstanceOf(AppException);
  await promise.catch((error: AppException) =>
    expect(error.getStatus()).toBe(status),
  );
}

describe('CodeRunsService', () => {
  afterEach(() => {
    delete process.env.POLYGLOT_QUEUE;
  });

  it('รันภาษาใน sandbox และคืนผลพร้อม id ภาษา', async () => {
    const run = jest.fn().mockResolvedValue(ok);

    await expect(
      setup(run).create('u1', 'python', 'print(1)', ''),
    ).resolves.toEqual({ language: 'python', ...ok });
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'python' }),
      'print(1)',
      '',
      5000,
    );
  });

  it('ภาษาที่ไม่รู้จัก หรือภาษาที่รันในเบราว์เซอร์ = 400', async () => {
    const service = setup(jest.fn());

    await expectCode(service.create('u1', 'not-a-language', 'x'), 400);
    await expectCode(service.create('u1', 'html', '<p>'), 400);
  });

  it('ผู้ใช้คนเดียวส่งซ้อนขณะงานแรกยังไม่จบ = 429', async () => {
    let release: (value: RunResult) => void = () => undefined;
    const run = jest
      .fn()
      .mockReturnValue(
        new Promise<RunResult>((resolve) => (release = resolve)),
      );
    const service = setup(run);
    const first = service.create('u1', 'python', 'a');

    await expectCode(service.create('u1', 'python', 'b'), 429);
    release(ok);
    await expect(first).resolves.toMatchObject({ status: 'OK' });
  });

  it('คิวเต็ม = 503 · คนอื่นรอคิวแล้วได้รันต่อ', async () => {
    process.env.POLYGLOT_QUEUE = '1';
    const releases: ((value: RunResult) => void)[] = [];
    const run = jest
      .fn()
      .mockImplementation(
        () => new Promise<RunResult>((resolve) => releases.push(resolve)),
      );
    const service = setup(run);
    const a = service.create('a', 'python', '1');
    const b = service.create('b', 'python', '2');

    await expectCode(service.create('c', 'python', '3'), 503);
    releases.shift()?.(ok);
    await a;
    await new Promise((r) => setImmediate(r));
    releases.shift()?.(ok);
    await expect(b).resolves.toMatchObject({ status: 'OK' });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('Docker ไม่พร้อม = 503 และผู้ใช้ส่งใหม่ได้', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(new PolyglotUnavailableError('down'))
      .mockResolvedValue(ok);
    const service = setup(run);

    await expectCode(service.create('u1', 'c', 'int main(){}'), 503);
    await expect(
      service.create('u1', 'c', 'int main(){}'),
    ).resolves.toMatchObject({ status: 'OK' });
  });
});
