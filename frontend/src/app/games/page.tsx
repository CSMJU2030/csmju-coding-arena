import type { Metadata } from "next";
import { GamesHub } from "@/components/css-game/games-hub";

export const metadata: Metadata = { title: "เกม CSS · Coding Arena" };

export default function GamesPage() {
  return <GamesHub />;
}
