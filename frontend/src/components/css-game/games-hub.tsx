"use client";

import { Grid3x3, Play, Rows3 } from "lucide-react";
import Link from "next/link";
import { ErrorState, LoadingState } from "@/components/ui";
import { GAMES, XP_PER_LEVEL } from "@/lib/css-games/games";
import { useLevelClears } from "@/lib/css-games/progress";
import { sprite } from "@/lib/css-games/sprites";

const ICONS = { flexbox: Rows3, grid: Grid3x3 };
const HEROES = { flexbox: ["knight", "mage", "archer"] as const, grid: ["slime", "slime", "ally"] as const };

export function GamesHub() {
  const { clears, error, loading } = useLevelClears();

  if (loading) return <LoadingState label="กำลังโหลดความคืบหน้า..." />;
  if (error && !clears.flexbox.size && !clears.grid.size) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const total = clears.flexbox.size + clears.grid.size;

  return (
    <div className="space-y-8">
      <header className="pixel-box-dark space-y-3 p-6 md:p-10">
        <p className="pixel-font text-label-md text-brand-amber">CSS QUEST</p>
        <h1 className="pixel-font text-headline-lg md:text-display-lg">เรียน CSS ด้วยการเล่นเกม</h1>
        <p className="max-w-2xl text-body-lg text-white/85">
          พิมพ์ CSS จริงเพื่อบังคับตัวละคร — เบราว์เซอร์จัดวางให้เห็นผลทันที ผ่านด่านละ {XP_PER_LEVEL} XP
        </p>
        <p className="pixel-font text-headline-md text-brand-amber">TOTAL XP: {total * XP_PER_LEVEL}</p>
      </header>

      <ul className="grid gap-8 lg:grid-cols-2">
        {(Object.keys(GAMES) as (keyof typeof GAMES)[]).map((id) => {
          const game = GAMES[id];
          const Icon = ICONS[id];
          const done = clears[id].size;
          const next = Math.min(done + 1, game.levels.length);
          const firstOpen = game.levels.find((l) => !clears[id].has(l.id))?.id ?? next;
          return (
            <li key={id}>
              <article className="pixel-box flex h-full flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="pixel-button grid size-14 place-items-center bg-brand-navy text-white">
                    <Icon aria-hidden className="size-7" />
                  </span>
                  <h2 className="pixel-font text-headline-md text-brand-navy">{game.title}</h2>
                </div>
                <div aria-hidden className="game-floor flex h-28 items-end justify-around px-6 pb-3">
                  {HEROES[id].map((name, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL ที่วาดในเครื่อง
                    <img key={i} src={sprite(name)} alt="" className="pixel-canvas size-16" />
                  ))}
                </div>
                <p className="text-body-md text-on-surface-variant">{game.tagline}</p>
                <div>
                  <div className="flex justify-between text-label-md">
                    <span>ความคืบหน้า</span>
                    <span>
                      {done}/{game.levels.length} ด่าน
                    </span>
                  </div>
                  <div className="mt-1 h-4 bg-surface-container-high" role="progressbar" aria-valuemin={0} aria-valuemax={game.levels.length} aria-valuenow={done} aria-label={`ความคืบหน้า ${game.title}`}>
                    <div className="h-full bg-success" style={{ width: `${(done / game.levels.length) * 100}%` }} />
                  </div>
                </div>
                <Link href={`/games/${id}?level=${firstOpen}`} className="pixel-button mt-auto inline-flex min-h-12 w-fit items-center gap-2 bg-brand-amber px-6 font-bold text-brand-navy">
                  <Play aria-hidden className="size-5" />
                  {done === 0 ? "เริ่มเล่น" : done === game.levels.length ? "เล่นอีกครั้ง" : `เล่นต่อ ด่าน ${firstOpen}`}
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
