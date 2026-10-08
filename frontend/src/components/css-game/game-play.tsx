"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CssGame } from "@/components/css-game/css-game";
import { GAMES, XP_PER_LEVEL } from "@/lib/css-games/games";
import { useLevelClears } from "@/lib/css-games/progress";
import type { GameId, Level } from "@/lib/css-games/types";

export function GamePlay({ gameId }: { gameId: GameId }) {
  const game = GAMES[gameId];
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { clears, record, error } = useLevelClears();
  const requested = Number(params.get("level") ?? 1);
  const index = Number.isInteger(requested) && requested >= 1 && requested <= game.levels.length ? requested - 1 : 0;
  const cleared = clears[gameId];

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= game.levels.length) return;
      router.replace(`${pathname}?level=${next + 1}`, { scroll: false });
    },
    [game.levels.length, pathname, router],
  );
  const onClear = useCallback((level: Level) => record(gameId, level.id), [gameId, record]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/games" className="inline-flex min-h-10 items-center gap-1 text-label-md text-primary-container hover:underline">
            <ArrowLeft aria-hidden className="size-4" />
            เกมทั้งหมด
          </Link>
          <h1 className="pixel-font text-headline-lg text-brand-navy">{game.title.toUpperCase()}</h1>
        </div>
        <p className="pixel-box px-4 py-2 text-label-md">
          ผ่านแล้ว {cleared.size}/{game.levels.length} ด่าน · <span className="font-bold text-primary-container">{cleared.size * XP_PER_LEVEL} XP</span>
        </p>
      </header>
      {error && (
        <p role="alert" className="bg-error-container p-3 text-on-error-container">
          {error}
        </p>
      )}
      <CssGame game={game} levelIndex={index} onLevelChange={go} cleared={cleared} onClear={onClear} />
    </div>
  );
}
