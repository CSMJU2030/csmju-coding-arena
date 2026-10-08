"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * ช่องเขียนโค้ดที่มีเลขบรรทัด — textarea ธรรมดา (CodeMirror/Monaco ไม่อยู่ใน whitelist)
 * Tab = เยื้อง 4 ช่อง · Shift+Tab = ถอยเยื้อง · Enter = คงระดับเยื้องเดิม · Ctrl/⌘+Enter = รัน
 */
export function CodePad({
  id,
  label,
  value,
  onChange,
  onRun,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
}) {
  const gutter = useRef<HTMLDivElement>(null);
  const lineCount = value.split("\n").length;

  const edit = (target: HTMLTextAreaElement, next: string, cursor: number) => {
    onChange(next);
    requestAnimationFrame(() => target.setSelectionRange(cursor, cursor));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = target;

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onRun?.();
    } else if (event.key === "Tab" && start === end) {
      event.preventDefault();
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const spaces = value.slice(lineStart, lineStart + 4).match(/^ */)?.[0].length ?? 0;
        if (spaces) edit(target, value.slice(0, lineStart) + value.slice(lineStart + spaces), start - spaces);
      } else edit(target, `${value.slice(0, start)}    ${value.slice(end)}`, start + 4);
    } else if (event.key === "Enter" && !event.shiftKey) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const indent = value.slice(lineStart).match(/^[ \t]*/)?.[0] ?? "";
      if (indent) {
        event.preventDefault();
        edit(target, `${value.slice(0, start)}\n${indent}${value.slice(end)}`, start + 1 + indent.length);
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative flex min-h-96 flex-1 overflow-hidden bg-brand-navy text-white">
        <div
          ref={gutter}
          aria-hidden
          className="code-area w-12 shrink-0 select-none overflow-hidden border-r border-white/10 py-3 pr-2 text-right text-white/35"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          id={id}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(event) => {
            if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop;
          }}
          className="code-area min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-white caret-brand-amber outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-amber"
        />
      </div>
    </div>
  );
}
