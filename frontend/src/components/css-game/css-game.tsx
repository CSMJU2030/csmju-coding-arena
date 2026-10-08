"use client";

import { Check, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Sword, Trophy } from "lucide-react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatDeclarations, parseDeclarations, toStyle } from "@/lib/css-games/parse";
import { sprite, type SpriteName } from "@/lib/css-games/sprites";
import type { Declarations, GameMeta, Level, Unit } from "@/lib/css-games/types";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BOARD = {
  flexbox: { width: 480, height: 360 },
  grid: { width: 400, height: 400 },
} as const;

const TOLERANCE = 1.5;

function same(a: Rect, b: Rect) {
  return Math.abs(a.x - b.x) <= TOLERANCE && Math.abs(a.y - b.y) <= TOLERANCE && Math.abs(a.w - b.w) <= TOLERANCE && Math.abs(a.h - b.h) <= TOLERANCE;
}

function measure(field: HTMLElement | null): Rect[] {
  if (!field) return [];
  return [...field.children].map((el) => {
    const node = el as HTMLElement;
    return { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight };
  });
}

/** ข้อความบทเรียน: `โค้ด` และ **ตัวหนา** */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") ? (
          <code key={i} className="code-area bg-brand-navy/10 px-1 text-label-md text-brand-navy">
            {part.slice(1, -1)}
          </code>
        ) : part.startsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function unitStyle(game: GameMeta["id"], unit: Unit, extra?: Declarations): CSSProperties {
  const size: CSSProperties = game === "flexbox" ? { width: 56, height: 56, margin: 6, flexShrink: 0 } : { minWidth: 0, minHeight: 0 };
  return { ...size, ...toStyle(unit.style ?? {}), ...toStyle(extra ?? {}) };
}

