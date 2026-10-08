"use client";

import type { components } from "@/lib/api-schema";

import { BookOpen, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { ApiRequestError, apiCollection } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTIES, DIFFICULTY_LABELS, ProblemTags } from "@/lib/problem-labels";

type Problem = components["schemas"]["ProblemSummaryDto"];

/** คลังโจทย์: กดเข้าฝึกทีละข้อ (ตรวจทันทีด้วย Python / JavaScript / TypeScript ในเบราว์เซอร์) */
export default function ProblemBankPage() {
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  useEffect(() => {
    apiCollection<Problem>("/api/v1/problems")
      .then(setProblems)
      .catch((e: unknown) => {
        setStatus(e instanceof ApiRequestError ? e.status : 0);
        setError(e instanceof Error ? e.message : "โหลดคลังโจทย์ไม่สำเร็จ");
      });
  }, []);

  const shown = useMemo(
    () =>
      (problems ?? []).filter(
        (p) => (!category || p.category === category) && (!difficulty || p.difficulty === difficulty),
      ),
    [problems, category, difficulty],
  );

  if (error)
    return (
      <ErrorState
        message={error}
        loginHref={status === 401 ? "/auth/login?next=%2Fproblems" : undefined}
        onRetry={status === 403 ? undefined : () => window.location.reload()}
      />
    );
  if (!problems) return <LoadingState label="กำลังโหลดคลังโจทย์..." />;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="ฝึกก่อนลงสนาม"
        title="คลังโจทย์"
        description={`โจทย์ ${problems.length} ข้อ แบ่งตามหมวดและระดับ เลือกข้อแล้วเขียนคำตอบด้วย Python, JavaScript หรือ TypeScript ระบบตรวจกับชุดทดสอบทันที`}
      />

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4">
        <div>
          <label htmlFor="filter-category" className="mb-1 block text-label-md">
            หมวด
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 min-w-44 border-2 border-brand-navy bg-surface-container-lowest px-3 text-body-md"
          >
            <option value="">ทุกหมวด</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]} ({problems.filter((p) => p.category === value).length})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-difficulty" className="mb-1 block text-label-md">
            ระดับ
          </label>
          <select
            id="filter-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            className="min-h-11 min-w-36 border-2 border-brand-navy bg-surface-container-lowest px-3 text-body-md"
          >
            <option value="">ทุกระดับ</option>
            {DIFFICULTIES.map((value) => (
              <option key={value} value={value}>
                {DIFFICULTY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-label-md text-on-surface-variant" role="status">
          แสดง {shown.length} ข้อ
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="ไม่มีโจทย์ตามตัวกรองนี้" description="ลองเลือกหมวดหรือระดับอื่น">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              setCategory("");
              setDifficulty("");
            }}
          >
            ล้างตัวกรอง
          </button>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((problem) => (
            <li key={problem.id}>
              <Link
                href={`/arena/${problem.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm hover:border-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
              >
                <span className="flex items-start gap-2 text-body-md font-bold text-on-surface">
                  <BookOpen aria-hidden className="mt-1 size-5 shrink-0 text-primary" />
                  {problem.title}
                </span>
                <ProblemTags category={problem.category} difficulty={problem.difficulty} />
                <span className="mt-auto inline-flex items-center gap-1 text-label-md text-primary-container">
                  <Play aria-hidden className="size-4" />
                  ฝึกข้อนี้
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
