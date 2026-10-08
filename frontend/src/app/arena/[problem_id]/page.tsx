"use client";

import type { components } from "@/lib/api-schema";

import { Button, Notice, ErrorState, LoadingState } from "@/components/ui";

import { useState, useEffect, use } from "react";
import { CodeEditor } from "@/components/code-editor";
import { ApiRequestError, apiRequest } from "@/lib/api";

type Problem = components["schemas"]["ProblemDto"];

export default function CodingArenaPage({
  params,
}: {
  params: Promise<{ problem_id: string }>;
}) {
  const resolvedParams = use(params);
  const problemId = resolvedParams.problem_id;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [code, setCode] = useState<string>(
    "import sys\ndata = sys.stdin.read().split()\nif data:\n    # เขียนโค้ดของคุณที่นี่\n    pass",
  );

  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [loadStatus, setLoadStatus] = useState(0);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const problemData = await apiRequest<Problem>(
          `/api/v1/problems/${problemId}`,
        );
        setProblem(problemData);
      } catch (requestError) {
        setLoadStatus(
          requestError instanceof ApiRequestError ? requestError.status : 0,
        );
        setErrorMsg(
          requestError instanceof Error
            ? requestError.message
            : "โหลดโจทย์ไม่สำเร็จ กรุณาลองอีกครั้ง",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  const submitCode = async () => {
    if (cooldownRemaining > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setNotice("");
    setSubmissionError("");

    try {
      await apiRequest("/api/v1/submissions", {
        method: "POST",
        body: JSON.stringify({ problemId, sourceCode: code }),
      });
      setNotice("ส่งคำตอบแล้ว ระบบกำลังตรวจคำตอบ กรุณารอสักครู่");
    } catch (requestError) {
      setSubmissionError(
        requestError instanceof Error
          ? requestError.message
          : "ส่งคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setIsSubmitting(false);
    }
    setCooldownRemaining(3);
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (isLoading) return <LoadingState label="กำลังโหลดโจทย์..." />;
  if (errorMsg)
    return (
      <ErrorState
        message={errorMsg}
        missing={loadStatus === 404}
        loginHref={
          loadStatus === 401
            ? "/auth/login?next=" + encodeURIComponent("/arena/" + problemId)
            : undefined
        }
        onRetry={
          loadStatus === 403 ? undefined : () => window.location.reload()
        }
      />
    );
  return (
    <div className="grid min-w-0 flex-1 gap-6 xl:grid-cols-5">
      <section className="overflow-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm min-w-0 xl:col-span-2 md:p-6">
        <h1 className="mb-3 font-display text-headline-md text-on-surface">
          {problem?.title}
        </h1>
        <div className="mb-6 inline-flex rounded-full bg-primary-container/10 px-3 py-1 text-label-md text-primary-container">
          เวลาสูงสุด:{" "}
          <span className="ml-1 tabular-nums">{problem?.timeLimitMs}</span>{" "}
          มิลลิวินาที
        </div>
        <div className="whitespace-pre-wrap break-words text-body-md text-on-surface-variant">
          {problem?.description}
        </div>
      </section>

      <section
        aria-label="พื้นที่เขียนและทดสอบโค้ด"
        className="flex min-h-0 flex-col gap-4 min-w-0 xl:col-span-3"
      >
        <div className="h-80 min-w-0 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm md:h-96">
          <CodeEditor value={code} onChange={setCode} />
        </div>

        {notice && <Notice tone="success">{notice}</Notice>}
        {submissionError && <Notice>{submissionError}</Notice>}
        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <Button
            onClick={submitCode}
            busy={isSubmitting}
            disabled={cooldownRemaining > 0}
            disabledReason={`กรุณารอ ${cooldownRemaining} วินาทีก่อนส่งคำตอบอีกครั้ง`}
          >
            {cooldownRemaining > 0
              ? `กรุณารอ ${cooldownRemaining} วินาที…`
              : "ส่งคำตอบ"}
          </Button>
        </div>

      </section>
    </div>
  );
}
