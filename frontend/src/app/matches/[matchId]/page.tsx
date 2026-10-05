"use client";

import type { components } from "@/lib/api-schema";

import {
  Button,
  Notice,
  LoadingState,
  ErrorState,
  SubmissionStatus,
} from "@/components/ui";

import { CodeEditor } from "@/components/code-editor";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ApiRequestError, apiRequest } from "@/lib/api";

type MatchData = components["schemas"]["MatchDto"];

const starterCode = `import sys

data = sys.stdin.read().split()
# เขียนคำตอบของคุณที่นี่
`;

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [match, setMatch] = useState<MatchData | null>(null);
  const [code, setCode] = useState(starterCode);
  const draftRound = useRef<string | null>(null);
  function changeCode(value: string) {
    setCode(value);
    if (draftRound.current)
      sessionStorage.setItem(
        "arena-draft:" + matchId + ":" + draftRound.current,
        value,
      );
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [now, setNow] = useState(0);
  const [loadStatus, setLoadStatus] = useState(0);
  const matchSnapshot = useRef<MatchData | null>(null);
  const readySent = useRef(false);

  const refreshMatch = useCallback(async () => {
    let updated = await apiRequest<MatchData>(`/api/v1/matches/${matchId}`);
    if (
      updated.status === "ACTIVE" &&
      updated.currentRound === null &&
      !readySent.current
    ) {
      readySent.current = true;
      try {
        updated = await apiRequest<MatchData>(
          `/api/v1/matches/${matchId}/ready`,
          { method: "POST" },
        );
      } catch (error) {
        readySent.current = false;
        throw error;
      }
    }

    const activeRound = updated.rounds.find(
      (item) => item.roundNumber === updated.currentRound,
    );
    const previousRoundNumber = matchSnapshot.current?.currentRound;
    if (previousRoundNumber !== undefined && previousRoundNumber !== null) {
      const resolvedRound = updated.rounds.find(
        (item) => item.roundNumber === previousRoundNumber,
      );
      if (resolvedRound?.submissions[0]?.status === "ACCEPTED") {
        setSuccessNotice(
          `ถูกต้อง! คำตอบผ่านและคุณชนะโจทย์ที่ ${previousRoundNumber}`,
        );
      }
    }
    if (activeRound?.submissions[0]?.status === "ACCEPTED") {
      setSuccessNotice(
        `ถูกต้อง! ระบบรับคำตอบของคุณสำหรับโจทย์ที่ ${activeRound.roundNumber}`,
      );
    }
    if (activeRound && activeRound.id !== draftRound.current) {
      setCode(
        sessionStorage.getItem(
          "arena-draft:" + matchId + ":" + activeRound.id,
        ) ?? starterCode,
      );
      draftRound.current = activeRound.id;
      setNotice("");
    }
    matchSnapshot.current = updated;
    setMatch(updated);
  }, [matchId]);

  useEffect(() => {
    const loadInitial = window.setTimeout(() => {
      setNow(Date.now());
      void refreshMatch().catch((requestError: unknown) => {
        setLoadStatus(
          requestError instanceof ApiRequestError ? requestError.status : 0,
        );
        setError(
          requestError instanceof Error
            ? requestError.message
            : "โหลดข้อมูลการแข่งขันไม่สำเร็จ",
        );
      });
    }, 0);
    const poll = window.setInterval(() => {
      void refreshMatch().catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "ตรวจสอบการแข่งขันไม่สำเร็จ",
        );
      });
    }, 1_500);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(loadInitial);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [refreshMatch]);

  async function submitCode() {
    const round = match?.rounds.find(
      (item) => item.roundNumber === match.currentRound,
    );
    if (!round) return;
    setBusy(true);
    setError("");
    setNotice("");
    setSuccessNotice("");
    try {
      await apiRequest(`/api/v1/matches/${matchId}/submissions`, {
        method: "POST",
        body: JSON.stringify({ problemId: round.problem.id, sourceCode: code }),
      });
      setNotice("ส่งคำตอบแล้ว กำลังตรวจผล");
      await refreshMatch();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ส่งคำตอบไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!match)
    return error ? (
      <ErrorState
        message={error}
        missing={loadStatus === 404}
        loginHref={
          loadStatus === 401
            ? "/auth/login?next=" + encodeURIComponent("/matches/" + matchId)
            : undefined
        }
        onRetry={
          loadStatus === 403 ? undefined : () => window.location.reload()
        }
      />
    ) : (
      <LoadingState label="กำลังโหลดการแข่งขัน..." />
    );

  const round = match.rounds.find(
    (item) => item.roundNumber === match.currentRound,
  );
  const myParticipant =
    match.playerOne.id === match.myPlayerId ? match.playerOne : match.playerTwo;
  const roundWins = (playerId: string) =>
    match.rounds.filter(
      (item) => item.status === "WON" && item.winnerId === playerId,
    ).length;
  const remainingSeconds = round?.endsAt
    ? Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - now) / 1000))
    : 0;
  const myLatestSubmission = round?.submissions[0];

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label-md text-primary">การแข่งขันตัวต่อตัว</p>
          <h1 className="mt-1 font-display text-headline-md font-bold md:text-headline-lg text-on-surface">
            แข่งแบบชนะ 2 ใน 3 ข้อ
          </h1>
        </div>
        <Link
          className="min-h-11 rounded-lg border border-outline-variant px-4 py-3 text-label-md text-on-surface-variant hover:bg-surface-variant/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          href="/student"
        >
          กลับหน้าสนาม
        </Link>
      </header>

      <section
        aria-label="คะแนนการแข่งขัน"
        className="grid gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 sm:grid-cols-2"
      >
        {[match.playerOne, match.playerTwo].map((player) => (
          <article
            className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-4"
            key={player.id}
          >
            <div>
              <p className="text-body-md text-on-surface">
                {player.displayName}
                {player.id === myParticipant.id ? " (คุณ)" : ""}
              </p>
              <p className="mt-1 text-label-sm text-on-surface-variant">
                {player.eloRating} Elo
              </p>
            </div>
            <p className="font-display text-headline-lg tabular-nums text-primary">
              {roundWins(player.id)}
            </p>
          </article>
        ))}
      </section>

      {match.status !== "ACTIVE" ? (
        <article
          className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-sm"
          role="status"
        >
          <h2 className="font-display text-headline-md text-on-surface">
            {match.status === "DRAW"
              ? "การแข่งขันเสมอกัน"
              : match.winnerId === myParticipant.id
                ? "คุณชนะการแข่งขัน"
                : "คู่แข่งชนะการแข่งขัน"}
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Elo ได้รับการคำนวณจากผลการแข่งขันแล้ว
          </p>
          <Link
            className="btn-gradient mt-5 inline-flex min-h-11 items-center rounded-lg px-5 py-3 text-label-md text-on-primary"
            href="/student"
          >
            กลับไปสนามและดูอันดับ
          </Link>
        </article>
      ) : match.currentRound === null ? (
        <article
          className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-sm"
          role="status"
        >
          <h2 className="font-display text-headline-md text-on-surface">
            รอคู่แข่งพร้อมเข้าสนาม
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            ระบบจะเริ่มจับเวลา 10 นาทีเมื่อผู้เล่นทั้งสองคนเปิดสนามแล้ว
          </p>
        </article>
      ) : round ? (
        <article className="space-y-5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-label-md text-primary">
                โจทย์ที่ {round.roundNumber} จาก 3
              </p>
              <h2 className="mt-1 font-display text-headline-md text-on-surface">
                {round.problem.title}
              </h2>
            </div>
            <p
              aria-label="เวลาที่เหลือ"
              className="rounded-full bg-primary-container/10 px-4 py-2 font-display text-label-md tabular-nums text-primary-container"
              role="timer"
            >
              {Math.floor(remainingSeconds / 60)}:
              {String(remainingSeconds % 60).padStart(2, "0")}
            </p>
          </header>
          <div className="whitespace-pre-wrap break-words text-body-md text-on-surface-variant">
            {round.problem.description}
          </div>
          <div className="h-80 overflow-hidden rounded-xl border border-outline-variant/40 md:h-96">
            <CodeEditor value={code} onChange={changeCode} />
          </div>
          {error ? <Notice>{error}</Notice> : null}
          {notice ? (
            <p className="text-label-md text-primary" role="status">
              {notice}
            </p>
          ) : null}
          {successNotice ? (
            <Notice tone="success">{successNotice}</Notice>
          ) : null}
          {myLatestSubmission ? (
            <p className="text-label-md text-on-surface-variant" role="status">
              ผลตรวจล่าสุด:{" "}
              <SubmissionStatus status={myLatestSubmission.status} />
            </p>
          ) : null}
          <Button
            busy={busy}
            disabledReason={
              remainingSeconds === 0
                ? "หมดเวลาสำหรับโจทย์นี้แล้ว"
                : "ระบบกำลังตรวจคำตอบที่ส่งล่าสุด กรุณารอผลตรวจ"
            }
            disabled={
              busy ||
              remainingSeconds === 0 ||
              myLatestSubmission?.status === "PENDING" ||
              myLatestSubmission?.status === "EVALUATING"
            }
            onClick={() => void submitCode()}
            type="button"
          >
            {busy ? "กำลังส่ง…" : "ส่งคำตอบ"}
          </Button>
        </article>
      ) : (
        <p
          className="rounded-xl bg-surface-container-low p-5 text-body-md text-on-surface-variant"
          role="status"
        >
          กำลังเริ่มโจทย์ถัดไป…
        </p>
      )}
      <p className="text-body-md text-on-surface-variant">
        หากไม่มีคำตอบถูกภายใน 10 นาที ข้อนี้จะนับเสมอ
      </p>
    </section>
  );
}
