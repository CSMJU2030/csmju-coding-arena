"use client";

import { apiRequest } from "@/lib/api";
import { runJavaScriptInBrowser } from "@/lib/browser-run";
import { sharedPythonRunner } from "@/lib/python-run";

/**
 * ตรวจคำตอบแบบ "รันในเบราว์เซอร์ ตัดสินที่ server" (ดู backend/src/matches/browser-judge.ts)
 * server ส่งแค่ input ของชุดทดสอบมา · โค้ดรันใน Web Worker ทีละชุด · stdout ถูกส่งกลับไปให้ server เทียบ
 * → server ไม่รันโค้ดของผู้ใช้ จึงไม่ต้องมี sandbox บน server
 */
export type JudgeLanguage = "PYTHON" | "JAVASCRIPT" | "TYPESCRIPT";
export type RunOutcome = "COMPLETED" | "RUNTIME_ERROR" | "TIME_LIMIT_EXCEEDED" | "COMPILATION_ERROR";

export const JUDGE_LANGUAGES: { id: JudgeLanguage; name: string; starter: string }[] = [
  {
    id: "PYTHON",
    name: "Python 3",
    starter: [
      "# input() อ่านข้อมูลนำเข้าทีละบรรทัด · print() พิมพ์คำตอบ",
      "line = input()",
      "",
      "print(line)",
      "",
    ].join("\n"),
  },
  {
    id: "JAVASCRIPT",
    name: "JavaScript",
    starter: [
      "// input() อ่านข้อมูลนำเข้าทีละบรรทัด · console.log() พิมพ์คำตอบ",
      "const line = input();",
      "",
      "console.log(line);",
      "",
    ].join("\n"),
  },
  {
    id: "TYPESCRIPT",
    name: "TypeScript",
    starter: [
      "// input() อ่านข้อมูลนำเข้าทีละบรรทัด · console.log() พิมพ์คำตอบ",
      "declare function input(): string;",
      "",
      "const line: string = input();",
      "console.log(line);",
      "",
    ].join("\n"),
  },
];

export interface TestInputs {
  problemId: string;
  timeLimitMs: number;
  inputs: string[];
}

export interface JudgeRun {
  outcome: RunOutcome;
  outputs: string[];
  /** ข้อความ error ของโค้ดผู้เล่นเอง (แสดงให้ผู้เล่นเห็นเท่านั้น ไม่ส่งไป server) */
  detail: string;
}

export interface JudgedSubmission {
  id: string;
  status: string;
  failedTest: number | null;
}

/** TypeScript → JavaScript ในเบราว์เซอร์ (โหลด compiler เฉพาะตอนเลือก TypeScript ครั้งแรก) */
async function transpile(code: string): Promise<{ js: string } | { error: string }> {
  const ts = await import("typescript");
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: false },
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    return {
      error: errors
        .map((d) => {
          const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
          if (!d.file || d.start === undefined) return message;
          const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
          return `บรรทัด ${line + 1}:${character + 1} ${message}`;
        })
        .join("\n"),
    };
  }
  return { js: result.outputText };
}

/** รันโค้ดกับ input ทุกชุดตามลำดับ หยุดที่ชุดแรกที่ error / หมดเวลา */
export async function runAgainstInputs(
  language: JudgeLanguage,
  code: string,
  tests: TestInputs,
  onProgress?: (done: number, total: number) => void,
): Promise<JudgeRun> {
  if (language === "PYTHON") onProgress?.(-1, tests.inputs.length);
  const python = language === "PYTHON" ? await sharedPythonRunner() : null;
  let source = code;
  if (language === "TYPESCRIPT") {
    const compiled = await transpile(code);
    if ("error" in compiled) return { outcome: "COMPILATION_ERROR", outputs: [], detail: compiled.error };
    source = compiled.js;
  }
  // เบราว์เซอร์แต่ละเครื่องเร็วไม่เท่ากัน และต้องเผื่อเวลาเปิด worker
  const limitMs = Math.max(1000, tests.timeLimitMs) + 500;
  const outputs: string[] = [];
  for (const [index, stdin] of tests.inputs.entries()) {
    onProgress?.(index, tests.inputs.length);
    const result = python
      ? await python.run(source, stdin, limitMs)
      : await runJavaScriptInBrowser(source, stdin, limitMs);
    if (result.status === "OK") {
      outputs.push(result.stdout);
      continue;
    }
    const outcome: RunOutcome =
      result.status === "TIME_LIMIT_EXCEEDED"
        ? "TIME_LIMIT_EXCEEDED"
        : result.status === "COMPILE_ERROR"
          ? "COMPILATION_ERROR"
          : "RUNTIME_ERROR";
    const detail =
      outcome === "TIME_LIMIT_EXCEEDED"
        ? `ชุดทดสอบที่ ${index + 1} ใช้เวลาเกิน ${limitMs} ms`
        : result.compileOutput || result.stderr || "โค้ดหยุดทำงานผิดปกติ";
    return { outcome, outputs, detail };
  }
  onProgress?.(tests.inputs.length, tests.inputs.length);
  return { outcome: "COMPLETED", outputs, detail: "" };
}

/** ขอ input → รัน → ส่งผล ให้ server ตัดสิน */
export async function judgeAndSubmit(options: {
  inputsPath: string;
  submitPath: string;
  problemId: string;
  language: JudgeLanguage;
  code: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ submission: JudgedSubmission; run: JudgeRun }> {
  const tests = await apiRequest<TestInputs>(options.inputsPath);
  const run = await runAgainstInputs(options.language, options.code, tests, options.onProgress);
  const submission = await apiRequest<JudgedSubmission>(options.submitPath, {
    method: "POST",
    body: JSON.stringify({
      problemId: options.problemId,
      sourceCode: options.code,
      language: options.language,
      outcome: run.outcome,
      outputs: run.outputs,
    }),
  });
  return { submission, run };
}

export function verdictMessage(submission: JudgedSubmission, run: JudgeRun): string {
  if (submission.status === "ACCEPTED") return "ถูกต้อง! ผ่านทุกชุดทดสอบ";
  const where = submission.failedTest ? ` (ชุดทดสอบที่ ${submission.failedTest})` : "";
  const label: Record<string, string> = {
    WRONG_ANSWER: "คำตอบไม่ถูกต้อง",
    RUNTIME_ERROR: "โค้ดเกิดข้อผิดพลาดขณะรัน",
    TIME_LIMIT_EXCEEDED: "ใช้เวลาเกินกำหนด",
    COMPILATION_ERROR: "โค้ดมีข้อผิดพลาดทางไวยากรณ์",
  };
  return `${label[submission.status] ?? submission.status}${where}${run.detail ? `\n${run.detail}` : ""}`;
}
