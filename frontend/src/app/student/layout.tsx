export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MATCHES_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  title: "สนามแข่งขัน · Coding Arena · CSMJU",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  // ประลอง 1 ต่อ 1 ปิดอยู่จนกว่า PM อนุมัติ sandbox (lib/features.ts)
  if (!MATCHES_ENABLED) redirect("/");
  return children;
}
