"use client";

/**
 * ภาษาในคอมไพเลอร์ออนไลน์ — รันในเบราว์เซอร์ของผู้ใช้เท่านั้น (ไม่รันโค้ดผู้ใช้บน server · ไม่ต้องขออนุมัติ sandbox)
 * Python รันด้วย Pyodide ที่ host เอง (python-run.ts) · JavaScript รันใน Web Worker · HTML/CSS/JS แสดงใน iframe แบบ sandbox
 */
export interface Language {
  id: "python" | "javascript" | "html";
  name: string;
  file: string;
  template: string;
  stdin: string;
}

export interface RunOutcome {
  status: "OK" | "COMPILE_ERROR" | "RUNTIME_ERROR" | "TIME_LIMIT_EXCEEDED" | "OUTPUT_LIMIT_EXCEEDED";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number;
  truncated?: boolean;
}

const lines = (...rows: string[]) => `${rows.join("\n")}\n`;

export const LANGUAGES: Language[] = [
  {
    id: "python",
    name: "Python 3",
    file: "main.py",
    template: lines(
      "# input() อ่าน stdin ทีละบรรทัด · print() พิมพ์ผลลัพธ์",
      "name = input()",
      'print(f"Hello, {name}!")',
      "",
      "scores = list(map(int, input().split()))",
      'print("คะแนนรวม", sum(scores))',
    ),
    stdin: "CS Arena\n10 20 30",
  },
  {
    id: "javascript",
    name: "JavaScript",
    file: "main.js",
    template: lines(
      "// input() อ่าน stdin ทีละบรรทัด · console.log() พิมพ์ผลลัพธ์",
      "const name = input();",
      "console.log(`Hello, ${name}!`);",
      "",
      "const scores = input().split(' ').map(Number);",
      "console.log('คะแนนรวม', scores.reduce((a, b) => a + b, 0));",
    ),
    stdin: "CS Arena\n10 20 30",
  },
  {
    id: "html",
    name: "HTML / CSS / JS",
    file: "index.html",
    template: lines(
      "<!doctype html>",
      "<style>",
      "  body { font-family: monospace; display: grid; place-items: center; min-height: 90vh; margin: 0; }",
      "  .hero { padding: 24px; border: 4px solid; font-size: 24px; }",
      "</style>",
      '<div class="hero">Hello, CS Arena!</div>',
      "<script>",
      "  document.querySelector('.hero').addEventListener('click', (e) => (e.target.textContent = 'คลิกแล้ว!'));",
      "</script>",
    ),
    stdin: "",
  },
];

export const STATUS_LABELS: Record<RunOutcome["status"], string> = {
  OK: "รันสำเร็จ",
  COMPILE_ERROR: "โค้ดมีข้อผิดพลาด",
  RUNTIME_ERROR: "เกิดข้อผิดพลาดขณะรัน",
  TIME_LIMIT_EXCEEDED: "ใช้เวลาเกินกำหนด",
  OUTPUT_LIMIT_EXCEEDED: "ผลลัพธ์ยาวเกินกำหนด",
};

/** ร่างโค้ดของแต่ละภาษา — จำไว้ในเบราว์เซอร์นี้เท่านั้น (ไม่ใช่ข้อมูลลับ ไม่ใช่ token) */
export function loadDraft(languageId: string): string | null {
  try {
    return window.localStorage.getItem(`arena:draft:${languageId}`);
  } catch {
    return null;
  }
}

export function saveDraft(languageId: string, code: string, template: string) {
  try {
    if (code === template) window.localStorage.removeItem(`arena:draft:${languageId}`);
    else window.localStorage.setItem(`arena:draft:${languageId}`, code);
  } catch {
    // โหมดส่วนตัว/พื้นที่เต็ม — ไม่จำร่าง แต่ใช้งานต่อได้
  }
}
