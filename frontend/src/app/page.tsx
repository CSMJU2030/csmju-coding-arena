"use client";

import { Code2, Gamepad2, Swords, Trophy, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PixelScene } from "@/components/pixel-scene";
import { ErrorState, LoadingState } from "@/components/ui";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { MATCHES_ENABLED } from "@/lib/features";
import { canManage, canPlay, type RoleProfile } from "@/lib/roles";

type Profile = RoleProfile;

interface Mode {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
  allowed?: (p: Profile) => boolean;
}

type State =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "forbidden" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: Profile };

export default function Lobby() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    apiRequest<Profile>("/api/v1/me")
      .then((profile) => {
        if (active) setState({ status: "ready", profile });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiRequestError && error.status === 401) setState({ status: "guest" });
        else if (error instanceof ApiRequestError && error.status === 403) setState({ status: "forbidden" });
        else setState({ status: "error", message: error instanceof Error ? error.message : "ตรวจสอบบัญชีไม่สำเร็จ" });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") return <LoadingState label="กำลังเปิดประตูสนาม..." />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => window.location.reload()} />;

  const modes: Mode[] = [
    {
      href: "/student",
      title: "ประลอง 1 ต่อ 1",
      detail: "จับคู่กับเพื่อน แก้โจทย์ชุดเดียวกัน ชนะ 2 ใน 3 ข้อ เก็บคะแนน Elo ไต่อันดับ",
      icon: Swords,
      tone: "bg-primary-container text-on-primary",
      allowed: (p) => MATCHES_ENABLED && canPlay(p),
    },
    {
      href: "/games",
      title: "เกม CSS: Flexbox & Grid",
      detail: "Flexbox Adventure 24 ด่าน และ Grid Attack 20 ด่าน — พิมพ์ CSS จริงบังคับฮีโร่พิกเซล เก็บ XP",
      icon: Trophy,
      tone: "bg-success text-white",
    },
    {
      href: "/playground",
      title: "สนามเขียนโค้ด",
      detail: "เขียนและรัน JavaScript หรือทำหน้าเว็บ HTML/CSS ดูผลทันที — รันในเบราว์เซอร์ของคุณ",
      icon: Code2,
      tone: "bg-brand-amber text-brand-navy",
    },
    {
      href: "/teacher/problems",
      title: "จัดการโจทย์",
      detail: "เพิ่ม แก้ไข และปิดโจทย์ พร้อมชุดทดสอบสำหรับการประลอง",
      icon: Gamepad2,
      tone: "bg-primary-container text-on-primary",
      allowed: (p) => MATCHES_ENABLED && canManage(p),
    },
  ];
  const visible =
    state.status === "ready" ? modes.filter((m) => !m.allowed || m.allowed(state.profile)) : [];

  return (
    <div className="space-y-10">
      <section className="pixel-box-dark overflow-hidden">
        <PixelScene />
        <div className="space-y-4 p-6 md:p-10">
          <p className="pixel-font text-label-md text-brand-amber">CSMJU2030 · PRESS START</p>
          <h1 className="pixel-font text-headline-lg md:text-display-lg">CODING ARENA</h1>
          <p className="max-w-2xl text-body-lg text-white/85">
            สนามฝึกเขียนโปรแกรมของสาขาวิทยาการคอมพิวเตอร์ — เล่นเกม CSS เก็บ XP และเขียนโค้ดได้ทันทีในเบราว์เซอร์
          </p>
          {state.status === "guest" && (
            <a href="/auth/login?next=%2F" className="pixel-button inline-flex min-h-12 items-center gap-2 bg-brand-amber px-6 font-bold text-brand-navy">
              <span className="pixel-blink" aria-hidden>
                ▶
              </span>
              เข้าสู่ระบบด้วย Core Hub
            </a>
          )}
          {state.status === "forbidden" && (
            <p role="alert" className="max-w-2xl bg-error-container p-4 text-on-error-container">
              บทบาทของบัญชีนี้ยังไม่ได้รับสิทธิ์ใน Coding Arena — แจ้งผู้ดูแลระบบให้ตรวจ role mapping
            </p>
          )}
        </div>
      </section>

      {visible.length > 0 && (
        <section aria-labelledby="modes">
          <h2 id="modes" className="pixel-font mb-6 text-headline-md text-brand-navy">
            เลือกโหมด
          </h2>
          <ul className="grid gap-8 sm:grid-cols-2">
            {visible.map((mode) => (
              <li key={mode.href}>
                <Link href={mode.href} className="pixel-box flex h-full gap-4 p-5 transition-transform hover:-translate-y-1">
                  <span className={`pixel-button grid size-14 shrink-0 place-items-center ${mode.tone}`}>
                    <mode.icon aria-hidden className="size-7" />
                  </span>
                  <span>
                    <span className="block text-headline-md text-on-surface">{mode.title}</span>
                    <span className="mt-1 block text-body-md text-on-surface-variant">{mode.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
