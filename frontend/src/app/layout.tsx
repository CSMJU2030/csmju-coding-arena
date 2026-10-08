import type { Metadata } from "next";
import localFont from "next/font/local";
import { CsmjuAppShell } from "@/components/design-system";
import "./globals.css";

// ฟอนต์อยู่ใน repo (app/fonts · สัญญาอนุญาต OFL แนบข้างไฟล์) — next/font/google ดาวน์โหลดตอน build
// ทำให้ build บน CI ที่ไม่มีเน็ตล้ม (บทเรียนจาก csmju-nexus) · ชุดเดียวกับ Core Hub / nexus / canvas / toolboxes
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.ttf",
  variable: "--font-jakarta",
  weight: "200 800",
});

const notoSansThai = localFont({
  src: "./fonts/NotoSansThai-Variable.ttf",
  variable: "--font-noto-thai",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Coding Arena · CSMJU",
  description:
    "สนามฝึกเขียนโปรแกรมสำหรับนักศึกษา สาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${jakarta.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-body text-body-md text-on-surface">
        <CsmjuAppShell>{children}</CsmjuAppShell>
      </body>
    </html>
  );
}
