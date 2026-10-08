"use client";

import { Clock3, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodePad } from "@/components/code-pad";
import { runJavaScriptInBrowser } from "@/lib/browser-run";
import { sharedPythonRunner } from "@/lib/python-run";
import { LANGUAGES, loadDraft, saveDraft, STATUS_LABELS, type Language, type RunOutcome } from "@/lib/languages";

type Result = { kind: "outcome"; outcome: RunOutcome } | { kind: "error"; message: string } | { kind: "html"; html: string };

function OutputBlock({ title, text, tone }: { title: string; text: string; tone?: "error" }) {
  if (!text) return null;
  return (
    <section>
      <h3 className="mb-1 text-label-md text-on-surface-variant">{title}</h3>
      <pre
        className={`code-area max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 ${
          tone === "error" ? "bg-error-container text-on-error-container" : "bg-surface-container-low text-on-surface"
        }`}
      >
        {text}
      </pre>
    </section>
  );
}

export function Playground() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = params.get("lang") ?? "python";
  const language: Language = useMemo(() => LANGUAGES.find((l) => l.id === selectedId) ?? LANGUAGES[0], [selectedId]);

  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // เปลี่ยนภาษา = โหลดร่างของภาษานั้น (หรือโค้ดตั้งต้น) — ทำระหว่าง render แทน effect
  if (loadedFor !== language.id) {
    setLoadedFor(language.id);
    setCode(loadDraft(language.id) ?? language.template);
    setStdin(language.stdin);
    setResult(null);
  }

  useEffect(() => {
    if (loadedFor !== language.id) return;
    const timer = setTimeout(() => saveDraft(language.id, code, language.template), 400);
    return () => clearTimeout(timer);
  }, [code, language, loadedFor]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      if (language.id === "html") setResult({ kind: "html", html: code });
      else if (language.id === "python") {
        const runner = await sharedPythonRunner();
        setResult({ kind: "outcome", outcome: await runner.run(code, stdin) });
      } else setResult({ kind: "outcome", outcome: await runJavaScriptInBrowser(code, stdin) });
    } catch (runError) {
      setResult({ kind: "error", message: runError instanceof Error ? runError.message : "รันโค้ดไม่สำเร็จ" });
    } finally {
      setRunning(false);
    }
  }, [code, language, running, stdin]);

  const choose = (id: string) => router.replace(`${pathname}?lang=${encodeURIComponent(id)}`, { scroll: false });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="pixel-font text-label-md text-primary-container">PLAYGROUND</p>
          <h1 className="text-headline-lg text-on-surface">สนามเขียนโค้ด Python · JavaScript · HTML</h1>
          <p className="text-body-md text-on-surface-variant">
            เขียนโค้ด ใส่ข้อมูลนำเข้า แล้วกดรัน (Ctrl + Enter) — รันในเบราว์เซอร์ของคุณ ไม่ส่งโค้ดไปที่ใด
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="language" className="mb-1 block text-label-md">
              ภาษา
            </label>
            <select
              id="language"
              value={language.id}
              onChange={(event) => choose(event.target.value)}
              className="min-h-11 min-w-48 border-2 border-brand-navy bg-surface-container-lowest px-3 text-body-md"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setCode(language.template);
              setStdin(language.stdin);
              setResult(null);
            }}
            className="pixel-button inline-flex min-h-11 items-center gap-2 bg-surface-container-high px-4 text-on-surface"
          >
            <RotateCcw aria-hidden className="size-4" />
            โค้ดตัวอย่าง
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="pixel-button inline-flex min-h-11 items-center gap-2 bg-brand-amber px-6 font-bold text-brand-navy disabled:opacity-60"
          >
            <Play aria-hidden className="size-4" />
            {running ? "กำลังรัน..." : "รัน"}
          </button>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-label="ซอร์สโค้ด" className="pixel-box flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-2 bg-brand-navy px-3 py-2 text-white">
            <span className="code-area text-white/80">{language.file}</span>
            <span className="flex items-center gap-1 text-label-sm text-white/70">
              <ShieldCheck aria-hidden className="size-4" />
              รันในเบราว์เซอร์ของคุณ
            </span>
          </div>
          <CodePad id="source" label={`ซอร์สโค้ดภาษา ${language.name}`} value={code} onChange={setCode} onRun={() => void run()} />
        </section>

        <div className="flex flex-col gap-8">
          {language.id !== "html" && (
            <section className="pixel-box p-4">
              <label htmlFor="stdin" className="mb-2 block text-label-md">
                ข้อมูลนำเข้า (stdin)
              </label>
              <textarea
                id="stdin"
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                rows={4}
                spellCheck={false}
                className="code-area w-full resize-y border border-outline-variant bg-surface-container-lowest p-3"
              />
            </section>
          )}

          <section aria-live="polite" aria-busy={running} className="pixel-box min-h-48 space-y-4 p-4">
            <h2 className="text-headline-md">ผลลัพธ์</h2>
            {running && <p className="pixel-blink pixel-font text-primary-container">RUNNING...</p>}
            {!running && !result && <p className="text-on-surface-variant">กดรันเพื่อดูผลลัพธ์</p>}
            {result?.kind === "error" && (
              <p role="alert" className="bg-error-container p-3 text-on-error-container">
                {result.message}
              </p>
            )}
            {result?.kind === "html" && (
              <iframe
                title="ผลลัพธ์ HTML"
                sandbox="allow-scripts"
                srcDoc={result.html}
                className="h-80 w-full border border-outline-variant bg-white"
              />
            )}
            {result?.kind === "outcome" && <Outcome outcome={result.outcome} />}
          </section>
        </div>
      </div>
    </div>
  );
}

function Outcome({ outcome }: { outcome: RunOutcome }) {
  const ok = outcome.status === "OK";
  return (
    <>
      <p className="flex flex-wrap items-center gap-3">
        <span className={`pixel-button px-3 py-1 font-bold ${ok ? "bg-success text-white" : "bg-error text-white"}`}>
          {STATUS_LABELS[outcome.status] ?? outcome.status}
        </span>
        <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
          <Clock3 aria-hidden className="size-4" />
          {outcome.timeMs.toLocaleString("th-TH")} ms
        </span>
        {outcome.exitCode !== null && outcome.exitCode !== 0 && (
          <span className="text-label-md text-on-surface-variant">exit code {outcome.exitCode}</span>
        )}
      </p>
      <OutputBlock title="ผลการคอมไพล์" text={outcome.compileOutput} tone={outcome.status === "COMPILE_ERROR" ? "error" : undefined} />
      <OutputBlock title="stdout" text={outcome.stdout} />
      <OutputBlock title="stderr" text={outcome.stderr} tone="error" />
      {ok && !outcome.stdout && !outcome.stderr && <p className="text-on-surface-variant">โปรแกรมทำงานจบโดยไม่พิมพ์อะไรออกมา</p>}
      {outcome.truncated && <p className="text-label-md text-on-surface-variant">ผลลัพธ์ยาวเกิน 64 KB แสดงเฉพาะส่วนแรก</p>}
    </>
  );
}

export type { Language };
