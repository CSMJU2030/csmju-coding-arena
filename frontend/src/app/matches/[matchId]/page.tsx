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
import { useParams, useRouter } from "next/navigation";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { ProblemTags } from "@/lib/problem-labels";
import {
  judgeAndSubmit,
  JUDGE_LANGUAGES,
  verdictMessage,
  type JudgeLanguage,
} from "@/lib/judge";

type MatchData = components["schemas"]["MatchDto"];

const starterFor = (language: JudgeLanguage) =>
  JUDGE_LANGUAGES.find((item) => item.id === language)?.starter ?? "";

/** ร่างโค้ดต่อข้อ — เก็บในแท็บนี้เท่านั้น (ไม่ใช่ token/ข้อมูลลับ) */
function loadDraft(key: string): { code: string; language: JudgeLanguage } | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { code: string; language: JudgeLanguage }) : null;
  } catch {
    return null;
  }
}
function saveDraft(key: string, code: string, language: JudgeLanguage) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ code, language }));
  } catch {
    // โหมดส่วนตัว — ไม่จำร่าง แต่แข่งต่อได้
  }
}

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = params.matchId;
  const [match, setMatch] = useState<MatchData | null>(null);
  const [language, setLanguage] = useState<JudgeLanguage>("PYTHON");
  const [code, setCode] = useState(starterFor("PYTHON"));
  const draftRound = useRef<string | null>(null);
  const languageRef = useRef<JudgeLanguage>("PYTHON");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(0);
  const [loadStatus, setLoadStatus] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const readySent = useRef(false);

  const draftKey = (roundId: string) => `arena-draft:${matchId}:${roundId}`;

  function changeCode(value: string) {
    setCode(value);
    if (draftRound.current) saveDraft(draftKey(draftRound.current), value, language);
  }

  function changeLanguage(next: JudgeLanguage) {
    // ยังไม่ได้แก้โค้ดตั้งต้น = เปลี่ยนเป็นโค้ดตั้งต้นของภาษาใหม่
    const nextCode = code.trim() === starterFor(language).trim() ? starterFor(next) : code;
    languageRef.current = next;
    setLanguage(next);
    setCode(nextCode);
    if (draftRound.current) saveDraft(draftKey(draftRound.current), nextCode, next);
  }

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
      } catch (readyError) {
        readySent.current = false;
        throw readyError;
      }
    }

    const activeRound = updated.rounds.find(
      (item) => item.roundNumber === updated.currentRound,
    );
    if (activeRound && activeRound.id !== draftRound.current) {
      const draft = loadDraft(`arena-draft:${matchId}:${activeRound.id}`);
      const nextLanguage = draft?.language ?? languageRef.current;
      languageRef.current = nextLanguage;
      setLanguage(nextLanguage);
      setCode(draft?.code ?? starterFor(nextLanguage));
      // ข้อก่อนหน้าเพิ่งจบ — บอกผลก่อนเริ่มข้อใหม่
      const finished = updated.rounds.find((item) => item.id === draftRound.current);
      setVerdict(
        finished
          ? finished.status === "DRAW"
            ? { ok: false, text: `ข้อที่ ${finished.roundNumber} เสมอ (หมดเวลา) — เริ่มข้อที่ ${activeRound.roundNumber}` }
            : finished.winnerId === updated.myPlayerId
              ? { ok: true, text: `คุณชนะข้อที่ ${finished.roundNumber}! — เริ่มข้อที่ ${activeRound.roundNumber}` }
              : { ok: false, text: `คู่แข่งตอบข้อที่ ${finished.roundNumber} ถูกก่อน — เริ่มข้อที่ ${activeRound.roundNumber}` }
          : null,
      );
      draftRound.current = activeRound.id;
    }
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
        if (requestError instanceof ApiRequestError && requestError.status === 404) {
          setMatch(null);
          setLoadStatus(404);
        }
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
    if (!round || busy) return;
    setBusy(true);
    setError("");
    setVerdict(null);
    try {
      const { submission, run } = await judgeAndSubmit({
        inputsPath: `/api/v1/matches/${matchId}/test-inputs`,
        submitPath: `/api/v1/matches/${matchId}/submissions`,
        problemId: round.problem.id,
        language,
        code,
        onProgress: (done, total) =>
          setProgress(
            done < 0
              ? "กำลังโหลด Python ในเบราว์เซอร์ (ครั้งแรกอาจใช้เวลาหลายวินาที)…"
              : done < total
              ? `กำลังรันชุดทดสอบ ${done + 1}/${total} ในเบราว์เซอร์ของคุณ…`
              : "กำลังส่งผลให้ server ตัดสิน…",
          ),
      });
      setVerdict({
        ok: submission.status === "ACCEPTED",
        text: verdictMessage(submission, run),
      });
      await refreshMatch();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ส่งคำตอบไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function cancelRoom() {
    setCancelling(true);
    setError("");
    try {
      await apiRequest(`/api/v1/matches/${matchId}`, { method: "DELETE" });
      router.push("/student");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "ปิดห้องไม่สำเร็จ",
      );
      setCancelling(false);
    }
  }

  if (!match)
    return error ? (
      <ErrorState
        message={
          loadStatus === 404
            ? "ไม่พบห้องนี้ — ห้องอาจถูกปิดหรือหมดเวลารอคู่แข่งแล้ว"
            : error
        }
        missing={loadStatus === 404}
        loginHref={
          loadStatus === 401
            ? "/auth/login?next=" + encodeURIComponent("/matches/" + matchId)
            : undefined
        }
        onRetry={
          loadStatus === 403 || loadStatus === 404
            ? undefined
            : () => window.location.reload()
        }
      />
    ) : (
      <LoadingState label="กำลังโหลดการแข่งขัน..." />
    );

  const round = match.rounds.find(
    (item) => item.roundNumber === match.currentRound,
  );
  const players = [match.playerOne, match.playerTwo].filter(
    (player): player is NonNullable<typeof player> => Boolean(player),
  );
  const roundWins = (playerId: string) =>
    match.rounds.filter(
      (item) => item.status === "WON" && item.winnerId === playerId,
    ).length;
  const remainingSeconds = round?.endsAt
    ? Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - now) / 1000))
    : 0;
  const myLatestSubmission = round?.submissions[0];
  const isHost = match.playerOne.id === match.myPlayerId;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label-md text-primary">การแข่งขันตัวต่อตัว</p>
          <h1 className="mt-1 font-display text-headline-md font-bold md:text-headline-lg text-on-surface">
            {match.title ?? "แข่งแบบชนะ 2 ใน 3 ข้อ"}
          </h1>
        </div>
        <Link
          className="min-h-11 rounded-lg border border-outline-variant px-4 py-3 text-label-md text-on-surface-variant hover:bg-surface-variant/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          href="/student"
        >
          กลับหน้าห้องแข่ง
        </Link>
      </header>

      <section
        aria-label="คะแนนการแข่งขัน"
        className="grid gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 sm:grid-cols-2"
      >
        {players.map((player) => (
          <article
            className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-4"
            key={player.id}
          >
            <div>
              <p className="text-body-md text-on-surface">
                {player.displayName}
                {player.id === match.myPlayerId ? " (คุณ)" : ""}
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
        {!match.playerTwo && (
          <article className="flex items-center justify-center rounded-lg border-2 border-dashed border-outline-variant p-4 text-body-md text-on-surface-variant">
            ยังไม่มีคู่แข่ง
          </article>
        )}
      </section>

      {error ? <Notice>{error}</Notice> : null}

      {match.status === "WAITING" ? (
        <article
          className="space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-sm"
          role="status"
        >
          <h2 className="font-display text-headline-md text-on-surface">
            รอคู่แข่งเข้าห้อง
          </h2>
          <p className="text-body-md text-on-surface-variant">
            ห้องนี้แสดงในรายการ &quot;ห้องที่รอคู่แข่ง&quot; ของหน้าประลองแล้ว
            เมื่อมีคนกดเข้าร่วม เกมจะเริ่มทันที · ห้องที่ไม่มีใครเข้าจะปิดเองใน 30 นาที
          </p>
          {isHost && (
            <Button
              variant="secondary"
              busy={cancelling}
              disabled={cancelling}
              onClick={() => void cancelRoom()}
              type="button"
            >
              ปิดห้อง
            </Button>
          )}
        </article>
      ) : match.status !== "ACTIVE" ? (
        <article
          className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center shadow-sm"
          role="status"
        >
          <h2 className="font-display text-headline-md text-on-surface">
            {match.status === "DRAW"
              ? "การแข่งขันเสมอกัน"
              : match.winnerId === match.myPlayerId
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
            กลับไปหน้าห้องแข่งและดูอันดับ
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
            ระบบจะเริ่มจับเวลา 10 นาทีเมื่อผู้เล่นทั้งสองคนเปิดหน้านี้แล้ว
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
              <div className="mt-2">
                <ProblemTags category={round.problem.category} difficulty={round.problem.difficulty} />
              </div>
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
          <div className="h-96 overflow-hidden rounded-xl border border-outline-variant/40">
            <CodeEditor
              value={code}
              onChange={changeCode}
              language={language}
              onLanguageChange={changeLanguage}
              onRun={() => void submitCode()}
            />
          </div>
          {progress ? (
            <p className="text-label-md text-primary" role="status">
              {progress}
            </p>
          ) : null}
          {verdict ? (
            <Notice tone={verdict.ok ? "success" : undefined}>
              <span className="whitespace-pre-wrap">{verdict.text}</span>
            </Notice>
          ) : null}
          {myLatestSubmission ? (
            <p className="text-label-md text-on-surface-variant" role="status">
              ผลตรวจล่าสุด:{" "}
              <SubmissionStatus status={myLatestSubmission.status} />
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              busy={busy}
              disabledReason="หมดเวลาสำหรับโจทย์นี้แล้ว"
              disabled={busy || remainingSeconds === 0}
              onClick={() => void submitCode()}
              type="button"
            >
              {busy ? "กำลังตรวจ…" : "ส่งคำตอบ"}
            </Button>
            <p className="text-label-md text-on-surface-variant">
              โค้ดรันในเบราว์เซอร์ของคุณกับชุดทดสอบของโจทย์ แล้ว server เทียบคำตอบ (Ctrl + Enter)
            </p>
          </div>
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
        หากไม่มีคำตอบถูกภายใน 10 นาที ข้อนี้จะนับเสมอ · โค้ดทุกครั้งที่ส่งถูกเก็บไว้ให้อาจารย์ตรวจย้อนหลัง
      </p>
    </section>
  );
}
