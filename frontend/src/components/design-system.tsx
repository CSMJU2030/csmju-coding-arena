"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiRequest, renewSession } from "@/lib/api";
import type { components } from "@/lib/api-schema";

const navigation = [
  {
    href: "/student",
    label: "สนามแข่งขัน",
    labelEn: "Arena",
    icon: "home",
    role: "student",
  },
  {
    href: "/teacher/problems",
    label: "จัดการโจทย์",
    labelEn: "Problems",
    icon: "code",
    role: "lecturer",
  },
];

type ShellProfile = components["schemas"]["MeDto"];

function NavigationIcon({ name }: { name: string }) {
  const commonProps = {
    "aria-hidden": true as const,
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (name === "home") {
    return (
      <svg {...commonProps}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />
    </svg>
  );
}

export function CsmjuAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [navOpen, setNavOpen] = useState(false);
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const expiresAt = profile?.session.expiresAt;
    if (!expiresAt) return;
    const delay = Math.max(
      0,
      new Date(expiresAt).getTime() - Date.now() - 60000,
    );
    const timer = window.setTimeout(renewSession, delay);
    return () => window.clearTimeout(timer);
  }, [profile]);

  useEffect(() => {
    if (!navOpen) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 768px)");
    if (desktop.matches) return;
    const content = contentRef.current;
    document.body.style.overflow = "hidden";
    if (content) content.inert = true;
    const focusable = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const closeOnDesktop = () => {
      if (desktop.matches) setNavOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      if (content) content.inert = false;
      previousFocus?.focus();
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-dvh w-full bg-background text-on-surface">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface-container-lowest p-4 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      {navOpen && (
        <button
          aria-label="ปิดเมนู"
          className="fixed inset-0 z-20 bg-on-surface/40 md:hidden"
          onClick={() => setNavOpen(false)}
          type="button"
        />
      )}

      <aside
        ref={drawerRef}
        aria-label="เมนูระบบ"
        className={`brand-gradient fixed inset-y-0 left-0 z-30 flex h-dvh w-64 flex-col py-4 shadow-xl transition-transform duration-300 ease-out md:visible md:translate-x-0 ${
          navOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
        id="main-navigation"
      >
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={() => setNavOpen(false)}
          className="ml-auto mr-4 min-h-11 min-w-11 rounded-lg text-on-primary focus-visible:outline-2 focus-visible:outline-on-primary md:hidden"
        >
          ×
        </button>
        <div className="mb-8 px-4 pt-4">
          <Link
            className="flex min-h-24 items-center justify-center rounded-xl bg-on-primary p-4 text-center shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
            href="/"
            onClick={() => setNavOpen(false)}
          >
            <Image
              src="/csmju-logo.png"
              alt="โลโก้สาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้"
              width={240}
              height={170}
              priority
              className="h-auto w-full max-w-[120px] object-contain"
            />
          </Link>
        </div>

        <nav aria-label="เมนูหลัก" className="flex-1">
          <ul className="space-y-1">
            {navigation
              .filter(({ role }) => profile?.coreRole === role)
              .map(({ href, label, labelEn, icon }) => {
                const active =
                  href === "/" ? pathname === href : pathname.startsWith(href);

                return (
                  <li key={href}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 py-3 text-on-primary transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-on-primary ${
                        active
                          ? "border-l-4 border-accent bg-on-primary/10 pl-6"
                          : "pl-7 text-on-primary/70 hover:bg-on-primary/5 hover:text-on-primary"
                      }`}
                      href={href}
                      onClick={() => setNavOpen(false)}
                    >
                      <NavigationIcon name={icon} />
                      <span className="text-label-md">{label}</span>
                      <span className="text-caption text-on-primary/50">
                        {labelEn}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>
        {profile && (
          <form action="/auth/logout" method="POST" className="px-4 pt-4">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-on-primary/25 bg-on-primary/10 px-4 py-3 text-label-md text-on-primary backdrop-blur-sm transition-colors hover:bg-on-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
              </svg>
              ออกจากระบบ
            </button>
          </form>
        )}
      </aside>

      <div
        ref={contentRef}
        className="ml-0 flex min-h-dvh min-w-0 flex-1 flex-col md:ml-64"
      >
        <header className="sticky top-0 z-10 flex min-h-16 w-full items-center justify-between gap-4 border-b border-surface-variant bg-surface-container-lowest px-4 shadow-sm md:px-12">
          <div className="flex items-center gap-2 md:hidden">
            <button
              aria-controls="main-navigation"
              aria-expanded={navOpen}
              aria-label={navOpen ? "ปิดเมนู" : "เปิดเมนู"}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-variant/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
              onClick={() => setNavOpen((open) => !open)}
              type="button"
            >
              {navOpen ? (
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <span className="text-primary-container font-display text-label-md sm:text-headline-md">
              Coding Arena
            </span>
          </div>

          <Link
            href="/"
            className="hidden min-h-11 items-center text-primary-container font-display text-headline-md focus-visible:outline-2 focus-visible:outline-primary-container md:flex"
          >
            Coding Arena
          </Link>

          {profile ? (
            <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-full p-1 text-on-surface-variant">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/50 bg-primary-container font-display text-label-md text-on-primary shadow-sm">
                {profile.coreRole === "lecturer" ? "อ." : "น."}
              </span>
              <div className="hidden min-w-0 pr-2 sm:block">
                <p className="max-w-48 truncate text-label-md text-on-surface">
                  {profile.coreRole === "lecturer"
                    ? "อาจารย์"
                    : "ผู้เข้าแข่งขัน"}
                </p>
                <p className="mt-1 text-label-sm">
                  {profile.coreRole === "lecturer"
                    ? "บุคลากร/อาจารย์"
                    : "นักศึกษา"}
                </p>
              </div>
            </div>
          ) : (
            <Link
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-label-md text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
              href="/auth/login?next=%2F"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </header>

        <main
          className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 md:p-12"
          id="main"
          tabIndex={-1}
        >
          {children}
        </main>

        <footer className="mt-auto w-full border-t border-outline-variant/30 bg-surface-container-low py-6">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-12">
            <p className="text-body-md text-on-surface-variant">
              CSMJU2030 · Coding Arena
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
