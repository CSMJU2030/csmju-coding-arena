"use client";

import { Cpu, Globe, Play, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { CATEGORY_LABELS, CATEGORY_ORDER, useLanguages } from "@/lib/languages";

/** หน้ารวมภาษา (แบบหน้ารวมเครื่องมือของ CS Toolboxes) — กดการ์ดแล้วเปิดในคอมไพเลอร์พร้อมโค้ดตัวอย่าง */
export function LanguageDirectory() {
  const { languages, error, loading } = useLanguages();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  if (loading) return <LoadingState label="กำลังโหลดรายชื่อภาษา..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const q = query.trim().toLowerCase();
  const filtered = languages.filter(
    (l) =>
      (!category || l.category === category) &&
      (!q || l.name.toLowerCase().includes(q) || l.id.includes(q) || l.extension.includes(q)),
  );
  const counts = new Map<string, number>();
  for (const l of languages) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <header>
        <p className="pixel-font text-label-md text-primary-container">SELECT YOUR LANGUAGE</p>
        <h1 className="text-headline-lg">ภาษาทั้งหมด {languages.length} ภาษา</h1>
        <p className="text-body-md text-on-surface-variant">
          ทุกภาษามีโค้ดตัวอย่างที่ทดสอบรันแล้ว — ภาษาเว็บรันในเบราว์เซอร์ของคุณ ภาษาอื่นรันใน sandbox ที่ตัดเน็ตและจำกัดทรัพยากร
        </p>
      </header>

      <div className="relative max-w-xl">
        <label htmlFor="language-search" className="sr-only">
          ค้นหาภาษา
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-on-surface-variant" />
        <input
          id="language-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="พิมพ์ชื่อภาษา เช่น rust, cobol, scheme"
          className="min-h-12 w-full border-2 border-brand-navy bg-surface-container-lowest pl-11 pr-4 text-body-md"
        />
      </div>

      <nav aria-label="กลุ่มภาษา" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
          className={`pixel-button min-h-10 px-3 text-label-md ${category === null ? "bg-brand-navy text-white" : "bg-surface-container-high"}`}
        >
          ทั้งหมด {languages.length}
        </button>
        {CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(category === c ? null : c)}
            className={`pixel-button min-h-10 px-3 text-label-md ${category === c ? "bg-brand-navy text-white" : "bg-surface-container-high"}`}
          >
            {CATEGORY_LABELS[c]} {counts.get(c)}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <EmptyState title="ไม่พบภาษาที่ค้นหา" description="ลองพิมพ์คำอื่น หรือดูทุกกลุ่ม">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(null);
            }}
            className="pixel-button min-h-11 bg-brand-navy px-4 text-white"
          >
            แสดงทุกภาษา
          </button>
        </EmptyState>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((l) => (
            <li key={l.id}>
              <Link href={`/playground?lang=${encodeURIComponent(l.id)}`} className="pixel-box flex h-full flex-col gap-2 p-4 transition-transform hover:-translate-y-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-body-lg font-semibold text-on-surface">{l.name}</span>
                  <span className="code-area shrink-0 bg-surface-container-high px-1.5 text-label-sm">.{l.extension}</span>
                </span>
                <span className="text-label-md text-on-surface-variant">{CATEGORY_LABELS[l.category] ?? l.category}</span>
                <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    {l.runtime === "browser" ? <Globe aria-hidden className="size-4" /> : <Cpu aria-hidden className="size-4" />}
                    {l.runtime === "browser" ? "รันในเบราว์เซอร์" : l.compiled ? "คอมไพล์" : "อินเทอร์พรีเตอร์"}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-primary-container">
                    <Play aria-hidden className="size-4" />
                    ลองรัน
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
