"use client";

import {
  ArrowLeft,
  Code2,
  Gamepad2,
  House,
  Languages,
  LogIn,
  LogOut,
  Swords,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiRequest, renewSession } from "@/lib/api";
import type { components } from "@/lib/api-schema";

/** เว็บพอร์ทัลกลาง — ปุ่ม "ระบบอื่นใน CSMJU2030" (ui-design-system.md ข้อ 5.1) */
const CORE_HUB_WEB_URL = (
  process.env.NEXT_PUBLIC_CORE_HUB_WEB_URL ?? "https://csmju2030.jowave.com"
).replace(/\/+$/, "");

type ShellProfile = components["schemas"]["MeDto"];

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** core role ที่เห็นเมนูนี้ · ไม่ระบุ = ทุกคนที่ล็อกอินแล้ว */
  roles?: string[];
}

const NAV: NavItem[] = [
  { href: "/", label: "ล็อบบี้", icon: House },
  { href: "/student", label: "ประลอง 1 ต่อ 1", icon: Swords, roles: ["student"] },
  { href: "/playground", label: "คอมไพเลอร์ออนไลน์", icon: Code2 },
  { href: "/languages", label: "ภาษาทั้งหมด", icon: Languages },
  { href: "/teacher/problems", label: "จัดการโจทย์", icon: Gamepad2, roles: ["lecturer"] },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * โครงหน้าจอแบบเดียวกับ CS Nexus / CS Canvas / CS Toolboxes:
 * แถบซ้ายสีน้ำเงิน Core Hub 72px ขยายเมื่อชี้ · มือถือมีแถบล่าง · ออกจากระบบด้วยฟอร์ม POST
 */
export function CsmjuAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [profile, setProfile] = useState<ShellProfile | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<ShellProfile>("/api/v1/me")
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  // ต่ออายุผ่าน Core Hub ก่อน token หมด 1 นาที (token 15 นาที)
  useEffect(() => {
    const expiresAt = profile?.session.expiresAt;
    if (!expiresAt) return;
    const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now() - 60000);
    const timer = window.setTimeout(renewSession, delay);
    return () => window.clearTimeout(timer);
  }, [profile]);

  const items = profile
    ? NAV.filter((item) => !item.roles || item.roles.includes(profile.coreRole))
    : NAV.slice(0, 1);

  return (
    <div className="flex min-h-dvh w-full bg-background text-on-surface">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface-container-lowest p-4 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <div className="sticky top-0 z-40 hidden h-dvh w-18 shrink-0 md:block">
        <nav
          aria-label="เมนูหลัก"
          className="csmju-rail absolute inset-y-0 left-0 flex flex-col gap-1 px-3"
        >
          <Link href="/" aria-label="Coding Arena หน้าแรก" className="csmju-rail-item csmju-rail-brand">
            <span className="csmju-logo-badge size-9 shrink-0 p-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- ไฟล์เล็กใน public ไม่ต้องผ่านตัวย่อรูป */}
              <img src="/csmju-mark.png" alt="" width={32} height={32} className="size-8 rounded-full object-contain" />
            </span>
            <span className="csmju-rail-label pixel-font text-lg text-white">CODING ARENA</span>
          </Link>

          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                data-active={active}
                className="csmju-rail-item"
              >
                <item.icon aria-hidden className="size-6 shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                <span className="csmju-rail-label">{item.label}</span>
              </Link>
            );
          })}

          <div className="mt-auto flex flex-col gap-1 pb-3">
            {/* อีก origin จึงใช้ <a> */}
            <a href={CORE_HUB_WEB_URL} aria-label="กลับ CSMJU Portal" className="csmju-rail-item">
              <ArrowLeft aria-hidden className="size-6 shrink-0" strokeWidth={1.9} />
              <span className="csmju-rail-label">ระบบอื่นใน CSMJU2030</span>
            </a>
            <AccountButton profile={profile} placement="rail" />
          </div>
        </nav>
      </div>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 md:p-10" id="main" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav
        aria-label="เมนูหลัก (มือถือ)"
        className="brand-gradient fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around px-1 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-label-sm ${active ? "text-white" : "text-white/70"}`}
            >
              <item.icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 1.9} />
              <span className="max-w-20 truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <AccountButton profile={profile} placement="bar" />
      </nav>
    </div>
  );
}

function AccountButton({
  profile,
  placement,
}: {
  profile: ShellProfile | null;
  placement: "rail" | "bar";
}) {
  const railClass = "csmju-rail-item";
  const barClass =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-label-sm text-white/70";

  if (!profile) {
    return (
      <a href="/auth/login?next=%2F" className={placement === "rail" ? railClass : barClass}>
        <LogIn aria-hidden className={placement === "rail" ? "size-6 shrink-0" : "size-5"} />
        <span className={placement === "rail" ? "csmju-rail-label" : ""}>เข้าสู่ระบบ</span>
      </a>
    );
  }

  const role = profile.coreRole === "lecturer" ? "อาจารย์" : "นักศึกษา";

  // ไม่มีชื่อหรืออีเมลในหน้าจอ — ระบบนี้ไม่เก็บข้อมูลบุคคล แสดงแค่บทบาท
  return (
    <form action="/auth/logout" method="POST" className={placement === "bar" ? "flex flex-1" : ""}>
      <button type="submit" className={placement === "rail" ? railClass : barClass} aria-label={`ออกจากระบบ (${role})`}>
        <LogOut aria-hidden className={placement === "rail" ? "size-6 shrink-0" : "size-5"} />
        <span className={placement === "rail" ? "csmju-rail-label" : ""}>
          {placement === "rail" ? `ออกจากระบบ · ${role}` : "ออก"}
        </span>
      </button>
    </form>
  );
}
