"use client";

import type { components } from "@/lib/api-schema";

import {
  Button,
  Notice,
  PageHeader,
  inputClass,
  useFormValidation,
  FieldError,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  ErrorState,
  secondaryButtonClass,
} from "@/components/ui";

import Link from "next/link";
import { useFormDraft } from "@/lib/use-form-draft";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/problem-labels";
import { useRouter } from "next/navigation";
import { ApiRequestError, apiRequest, apiCollection } from "@/lib/api";
import { canManage, homeFor } from "@/lib/roles";

type Problem = components["schemas"]["ProblemManagementDto"];

interface ProblemForm {
  title: string;
  description: string;
  timeLimitMs: number;
  isActive: boolean;
  category?: string;
  difficulty?: string;
}

const emptyForm: ProblemForm = {
  title: "",
  description: "",
  timeLimitMs: 1000,
  isActive: true,
  category: "BASICS",
  difficulty: "EASY",
};

type Profile = components["schemas"]["MeDto"];

export default function TeacherProblemsPage() {
  const router = useRouter();
  const validation = useFormValidation();
  const [formData, setFormData] = useFormDraft<ProblemForm>(
    "arena-problem-create",
    emptyForm,
  );
  const [problems, setProblems] = useState<Problem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProblemForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadStatus, setLoadStatus] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Problem | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadProblems = useCallback(async () => {
    const result = await apiCollection<Problem>("/api/v1/problems/manage");
    setProblems(result);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const profile = await apiRequest<Profile>("/api/v1/me");
        if (!canManage(profile)) {
          router.replace(homeFor(profile));
          return;
        }
        await loadProblems();
      } catch (requestError) {
        if (active) {
          setLoadFailed(true);
          setLoadStatus(
            requestError instanceof ApiRequestError ? requestError.status : 0,
          );
          setError(
            requestError instanceof Error
              ? requestError.message
              : "โหลดรายการโจทย์ไม่สำเร็จ",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [loadProblems, router]);

  async function createProblem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    validation.clear();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/v1/problems", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setFormData(emptyForm);
      setNotice("เพิ่มโจทย์แล้ว");
      await loadProblems();
    } catch (requestError) {
      validation.capture(requestError, "create-problem");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "เพิ่มโจทย์ไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(problem: Problem) {
    setEditingId(problem.id);
    setEditing({
      title: problem.title,
      description: problem.description,
      timeLimitMs: problem.timeLimitMs,
      isActive: problem.isActive,
    });
    setError("");
    setNotice("");
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    validation.clear();
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/problems/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(editing),
      });
      setEditingId(null);
      setNotice("บันทึกการแก้ไขแล้ว");
      await loadProblems();
    } catch (requestError) {
      validation.capture(requestError, "edit-problem");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "บันทึกการแก้ไขไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(problem: Problem) {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/problems/${problem.id}`, { method: "DELETE" });
      setPendingDelete(null);
      setNotice("ปิดใช้งานโจทย์แล้ว ข้อมูลการแข่งขันเดิมยังคงอยู่");
      await loadProblems();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ปิดใช้งานโจทย์ไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="กำลังโหลดข้อมูล..." />;
  if (loadFailed)
    return (
      <ErrorState
        message={error}
        loginHref={
          loadStatus === 401
            ? "/auth/login?next=%2Fteacher%2Fproblems"
            : undefined
        }
        missing={loadStatus === 404}
        onRetry={
          loadStatus === 403 ? undefined : () => window.location.reload()
        }
      />
    );
  const filteredProblems = problems.filter(
    (problem) =>
      `${problem.title} ${problem.description}`
        .toLocaleLowerCase("th")
        .includes(query.toLocaleLowerCase("th")) &&
      (statusFilter === "all" ||
        problem.isActive === (statusFilter === "active")),
  );
  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <PageHeader
        eyebrow="พื้นที่อาจารย์"
        title="จัดการโจทย์อัลกอริทึม"
        description="เพิ่ม แก้ไข และปิดใช้งานโจทย์ รวมถึงชุดทดสอบสำหรับการแข่งขัน"
      />

      {error ? <Notice>{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      <form
        id="create-problem"
        className="space-y-5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm md:p-6"
        onSubmit={(event) => void createProblem(event)}
      >
        <h2 className="font-display text-headline-md text-on-surface">
          เพิ่มโจทย์ใหม่
        </h2>
        <div>
          <label
            className="mb-2 block text-label-md text-on-surface"
            htmlFor="problem-title"
          >
            ชื่อโจทย์
          </label>
          <input
            name="title"
            aria-invalid={!!validation.errors["create-problem-title"]}
            aria-describedby={
              validation.errors["create-problem-title"]
                ? "create-problem-title-error"
                : undefined
            }
            className={`${inputClass} ${validation.errors["create-problem-title"] ? "input-error" : ""}`}
            id="problem-title"
            maxLength={160}
            onChange={(event) =>
              setFormData({ ...formData, title: event.target.value })
            }
            required
            value={formData.title}
          />
          <FieldError name="create-problem-title" errors={validation.errors} />
        </div>
        <div>
          <label
            className="mb-2 block text-label-md text-on-surface"
            htmlFor="problem-description"
          >
            รายละเอียดโจทย์
          </label>
          <textarea
            name="description"
            aria-invalid={!!validation.errors["create-problem-description"]}
            aria-describedby={
              validation.errors["create-problem-description"]
                ? "create-problem-description-error"
                : undefined
            }
            className={`${inputClass} ${validation.errors["create-problem-description"] ? "input-error" : ""}`}
            id="problem-description"
            onChange={(event) =>
              setFormData({ ...formData, description: event.target.value })
            }
            required
            rows={5}
            value={formData.description}
          />
          <FieldError
            name="create-problem-description"
            errors={validation.errors}
          />
        </div>
        <label
          className="block max-w-xs text-label-md text-on-surface"
          htmlFor="time-limit"
        >
          เวลาประมวลผลสูงสุด (มิลลิวินาที)
          <input
            name="timeLimitMs"
            aria-invalid={!!validation.errors["create-problem-timeLimitMs"]}
            aria-describedby={
              validation.errors["create-problem-timeLimitMs"]
                ? "create-problem-timeLimitMs-error"
                : undefined
            }
            className={`${inputClass} mt-2 ${validation.errors["create-problem-timeLimitMs"] ? "input-error" : ""}`}
            id="time-limit"
            max={60000}
            min={1}
            onChange={(event) =>
              setFormData({
                ...formData,
                timeLimitMs: Number(event.target.value),
              })
            }
            required
            type="number"
            value={formData.timeLimitMs}
          />
          <FieldError
            name="create-problem-timeLimitMs"
            errors={validation.errors}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="block text-label-md text-on-surface" htmlFor="problem-category">
            หมวด
            <select
              id="problem-category"
              className={`${inputClass} mt-2`}
              value={formData.category}
              onChange={(event) => setFormData({ ...formData, category: event.target.value })}
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-label-md text-on-surface" htmlFor="problem-difficulty">
            ระดับ (ใช้เรียงข้อในการสุ่ม ง่าย → ยาก)
            <select
              id="problem-difficulty"
              className={`${inputClass} mt-2`}
              value={formData.difficulty}
              onChange={(event) => setFormData({ ...formData, difficulty: event.target.value })}
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {DIFFICULTY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-body-md text-on-surface">
          <input
            checked={formData.isActive}
            className="h-4 w-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            onChange={(event) =>
              setFormData({ ...formData, isActive: event.target.checked })
            }
            type="checkbox"
          />
          เปิดใช้งานโจทย์นี้
        </label>
        <Button busy={busy} disabled={busy} type="submit">
          {busy ? "กำลังบันทึก…" : "เพิ่มโจทย์"}
        </Button>
      </form>

      <section aria-labelledby="problem-list-heading" className="space-y-4">
        <h2
          className="font-display text-headline-md text-on-surface"
          id="problem-list-heading"
        >
          รายการโจทย์
        </h2>
        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 md:flex-row md:flex-wrap md:items-end xl:flex-nowrap">
          <label className="min-w-0 flex-1 space-y-2 text-label-md md:basis-full xl:basis-auto">
            ค้นหาโจทย์
            <input
              className={inputClass}
              type="search"
              placeholder="ชื่อโจทย์หรือรายละเอียด"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-label-md md:w-48">
            สถานะ
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">เปิดใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </label>
          <Button
            onClick={() => {
              document
                .getElementById("create-problem")
                ?.scrollIntoView({ block: "start" });
              document.getElementById("problem-title")?.focus();
            }}
          >
            เพิ่มโจทย์
          </Button>
        </div>
        <p className="text-body-md tabular-nums text-on-surface-variant">
          แสดง {filteredProblems.length} จาก {problems.length} โจทย์
        </p>
        {filteredProblems.length ? (
          <ul className="space-y-4">
            {filteredProblems.map((problem) => (
              <li
                className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm"
                key={problem.id}
              >
                {editingId === problem.id ? (
                  <form
                    id="edit-problem"
                    className="space-y-4"
                    onSubmit={(event) => void saveEdit(event)}
                  >
                    <label className="block text-label-md text-on-surface">
                      ชื่อโจทย์
                      <input
                        name="title"
                        aria-invalid={!!validation.errors["edit-problem-title"]}
                        aria-describedby={
                          validation.errors["edit-problem-title"]
                            ? "edit-problem-title-error"
                            : undefined
                        }
                        className={`${inputClass} mt-2 ${validation.errors["edit-problem-title"] ? "input-error" : ""}`}
                        maxLength={160}
                        onChange={(event) =>
                          setEditing({ ...editing, title: event.target.value })
                        }
                        required
                        value={editing.title}
                      />
                      <FieldError
                        name="edit-problem-title"
                        errors={validation.errors}
                      />
                    </label>
                    <label className="block text-label-md text-on-surface">
                      รายละเอียด
                      <textarea
                        name="description"
                        aria-invalid={
                          !!validation.errors["edit-problem-description"]
                        }
                        aria-describedby={
                          validation.errors["edit-problem-description"]
                            ? "edit-problem-description-error"
                            : undefined
                        }
                        className={`${inputClass} mt-2 ${validation.errors["edit-problem-description"] ? "input-error" : ""}`}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            description: event.target.value,
                          })
                        }
                        required
                        rows={4}
                        value={editing.description}
                      />
                      <FieldError
                        name="edit-problem-description"
                        errors={validation.errors}
                      />
                    </label>
                    <label className="block max-w-xs text-label-md text-on-surface">
                      เวลาประมวลผลสูงสุด (มิลลิวินาที)
                      <input
                        name="timeLimitMs"
                        aria-invalid={
                          !!validation.errors["edit-problem-timeLimitMs"]
                        }
                        aria-describedby={
                          validation.errors["edit-problem-timeLimitMs"]
                            ? "edit-problem-timeLimitMs-error"
                            : undefined
                        }
                        className={`${inputClass} mt-2 ${validation.errors["edit-problem-timeLimitMs"] ? "input-error" : ""}`}
                        max={60000}
                        min={1}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            timeLimitMs: Number(event.target.value),
                          })
                        }
                        required
                        type="number"
                        value={editing.timeLimitMs}
                      />
                      <FieldError
                        name="edit-problem-timeLimitMs"
                        errors={validation.errors}
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 text-body-md text-on-surface">
                      <input
                        checked={editing.isActive}
                        className="h-4 w-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            isActive: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      เปิดใช้งาน
                    </label>
                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        ยกเลิก
                      </Button>
                      <Button busy={busy} disabled={busy} type="submit">
                        บันทึก
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-headline-md text-on-surface">
                          {problem.title}
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap break-words text-body-md text-on-surface-variant">
                          {problem.description}
                        </p>
                        <p className="mt-3 text-label-md text-on-surface-variant">
                          เวลารัน {problem.timeLimitMs} ms · ชุดทดสอบ{" "}
                          {problem._count.testCases} ชุด ·{" "}
                          {problem.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className={secondaryButtonClass}
                          href={`/teacher/problems/${problem.id}`}
                        >
                          จัดการชุดทดสอบ
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => beginEdit(problem)}
                          type="button"
                        >
                          แก้ไข
                        </Button>
                        {problem.isActive ? (
                          <Button
                            variant="danger"
                            busy={busy}
                            disabled={busy}
                            onClick={() => {
                              setError("");
                              setPendingDelete(problem);
                            }}
                            type="button"
                          >
                            ปิดใช้งานโจทย์
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={
              problems.length
                ? "ไม่พบโจทย์ที่ตรงกับการค้นหา"
                : "ยังไม่มีโจทย์ในระบบ"
            }
            description={
              problems.length
                ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง"
                : "เริ่มต้นด้วยการเพิ่มโจทย์และชุดทดสอบสำหรับการแข่งขัน"
            }
          >
            {problems.length ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                ล้างตัวกรอง
              </Button>
            ) : (
              <Button
                onClick={() =>
                  document.getElementById("problem-title")?.focus()
                }
              >
                เพิ่มโจทย์แรก
              </Button>
            )}
          </EmptyState>
        )}
      </section>
      <ConfirmDialog
        open={!!pendingDelete}
        title="ปิดใช้งานโจทย์"
        confirmLabel="ปิดใช้งานโจทย์"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deactivate(pendingDelete);
        }}
      >
        <p>
          ต้องการปิดใช้งานโจทย์{" "}
          <strong className="text-on-surface">{pendingDelete?.title}</strong>{" "}
          ใช่หรือไม่? ประวัติการแข่งขันเดิมจะยังคงอยู่
        </p>
        {error && <Notice>{error}</Notice>}
      </ConfirmDialog>
    </section>
  );
}
