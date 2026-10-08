"use client";

import type { RunOutcome } from "./languages";

/**
 * รัน Python ในเบราว์เซอร์ของผู้ใช้ด้วย Pyodide (CPython บน WebAssembly) ที่ host เองใน `public/pyodide/`
 * ไม่โหลดจาก CDN และไม่ส่งโค้ดออกนอกเครื่อง · รันใน module Web Worker แยก thread
 * โหลด Pyodide ครั้งเดียวต่อ worker (~1–3 วินาที) แล้วรันโค้ดได้หลายครั้ง โดยใช้ globals ใหม่ทุกครั้ง
 * หมดเวลา = terminate worker ทิ้งทั้งตัว (โค้ดวนไม่จบก็หยุดได้) แล้วครั้งถัดไปค่อยโหลดใหม่
 */
export const PYODIDE_VERSION = "314.0.7";

const WORKER_SOURCE = `
let py;
const dec = new TextDecoder();
let out = ''; let err = ''; let size = 0; let overflow = false;
const sink = (target) => (buf) => {
  size += buf.length;
  if (size > 1048576) { overflow = true; return buf.length; }
  const text = dec.decode(buf);
  if (target === 'out') out += text; else err += text;
  return buf.length;
};
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      const { loadPyodide } = await import(data.base + 'pyodide.mjs');
      py = await loadPyodide({ indexURL: data.base });
      py.setStdout({ write: sink('out') });
      py.setStderr({ write: sink('err') });
      postMessage({ type: 'ready' });
    } catch (e) {
      postMessage({ type: 'failed', message: String(e && e.message || e) });
    }
    return;
  }
  // ป้อน stdin เป็นสตรีมไบต์ (แบบทีละบรรทัดของ Pyodide ตัดบรรทัดที่ยาวมาก เช่นตัวเลข 10^5 ตัว)
  const bytes = new TextEncoder().encode(data.stdin.endsWith('\\n') ? data.stdin : data.stdin + '\\n');
  let offset = 0;
  out = ''; err = ''; size = 0; overflow = false;
  py.setStdin({ read: (buf) => {
    const n = Math.min(buf.length, bytes.length - offset);
    buf.set(bytes.subarray(offset, offset + n));
    offset += n;
    return n;
  } });
  const ns = py.globals.get('dict')();
  ns.set('__name__', '__main__');
  const started = performance.now();
  let status = 'OK'; let message = '';
  try {
    py.runPython(data.code, { globals: ns, filename: 'main.py' });
  } catch (e) {
    message = String(e && e.message || e);
    status = /^(SyntaxError|IndentationError|TabError)\\b/m.test(message.trim().split('\\n').pop() || '') ? 'COMPILE_ERROR' : 'RUNTIME_ERROR';
  } finally {
    try { py.runPython('import sys\\nsys.stdout.flush()\\nsys.stderr.flush()'); } catch {}
    ns.destroy();
  }
  if (overflow) status = 'OUTPUT_LIMIT_EXCEEDED';
  postMessage({ type: 'result', status, stdout: out, stderr: err, message, timeMs: Math.round(performance.now() - started) });
};`;

/** ตัด traceback ส่วนของ Pyodide ออก เหลือเฉพาะบรรทัดในโค้ดของผู้ใช้ */
function cleanTraceback(message: string): string {
  const lines = message.trim().split("\n");
  const first = lines.findIndex((line) => line.includes('File "main.py"'));
  if (first < 0) return lines.slice(-3).join("\n");
  return ["Traceback (most recent call last):", ...lines.slice(first)].join("\n");
}

type WorkerResult = { type: "result"; status: RunOutcome["status"]; stdout: string; stderr: string; message: string; timeMs: number };

export class PythonRunner {
  private constructor(private worker: Worker | null) {}

  /** โหลด Pyodide ใน worker ใหม่ (ไฟล์ ~13 MB ครั้งแรก แล้วเบราว์เซอร์ cache ไว้) */
  static create(loadTimeoutMs = 60_000): Promise<PythonRunner> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
      const worker = new Worker(url, { type: "module" });
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        worker.terminate();
        reject(new Error("โหลดตัวรัน Python ไม่สำเร็จ (หมดเวลา) — ลองโหลดหน้าใหม่"));
      }, loadTimeoutMs);
      worker.onmessage = (event: MessageEvent<{ type: string; message?: string }>) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        if (event.data.type === "ready") resolve(new PythonRunner(worker));
        else {
          worker.terminate();
          reject(new Error(`โหลดตัวรัน Python ไม่สำเร็จ: ${event.data.message ?? ""}`));
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        worker.terminate();
        reject(new Error(`โหลดตัวรัน Python ไม่สำเร็จ: ${event.message}`));
      };
      worker.postMessage({ type: "init", base: `${window.location.origin}/pyodide/${PYODIDE_VERSION}/` });
    });
  }

  get alive() {
    return this.worker !== null;
  }

  run(code: string, stdin: string, limitMs = 5000): Promise<RunOutcome> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error("ตัวรัน Python ถูกปิดแล้ว"));
    return new Promise((resolve) => {
      const base = { exitCode: null, stdout: "", stderr: "", compileOutput: "", timeMs: 0 };
      const timer = setTimeout(() => {
        this.dispose();
        resolve({ ...base, status: "TIME_LIMIT_EXCEEDED", timeMs: limitMs });
      }, limitMs);
      worker.onmessage = (event: MessageEvent<WorkerResult>) => {
        clearTimeout(timer);
        const { status, stdout, stderr, message, timeMs } = event.data;
        const trace = message ? cleanTraceback(message) : "";
        resolve({
          ...base,
          status,
          stdout,
          stderr: [stderr.trim(), status === "RUNTIME_ERROR" ? trace : ""].filter(Boolean).join("\n"),
          compileOutput: status === "COMPILE_ERROR" ? trace : "",
          timeMs,
        });
      };
      worker.postMessage({ type: "run", code, stdin });
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}

let shared: Promise<PythonRunner> | null = null;

/** ตัวรันที่ใช้ร่วมกันในหน้า (สนามเขียนโค้ด) — ถ้าตัวเดิมถูกปิดเพราะหมดเวลา จะโหลดใหม่ให้ */
export async function sharedPythonRunner(): Promise<PythonRunner> {
  if (shared) {
    const runner = await shared.catch(() => null);
    if (runner?.alive) return runner;
  }
  shared = PythonRunner.create();
  shared.catch(() => {
    shared = null;
  });
  return shared;
}
