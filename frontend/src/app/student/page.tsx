"use client";

import {
  Button,
  Notice,
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorState,
  secondaryButtonClass,
} from "@/components/ui";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, apiRequest } from "@/lib/api";

interface QueueState {
  state: "idle" | "waiting" | "matched";
  id?: string;
  position?: number;
}

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  eloRating: number;
}

interface Profile {
  coreRole: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueState>({ state: "idle" });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [loadStatus, setLoadStatus] = useState(0);

  const refreshQueue = useCallback(async () => {
    const current = await apiRequest<QueueState>("/api/v1/matches/current");
    setQueue(current);
    if (current.state === "matched" && current.id) {
      router.replace(`/matches/${current.id}`);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const profile = await apiRequest<Profile>("/api/v1/me");
        if (profile.coreRole !== "student") {
          if (profile.coreRole === "lecturer")
            router.replace("/teacher/problems");
          else {
            setLoadStatus(403);
            setError(
              "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ กรุณาติดต่อผู้ดูแลระบบย่อยนี้",
            );
          }
          return;
        }
        const [current, scores] = await Promise.all([
          apiRequest<QueueState>("/api/v1/matches/current"),
          apiRequest<LeaderboardEntry[]>("/api/v1/users/leaderboard"),
        ]);
        if (!active) return;
        setQueue(current);
        setLeaderboard(scores);
        setDashboardReady(true);
        if (current.state === "matched" && current.id) {
          router.replace(`/matches/${current.id}`);
        }
      } catch (requestError) {
        if (!active) return;
        if (
          requestError instanceof ApiRequestError &&
          requestError.status === 401
        ) {
          setAuthRequired(true);
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "โหลดข้อมูลไม่สำเร็จ",
        );
        setLoadStatus(
          requestError instanceof ApiRequestError ? requestError.status : 0,
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (queue.state !== "waiting") return;
    const interval = window.setInterval(() => {
      void refreshQueue().catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "ตรวจสอบสถานะคิวไม่สำเร็จ",
        );
      });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [queue.state, refreshQueue]);

  async function joinQueue() {
    setBusy(true);
    setError("");
    try {
      const current = await apiRequest<QueueState>("/api/v1/matches/queue", {
        method: "POST",
      });
      setQueue(current);
      if (current.state === "matched" && current.id) {
        router.push(`/matches/${current.id}`);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "เริ่มจับคู่ไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function leaveQueue() {
    setBusy(true);
    setError("");
    try {
      await apiRequest<{ state: string }>("/api/v1/matches/queue", {
        method: "DELETE",
      });
      setQueue({ state: "idle" });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ยกเลิกคิวไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="กำลังโหลดสนามแข่งขัน..." />;
  if (!dashboardReady)
    return (
      <ErrorState
        message={error}
        loginHref={authRequired ? "/auth/login?next=%2Fstudent" : undefined}
        onRetry={
          loadStatus === 403 ? undefined : () => window.location.reload()
        }
      />
    );

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="พื้นที่นักศึกษา"
        title="สนามประลองอัลกอริทึม"
        description="จับคู่แบบ 1 ต่อ 1 ใช้โจทย์ร่วมกัน 3 ข้อที่สุ่มไม่ซ้ำ ใครชนะครบ 2 ข้อก่อนเป็นผู้ชนะ"
      />

      {error && (
        <Notice>
          {error}
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              ลองอีกครั้ง
            </Button>
          </div>
        </Notice>
      )}

      <article className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
        <h2 className="font-display text-headline-md text-on-surface">
          แข่งขัน 1-ต่อ-1
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          แต่ละข้อมีเวลา 10 นาที ผู้ที่ส่งคำตอบถูกก่อนชนะข้อนั้น
          เมื่อหมดเวลาจะนับเสมอหากยังไม่มีผู้ชนะ
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {queue.state === "waiting" ? (
            <>
              <p className="text-label-md text-primary" role="status">
                กำลังรอคู่แข่ง · คิวที่ {queue.position}
              </p>
              <Button
                variant="secondary"
                busy={busy}
                disabled={busy}
                onClick={() => void leaveQueue()}
                type="button"
              >
                ยกเลิกการจับคู่
              </Button>
            </>
          ) : (
            <Button
              busy={busy}
              disabled={busy || authRequired}
              disabledReason={
                authRequired ? "กรุณาเข้าสู่ระบบก่อนเริ่มจับคู่" : undefined
              }
              onClick={() => void joinQueue()}
              type="button"
            >
              {busy ? "กำลังจับคู่…" : "เริ่มจับคู่"}
            </Button>
          )}
        </div>
      </article>

      <section
        aria-labelledby="leaderboard-heading"
        className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm"
      >
        <header className="border-b border-outline-variant/40 p-5">
          <p className="text-label-md text-primary">อันดับผู้เล่น</p>
          <h2
            className="mt-1 font-display text-headline-md text-on-surface"
            id="leaderboard-heading"
          >
            Elo สูงสุด 5 อันดับ
          </h2>
        </header>
        {leaderboard.length ? (
          <ol className="divide-y divide-outline-variant/40">
            {leaderboard.map((entry) => (
              <li
                className="flex items-center justify-between gap-4 px-5 py-4"
                key={entry.rank}
              >
                <span className="flex items-center gap-4">
                  <span className="font-display text-label-md text-primary">
                    {String(entry.rank).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 break-words text-body-md text-on-surface">
                    {entry.displayName}
                  </span>
                </span>
                <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">
                  {entry.eloRating} Elo
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="ยังไม่มีคะแนนการแข่งขัน"
            description="อันดับจะแสดงเมื่อมีผลการแข่งขันที่ใช้คำนวณ Elo"
          >
            <Link
              href="/student"
              className={secondaryButtonClass}
              onClick={(event) => {
                event.preventDefault();
                window.location.reload();
              }}
            >
              รีเฟรชอันดับ
            </Link>
          </EmptyState>
        )}
      </section>
    </section>
  );
}
