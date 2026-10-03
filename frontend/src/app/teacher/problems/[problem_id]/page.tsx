"use client";

import {
  Button,
  Notice,
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
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, apiRequest } from "@/lib/api";

interface TestCase {
  id: string;
  problemId: string;
  inputData: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface TestCaseForm {
  inputData: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface Profile {
  coreRole: string;
}

const emptyForm: TestCaseForm = {
  inputData: "",
  expectedOutput: "",
  isHidden: false,
};

export default function TeacherTestCasesPage({
  params,
}: {
  params: Promise<{ problem_id: string }>;
}) {
  const { problem_id: problemId } = use(params);
  const router = useRouter();
  const validation = useFormValidation();
  const [formData, setFormData] = useState(emptyForm);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TestCaseForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadStatus, setLoadStatus] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<TestCase | null>(null);

  const loadTestCases = useCallback(async () => {
    const result = await apiRequest<TestCase[]>(
      `/api/v1/test-cases/problem/${problemId}`,
    );
    setTestCases(result);
  }, [problemId]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const profile = await apiRequest<Profile>("/api/v1/me");
        if (profile.coreRole !== "lecturer") {
          router.replace(profile.coreRole === "student" ? "/student" : "/");
          return;
        }
        await loadTestCases();
      } catch (requestError) {
        if (active) {
          setLoadFailed(true);
          setLoadStatus(
            requestError instanceof ApiRequestError ? requestError.status : 0,
          );
          setError(
            requestError instanceof Error
              ? requestError.message
              : "โหลดชุดทดสอบไม่สำเร็จ",
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
  }, [loadTestCases, router]);

  async function createTestCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    validation.clear();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/v1/test-cases", {
        method: "POST",
        body: JSON.stringify({ ...formData, problemId }),
      });
      setFormData(emptyForm);
      setNotice("เพิ่มชุดทดสอบแล้ว");
      await loadTestCases();
    } catch (requestError) {
      validation.capture(requestError, "create-test-case");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "เพิ่มชุดทดสอบไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    validation.clear();
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/test-cases/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(editing),
      });
      setEditingId(null);
      setNotice("บันทึกชุดทดสอบแล้ว");
      await loadTestCases();
    } catch (requestError) {
      validation.capture(requestError, "edit-test-case");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "แก้ไขชุดทดสอบไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteTestCase(testCase: TestCase) {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/v1/test-cases/${testCase.id}`, {
        method: "DELETE",
      });
      setPendingDelete(null);
      setNotice("ลบชุดทดสอบแล้ว");
      await loadTestCases();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ลบชุดทดสอบไม่สำเร็จ",
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
            ? "/auth/login?next=%2Fteacher%2Fproblems%2F" +
              encodeURIComponent(problemId)
            : undefined
        }
        missing={loadStatus === 404}
        onRetry={
          loadStatus === 403 ? undefined : () => window.location.reload()
        }
      />
    );

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <header className="space-y-3">
        <Link className={secondaryButtonClass} href="/teacher/problems">
          กลับไปจัดการโจทย์
        </Link>
        <h1 className="font-display text-headline-md font-bold md:text-headline-lg text-on-surface">
          จัดการชุดทดสอบ
        </h1>
        <p className="text-body-md text-on-surface-variant">
          เพิ่ม แก้ไข หรือลบข้อมูลทดสอบของโจทย์นี้
        </p>
      </header>

      {error ? <Notice>{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      <form
        id="create-test-case"
        className="space-y-5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm md:p-6"
        onSubmit={(event) => void createTestCase(event)}
      >
        <h2 className="font-display text-headline-md text-on-surface">
          เพิ่มชุดทดสอบ
        </h2>
        <label className="block text-label-md text-on-surface">
          ข้อมูลนำเข้า
          <textarea
            name="inputData"
            aria-invalid={!!validation.errors["create-test-case-inputData"]}
            aria-describedby={
              validation.errors["create-test-case-inputData"]
                ? "create-test-case-inputData-error"
                : undefined
            }
            id="test-case-input"
            className={`${inputClass} mt-2 ${validation.errors["create-test-case-inputData"] ? "input-error" : ""}`}
            onChange={(event) =>
              setFormData({ ...formData, inputData: event.target.value })
            }
            rows={3}
            value={formData.inputData}
          />
          <FieldError
            name="create-test-case-inputData"
            errors={validation.errors}
          />
        </label>
        <label className="block text-label-md text-on-surface">
          ผลลัพธ์ที่ถูกต้อง
          <textarea
            name="expectedOutput"
            aria-invalid={
              !!validation.errors["create-test-case-expectedOutput"]
            }
            aria-describedby={
              validation.errors["create-test-case-expectedOutput"]
                ? "create-test-case-expectedOutput-error"
                : undefined
            }
            className={`${inputClass} mt-2 ${validation.errors["create-test-case-expectedOutput"] ? "input-error" : ""}`}
            onChange={(event) =>
              setFormData({
                ...formData,
                expectedOutput: event.target.value,
              })
            }
            required
            rows={3}
            value={formData.expectedOutput}
          />
          <FieldError
            name="create-test-case-expectedOutput"
            errors={validation.errors}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-body-md text-on-surface">
          <input
            checked={formData.isHidden}
            className="h-4 w-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            onChange={(event) =>
              setFormData({ ...formData, isHidden: event.target.checked })
            }
            type="checkbox"
          />
          ซ่อนชุดทดสอบนี้จากนักศึกษา
        </label>
        <Button busy={busy} disabled={busy} type="submit">
          {busy ? "กำลังบันทึก…" : "เพิ่มชุดทดสอบ"}
        </Button>
      </form>

      <section aria-labelledby="test-case-list-heading" className="space-y-4">
        <h2
          className="font-display text-headline-md text-on-surface"
          id="test-case-list-heading"
        >
          ชุดทดสอบทั้งหมด
        </h2>
        {testCases.length ? (
          <ul className="space-y-4">
            {testCases.map((testCase, index) => (
              <li
                className="space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm"
                key={testCase.id}
              >
                {editingId === testCase.id ? (
                  <form
                    id="edit-test-case"
                    className="space-y-4"
                    onSubmit={(event) => void saveEdit(event)}
                  >
                    <label className="block text-label-md text-on-surface">
                      ข้อมูลนำเข้า
                      <textarea
                        name="inputData"
                        aria-invalid={
                          !!validation.errors["edit-test-case-inputData"]
                        }
                        aria-describedby={
                          validation.errors["edit-test-case-inputData"]
                            ? "edit-test-case-inputData-error"
                            : undefined
                        }
                        className={`${inputClass} mt-2 ${validation.errors["edit-test-case-inputData"] ? "input-error" : ""}`}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            inputData: event.target.value,
                          })
                        }
                        rows={3}
                        value={editing.inputData}
                      />
                      <FieldError
                        name="edit-test-case-inputData"
                        errors={validation.errors}
                      />
                    </label>
                    <label className="block text-label-md text-on-surface">
                      ผลลัพธ์ที่ถูกต้อง
                      <textarea
                        name="expectedOutput"
                        aria-invalid={
                          !!validation.errors["edit-test-case-expectedOutput"]
                        }
                        aria-describedby={
                          validation.errors["edit-test-case-expectedOutput"]
                            ? "edit-test-case-expectedOutput-error"
                            : undefined
                        }
                        className={`${inputClass} mt-2 ${validation.errors["edit-test-case-expectedOutput"] ? "input-error" : ""}`}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            expectedOutput: event.target.value,
                          })
                        }
                        required
                        rows={3}
                        value={editing.expectedOutput}
                      />
                      <FieldError
                        name="edit-test-case-expectedOutput"
                        errors={validation.errors}
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 text-body-md text-on-surface">
                      <input
                        checked={editing.isHidden}
                        className="h-4 w-4 accent-primary"
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            isHidden: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      ซ่อนจากนักศึกษา
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
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-display text-label-md text-on-surface">
                        ชุดทดสอบที่ {index + 1} ·{" "}
                        {testCase.isHidden ? "ซ่อน" : "แสดงตัวอย่าง"}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingId(testCase.id);
                            setEditing({
                              inputData: testCase.inputData,
                              expectedOutput: testCase.expectedOutput,
                              isHidden: testCase.isHidden,
                            });
                          }}
                          type="button"
                        >
                          แก้ไข
                        </Button>
                        <Button
                          variant="danger"
                          busy={busy}
                          disabled={busy}
                          onClick={() => {
                            setError("");
                            setPendingDelete(testCase);
                          }}
                          type="button"
                        >
                          ลบ
                        </Button>
                      </div>
                    </header>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-label-md text-on-surface-variant">
                          ข้อมูลนำเข้า
                        </p>
                        <pre className="mt-2 min-h-16 whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-3 font-mono text-body-md text-on-surface">
                          {testCase.inputData || "(ไม่มีข้อมูลนำเข้า)"}
                        </pre>
                      </div>
                      <div>
                        <p className="text-label-md text-on-surface-variant">
                          ผลลัพธ์
                        </p>
                        <pre className="mt-2 min-h-16 whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-3 font-mono text-body-md text-on-surface">
                          {testCase.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="ยังไม่มีชุดทดสอบ"
            description="เพิ่มข้อมูลนำเข้าและผลลัพธ์ที่ถูกต้อง เพื่อให้ระบบตรวจคำตอบของโจทย์นี้ได้"
          >
            <Button
              onClick={() =>
                document.getElementById("test-case-input")?.focus()
              }
            >
              เพิ่มชุดทดสอบแรก
            </Button>
          </EmptyState>
        )}
      </section>
      <ConfirmDialog
        open={!!pendingDelete}
        title="ลบชุดทดสอบ"
        confirmLabel="ลบ"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteTestCase(pendingDelete);
        }}
      >
        <p>ต้องการลบชุดทดสอบนี้ใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถเรียกคืนได้</p>
        {error && <Notice>{error}</Notice>}
      </ConfirmDialog>
    </section>
  );
}
