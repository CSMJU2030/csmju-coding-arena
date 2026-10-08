import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MATCHES_ENABLED } from "@/lib/features";

/** ส่วนนี้ใช้ตัวตรวจโค้ดบน server — ปิดอยู่จนกว่า PM อนุมัติ sandbox (lib/features.ts) */
export default function GatedLayout({ children }: { children: ReactNode }) {
  if (!MATCHES_ENABLED) redirect("/");
  return children;
}
