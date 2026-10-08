"use client";

import { useEffect, useState } from "react";
import { apiCollection, apiRequest } from "./api";

/** ตรงกับ LanguageDto ของ backend (`GET /api/v1/languages`) */
export interface Language {
  id: string;
  name: string;
  category: string;
  file: string;
  extension: string;
  runtime: "sandbox" | "browser";
  compiled: boolean;
  template: string;
  stdin: string;
}

export interface RunOutcome {
  status:
    | "OK"
    | "COMPILE_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "OUTPUT_LIMIT_EXCEEDED"
    | "MEMORY_LIMIT_EXCEEDED";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number;
  truncated?: boolean;
}

export const CATEGORY_LABELS: Record<string, string> = {
  popular: "ยอดนิยม",
  web: "เว็บ (รันในเบราว์เซอร์)",
  systems: "ภาษาระบบ / คอมไพล์",
  jvm: "ตระกูล JVM",
  dotnet: "ตระกูล .NET",
  scripting: "ภาษาสคริปต์",
  data: "ข้อมูลและคณิตศาสตร์",
  shell: "Shell และเครื่องมือข้อความ",
  functional: "Functional",
  lisp: "Lisp / Scheme",
  logic: "ตรรกะ (Logic)",
  classic: "ภาษายุคบุกเบิก",
  esoteric: "ภาษาแปลก (Esoteric)",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export const STATUS_LABELS: Record<RunOutcome["status"], string> = {
  OK: "รันสำเร็จ",
  COMPILE_ERROR: "คอมไพล์ไม่ผ่าน",
  RUNTIME_ERROR: "เกิดข้อผิดพลาดขณะรัน",
  TIME_LIMIT_EXCEEDED: "ใช้เวลาเกินกำหนด",
  OUTPUT_LIMIT_EXCEEDED: "ผลลัพธ์ยาวเกินกำหนด",
  MEMORY_LIMIT_EXCEEDED: "ใช้หน่วยความจำเกินกำหนด",
};

let cache: Promise<Language[]> | null = null;

/** รายชื่อภาษาจาก backend — โหลดครั้งเดียวต่อการเปิดหน้า */
export function useLanguages() {
  const [state, setState] = useState<{ languages: Language[]; error: string | null; loading: boolean }>({
    languages: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    cache ??= apiCollection<Language>("/api/v1/languages");
    cache.then(
      (languages) => active && setState({ languages, error: null, loading: false }),
      (error: unknown) => {
        cache = null;
        if (active)
          setState({ languages: [], error: error instanceof Error ? error.message : "โหลดรายชื่อภาษาไม่สำเร็จ", loading: false });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function runOnServer(language: string, code: string, stdin: string) {
  return apiRequest<RunOutcome & { language: string }>("/api/v1/code-runs", {
    method: "POST",
    body: JSON.stringify({ language, code, stdin }),
  });
}

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