function UnitView({ unit }: { unit: Unit }) {
  if (unit.kind === "attack") {
    return (
      <span className="grid size-full place-items-center border-4 border-error bg-error/35 text-white">
        <Sword aria-hidden className="size-6 drop-shadow" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- data URL ที่วาดในเครื่อง
  return <img src={sprite(unit.kind as SpriteName)} alt="" className="pixel-canvas size-full object-contain" draggable={false} />;
}

export function CssGame({
  game,
  levelIndex,
  onLevelChange,
  cleared,
  onClear,
}: {
  game: GameMeta;
  levelIndex: number;
  onLevelChange: (index: number) => void;
  cleared: Set<number>;
  onClear: (level: Level) => void;
}) {
  const level = game.levels[levelIndex];
  const board = BOARD[game.id];
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [targets, setTargets] = useState<Rect[]>([]);
  const [solved, setSolved] = useState(false);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const previous = useRef<Rect[]>([]);
  const reported = useRef<Set<number>>(new Set());

  const input = inputs[level.id] ?? "";
  const parsed = useMemo(() => parseDeclarations(input), [input]);

  const containerStyle = toStyle({ ...level.base, ...(level.edit === "container" ? parsed.declarations : {}) });
  const ghostContainerStyle = toStyle({ ...level.base, ...(level.edit === "container" ? level.solution : {}) });
  const isTarget = (unit: Unit) => level.edit === "unit" && unit.kind === level.targetKind;

  // ย่อกระดานให้พอดีจอ (มือถือ) — ตำแหน่งที่ใช้ตรวจวัดก่อนย่อ จึงไม่กระทบผล
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / board.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [board.width]);

  // ตำแหน่งเป้าหมาย = ตำแหน่งของตัวละครในชั้นเงาคำตอบ
  useLayoutEffect(() => {
    const next = measure(ghostRef.current);
    setTargets(next);
    previous.current = measure(fieldRef.current);
    setSolved(false);
    setShowHint(false);
  }, [level]);

  // ตรวจผลและเล่นแอนิเมชันเดินแบบพิกเซล (steps) ทุกครั้งที่ CSS เปลี่ยน
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const now = measure(field);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    [...field.children].forEach((el, i) => {
      const before = previous.current[i];
      const after = now[i];
      if (!before || !after || reduce) return;
      const dx = before.x - after.x;
      const dy = before.y - after.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      (el as HTMLElement).animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
        duration: 480,
        easing: "steps(8, end)",
      });
    });
    previous.current = now;
    const ghost = measure(ghostRef.current);
    const ok = ghost.length === now.length && ghost.every((rect, i) => same(rect, now[i]));
    setSolved(ok);
  }, [input, level]);

  useEffect(() => {
    if (solved && !reported.current.has(level.id)) {
      reported.current.add(level.id);
      onClear(level);
    }
  }, [solved, level, onClear]);

  const setInput = useCallback((value: string) => setInputs((all) => ({ ...all, [level.id]: value })), [level.id]);

  const slimeCells = useMemo(() => {
    if (game.id !== "grid" || level.edit !== "unit") return [];
    const idx = level.units.findIndex((u) => u.kind === "attack");
    const rect = targets[idx];
    if (!rect) return [];
    const cell = board.width / 5;
    const cells: Rect[] = [];
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 5; col++) {
        const cx = col * cell + cell / 2;
        const cy = row * cell + cell / 2;
        if (cx > rect.x && cx < rect.x + rect.w && cy > rect.y && cy < rect.y + rect.h) cells.push({ x: col * cell, y: row * cell, w: cell, h: cell });
      }
    return cells;
  }, [board.width, game.id, level, targets]);

  const fixedLines = level.fixed ? formatDeclarations(level.fixed) : [];

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      {/* ---------- ฝั่งบทเรียน + โค้ด ---------- */}
      <section aria-labelledby="level-title" className="pixel-box flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onLevelChange(levelIndex - 1)}
            disabled={levelIndex === 0}
            aria-label="ด่านก่อนหน้า"
            className="pixel-button grid size-11 place-items-center bg-surface-container-high disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <p className="pixel-font text-label-md text-primary-container">
            LEVEL {level.id} / {game.levels.length}
          </p>
          <button
            type="button"
            onClick={() => onLevelChange(levelIndex + 1)}
            disabled={levelIndex === game.levels.length - 1}
            aria-label="ด่านถัดไป"
            className="pixel-button grid size-11 place-items-center bg-surface-container-high disabled:opacity-40"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        <div>
          <h2 id="level-title" className="text-headline-md text-on-surface">
            {level.title}
          </h2>
          <p className="mt-1 text-body-md italic text-on-surface-variant">{level.story}</p>
        </div>

        <ul className="space-y-2 text-body-md text-on-surface">
          {level.lesson.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="mt-2 size-2 shrink-0 bg-brand-amber" />
              <span>
                <Rich text={line} />
              </span>
            </li>
          ))}
        </ul>

        <div className="bg-brand-navy p-4 text-white">
          <label htmlFor="css-input" className="sr-only">
            CSS ของ {level.selector}
          </label>
          <pre className="code-area text-white/60">{`${level.selector} {`}</pre>
          {fixedLines.map((line) => (
            <pre key={line} className="code-area pl-6 text-white/45">
              {line}
            </pre>
          ))}
          <div className="pl-6">
          <textarea
            id="css-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={level.lines}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="พิมพ์ CSS ที่นี่"
            className="code-area block w-full resize-none bg-white/10 p-2 text-white caret-brand-amber outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-brand-amber"
          />
          </div>
          <pre className="code-area text-white/60">{"}"}</pre>
        </div>

        {parsed.problems.length > 0 && (
          <ul className="space-y-1 text-label-md text-error" aria-live="polite">
            {parsed.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onLevelChange(levelIndex + 1)}
            disabled={!solved || levelIndex === game.levels.length - 1}
            className={`pixel-button inline-flex min-h-11 items-center gap-2 px-5 font-bold ${solved ? "bg-success text-white" : "bg-surface-container-high text-on-surface-variant"} disabled:cursor-not-allowed`}
          >
            {solved ? <Check aria-hidden className="size-5" /> : null}
            {solved ? (levelIndex === game.levels.length - 1 ? "ผ่านครบทุกด่านแล้ว" : "ไปด่านต่อไป") : "ยังไม่ผ่าน — พาตัวละครไปที่เป้าหมาย"}
          </button>
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            aria-expanded={showHint}
            className="pixel-button inline-flex min-h-11 items-center gap-2 bg-brand-amber/30 px-4 text-on-surface"
          >
            <Lightbulb aria-hidden className="size-4" />
            คำใบ้
          </button>
          <button type="button" onClick={() => setInput("")} className="pixel-button inline-flex min-h-11 items-center gap-2 bg-surface-container-high px-4">
            <RotateCcw aria-hidden className="size-4" />
            ล้างโค้ด
          </button>
        </div>
        {showHint && <p className="bg-brand-amber/20 p-3 text-body-md">{level.hint}</p>}
        <p className="text-label-md text-on-surface-variant">ตอบได้หลายแบบ — ระบบเทียบตำแหน่งจริงที่เบราว์เซอร์จัดวาง ขอแค่ตัวละครไปถึงเป้าหมาย</p>
      </section>

      {/* ---------- กระดาน ---------- */}
      <section aria-label="กระดานเกม" className="flex flex-col gap-4">
        <div ref={wrapRef} className="w-full">
          <div className="pixel-box-dark relative mx-auto overflow-hidden" style={{ width: board.width * scale, height: board.height * scale }}>
            <div className="game-floor absolute left-0 top-0 origin-top-left" style={{ width: board.width, height: board.height, transform: `scale(${scale})` }}>
              {/* เส้นกริดของสนาม Grid Attack */}
              {game.id === "grid" && level.edit === "unit" && (
                <div aria-hidden className="absolute inset-0 grid grid-cols-5 grid-rows-5">
                  {Array.from({ length: 25 }, (_, i) => (
                    <span key={i} className="border border-dashed border-white/15" />
                  ))}
                </div>
              )}

              {/* เป้าหมาย */}
              <div aria-hidden className="absolute inset-0">
                {slimeCells.map((c, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL ที่วาดในเครื่อง
                  <img key={i} src={sprite("slime")} alt="" className="pixel-canvas absolute p-2" style={{ left: c.x, top: c.y, width: c.w, height: c.h }} />
                ))}
                {!slimeCells.length &&
                  targets.map((rect, i) => {
                    const unit = level.units[i];
                    if (!unit || unit.kind === "attack") return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL ที่วาดในเครื่อง
                      <img
                        key={i}
                        src={sprite(`ring-${unit.kind}` as SpriteName)}
                        alt=""
                        className="pixel-canvas absolute opacity-90"
                        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                      />
                    );
                  })}
              </div>

              {/* ชั้นเงาคำตอบ (มองไม่เห็น ใช้วัดตำแหน่ง) */}
              <div ref={ghostRef} aria-hidden className="invisible absolute inset-0" style={ghostContainerStyle}>
                {level.units.map((unit, i) => (
                  <div key={i} style={unitStyle(game.id, unit, isTarget(unit) ? level.solution : undefined)} />
                ))}
              </div>

              {/* ชั้นผู้เล่น */}
              <div ref={fieldRef} className="absolute inset-0" style={containerStyle}>
                {level.units.map((unit, i) => (
                  <div key={i} className="relative" style={unitStyle(game.id, unit, isTarget(unit) ? parsed.declarations : undefined)}>
                    <UnitView unit={unit} />
                  </div>
                ))}
              </div>
            </div>

            {solved && (
              <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
                <p className="pixel-font pixel-box-dark flex items-center gap-2 bg-success px-5 py-3 text-headline-md text-white">
                  <Trophy aria-hidden className="size-6" />
                  LEVEL CLEAR!
                </p>
              </div>
            )}
          </div>
        </div>

        <nav aria-label="เลือกด่าน" className="flex flex-wrap gap-2">
          {game.levels.map((l, i) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onLevelChange(i)}
              aria-current={i === levelIndex ? "step" : undefined}
              aria-label={`ด่าน ${l.id}${cleared.has(l.id) ? " (ผ่านแล้ว)" : ""}`}
              className={`pixel-button grid size-10 place-items-center text-label-md font-bold ${
                i === levelIndex ? "bg-brand-navy text-white" : cleared.has(l.id) ? "bg-success text-white" : "bg-surface-container-high text-on-surface"
              }`}
            >
              {cleared.has(l.id) && i !== levelIndex ? <Check aria-hidden className="size-4" /> : l.id}
            </button>
          ))}
        </nav>
      </section>
    </div>
  );
}

