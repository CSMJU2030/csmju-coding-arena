import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GamePlay } from "@/components/css-game/game-play";
import { LoadingState } from "@/components/ui";
import { GAMES } from "@/lib/css-games/games";

type Props = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = GAMES[(await params).game as keyof typeof GAMES];
  return { title: game ? `${game.title} · Coding Arena` : "ไม่พบเกม" };
}

export default async function GamePage({ params }: Props) {
  const { game } = await params;
  if (!(game in GAMES)) notFound();
  return (
    <Suspense fallback={<LoadingState label="กำลังโหลดเกม..." />}>
      <GamePlay gameId={game as keyof typeof GAMES} />
    </Suspense>
  );
}
