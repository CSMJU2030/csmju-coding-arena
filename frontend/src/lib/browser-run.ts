import type { RunOutcome } from "./languages";

/**
 * รัน JavaScript ในเบราว์เซอร์ของผู้ใช้ — Web Worker แยก thread ไม่เห็น DOM คุกกี้ หรือหน้าเว็บ
 * หมดเวลาแล้ว terminate ทิ้งทั้ง worker (โค้ดวนไม่จบก็หยุดได้)
 * `input()` อ่าน stdin ทีละบรรทัดแบบ Python เพื่อให้โจทย์เดียวกันเขียนได้ทุกภาษา
 */
const WORKER_SOURCE = `
const out = []; const err = []; let size = 0;
const push = (list, args) => {
  const line = args.map((a) => typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()).join(' ');
  size += line.length;
  if (size > 1048576) throw new Error('OUTPUT_LIMIT');
  list.push(line);
};
self.onmessage = (event) => {
  const { code, stdin } = event.data;
  const lines = stdin.split('\\n');
  let cursor = 0;
  const console = { log: (...a) => push(out, a), info: (...a) => push(out, a), warn: (...a) => push(err, a), error: (...a) => push(err, a) };
  const input = () => (cursor < lines.length ? lines[cursor++] : '');
  const started = performance.now();
  try {
    new Function('console', 'input', 'self', 'postMessage', 'importScripts', 'fetch', 'XMLHttpRequest', 'WebSocket', code)(console, input, undefined, undefined, undefined, undefined, undefined, undefined);
    postMessage({ status: 'OK', stdout: out.join('\\n'), stderr: err.join('\\n'), timeMs: Math.round(performance.now() - started) });
  } catch (e) {
    const limit = e && e.message === 'OUTPUT_LIMIT';
    postMessage({ status: limit ? 'OUTPUT_LIMIT_EXCEEDED' : 'RUNTIME_ERROR', stdout: out.join('\\n'), stderr: [...err, limit ? '' : String(e && e.stack || e)].join('\\n').trim(), timeMs: Math.round(performance.now() - started) });
  }
};`;

export function runJavaScriptInBrowser(code: string, stdin: string, limitMs = 5000): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const worker = new Worker(url);
    const done = (result: Partial<RunOutcome>) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ exitCode: null, stdout: "", stderr: "", compileOutput: "", timeMs: 0, status: "OK", ...result });
    };
    const timer = setTimeout(() => done({ status: "TIME_LIMIT_EXCEEDED", timeMs: limitMs }), limitMs);

    worker.onmessage = (event: MessageEvent<Partial<RunOutcome>>) => done(event.data);
    worker.onerror = (event) => {
      event.preventDefault();
      done({ status: "COMPILE_ERROR", compileOutput: event.message });
    };
    worker.postMessage({ code, stdin });
  });
}
