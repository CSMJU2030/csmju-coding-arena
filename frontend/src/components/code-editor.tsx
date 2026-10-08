"use client";

import { CodePad } from "@/components/code-pad";
import { JUDGE_LANGUAGES, type JudgeLanguage } from "@/lib/judge";

/** ช่องเขียนคำตอบพร้อมตัวเลือกภาษา — ทุกภาษาตรวจในเบราว์เซอร์ของผู้เล่น */
export function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  onRun,
}: {
  value: string;
  onChange: (value: string) => void;
  language: JudgeLanguage;
  onLanguageChange: (language: JudgeLanguage) => void;
  onRun?: () => void;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-2">
        <label htmlFor="answer-language" className="text-label-md text-on-surface">
          ภาษาที่ใช้ตอบ
        </label>
        <select
          id="answer-language"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as JudgeLanguage)}
          className="min-h-11 border-2 border-brand-navy bg-surface-container-lowest px-3 text-body-md"
        >
          {JUDGE_LANGUAGES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1">
        <CodePad id="answer-source" label="โค้ดคำตอบ" value={value} onChange={onChange} onRun={onRun} />
      </div>
    </div>
  );
}
