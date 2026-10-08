"use client";

import type { components } from "@/lib/api-schema";

import { DoorOpen, Plus, Swords, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, EmptyState, Notice, inputClass, primaryButtonClass } from "@/components/ui";
import { apiCollection, apiRequest } from "@/lib/api";

type Room = components["schemas"]["MatchRoomDto"];
type Match = components["schemas"]["MatchDto"];
type Problem = components["schemas"]["ProblemSummaryDto"];
type Tab = "WAITING" | "ACTIVE";

const POLL_MS = 3_000;

function since(iso: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  return minutes < 1 ? "เมื่อสักครู่" : `${minutes} นาทีที่แล้ว`;
}

/** สร้างห้อง + รายการห้องที่รอคู่แข่ง/กำลังแข่ง (อัปเดตทุก 3 วินาที) */
export function MatchRooms({ hostingId, disabled }: { hostingId: string | null; disabled: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("WAITING");
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [listError, setListError] = useState("");
  const [now, setNow] = useState(0);
  const [joining, setJoining] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const [title, setTitle] = useState("");
  const [pickMode, setPickMode] = useState<"random" | "choose">("random");
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [picked, setPicked] = useState<string[]>(["", "", ""]);
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    const data = await apiRequest<Room[]>(`/api/v1/matches?status=${tab}&limit=50`);
    setRooms(data);
    setListError("");
    setNow(Date.now());
  }, [tab]);

  useEffect(() => {
    let active = true;
    const tick = () =>
      loadRooms().catch((e: unknown) => {
        if (active) setListError(e instanceof Error ? e.message : "โหลดรายการห้องไม่สำเร็จ");
      });
    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadRooms]);

  useEffect(() => {
    if (pickMode !== "choose" || problems) return;
    apiCollection<Problem>("/api/v1/problems")
      .then(setProblems)
      .catch((e: unknown) => setActionError(e instanceof Error ? e.message : "โหลดรายการโจทย์ไม่สำเร็จ"));
  }, [pickMode, problems]);

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    if (pickMode === "choose" && (picked.some((id) => !id) || new Set(picked).size !== 3)) {
      setActionError("เลือกโจทย์ให้ครบ 3 ข้อและไม่ซ้ำกัน");
      return;
    }
    setCreating(true);
    try {
      const room = await apiRequest<Match>("/api/v1/matches", {
        method: "POST",
        body: JSON.stringify({
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(pickMode === "choose" ? { problemIds: picked } : {}),
        }),
      });
      router.push(`/matches/${room.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "สร้างห้องไม่สำเร็จ");
      setCreating(false);
    }
  }

  async function joinRoom(id: string) {
    setJoining(id);
    setActionError("");
    try {
      await apiRequest<Match>(`/api/v1/matches/${id}/participants`, { method: "POST" });
      router.push(`/matches/${id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "เข้าร่วมห้องไม่สำเร็จ");
      setJoining(null);
      void loadRooms().catch(() => undefined);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <form
        onSubmit={(event) => void createRoom(event)}
        aria-labelledby="create-room-heading"
        className="space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm xl:col-span-2"
      >
        <h2 id="create-room-heading" className="flex items-center gap-2 font-display text-headline-md text-on-surface">
          <Plus aria-hidden className="size-6 text-primary" />
          สร้างห้องแข่ง
        </h2>
        {hostingId ? (
          <Notice tone="success">
            คุณมีห้องที่รอคู่แข่งอยู่แล้ว{" "}
            <Link href={`/matches/${hostingId}`} className="font-bold underline">
              ไปที่ห้องของคุณ
            </Link>
          </Notice>
        ) : (
          <>
            <div>
              <label htmlFor="room-title" className="mb-1 block text-label-md text-on-surface">
                ชื่อห้อง (ไม่บังคับ)
              </label>
              <input
                id="room-title"
                value={title}
                maxLength={60}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="เช่น ห้องฝึก Loop ของกลุ่ม 2"
                className={inputClass}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-label-md text-on-surface">โจทย์ 3 ข้อ</legend>
              <label className="flex min-h-11 items-center gap-2 text-body-md">
                <input type="radio" name="pick" checked={pickMode === "random"} onChange={() => setPickMode("random")} />
                ให้ระบบสุ่มจากโจทย์ที่อาจารย์เปิดไว้
              </label>
              <label className="flex min-h-11 items-center gap-2 text-body-md">
                <input type="radio" name="pick" checked={pickMode === "choose"} onChange={() => setPickMode("choose")} />
                เลือกโจทย์เอง
              </label>
            </fieldset>
            {pickMode === "choose" && (
              <div className="space-y-3">
                {problems === null ? (
                  <p className="text-label-md text-on-surface-variant" role="status">
                    กำลังโหลดรายการโจทย์…
                  </p>
                ) : problems.length < 3 ? (
                  <p className="text-label-md text-on-surface-variant">ยังมีโจทย์ไม่ถึง 3 ข้อ — ให้อาจารย์เพิ่มโจทย์ก่อน</p>
                ) : (
                  [0, 1, 2].map((slot) => (
                    <div key={slot}>
                      <label htmlFor={`room-problem-${slot}`} className="mb-1 block text-label-md text-on-surface">
                        ข้อที่ {slot + 1}
                      </label>
                      <select
                        id={`room-problem-${slot}`}
                        value={picked[slot]}
                        onChange={(event) =>
                          setPicked((all) => all.map((id, i) => (i === slot ? event.target.value : id)))
                        }
                        className={inputClass}
                      >
                        <option value="">— เลือกโจทย์ —</option>
                        {problems.map((problem) => (
                          <option key={problem.id} value={problem.id}>
                            {problem.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            )}
            <button type="submit" disabled={creating || disabled} className={`${primaryButtonClass} w-full`}>
              {creating ? "กำลังสร้างห้อง…" : "สร้างห้องและรอคู่แข่ง"}
            </button>
          </>
        )}
        {actionError ? <Notice>{actionError}</Notice> : null}
      </form>

      <section aria-labelledby="rooms-heading" className="space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="rooms-heading" className="flex items-center gap-2 font-display text-headline-md text-on-surface">
            <DoorOpen aria-hidden className="size-6 text-primary" />
            ห้องแข่ง
          </h2>
          <div role="tablist" aria-label="ประเภทห้อง" className="flex gap-2">
            {(
              [
                ["WAITING", "รอคู่แข่ง"],
                ["ACTIVE", "กำลังแข่ง"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => {
                  setRooms(null);
                  setTab(value);
                }}
                className={`min-h-11 rounded-lg px-4 text-label-md ${
                  tab === value ? "bg-brand-navy text-white" : "bg-surface-container-high text-on-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-label-md text-on-surface-variant">อัปเดตอัตโนมัติทุก 3 วินาที</p>

        {listError ? <Notice>{listError}</Notice> : null}
        {rooms === null ? (
          <p className="text-body-md text-on-surface-variant" role="status">
            กำลังโหลดห้อง…
          </p>
        ) : rooms.length === 0 ? (
          <EmptyState
            title={tab === "WAITING" ? "ยังไม่มีห้องที่รอคู่แข่ง" : "ยังไม่มีห้องที่กำลังแข่ง"}
            description={tab === "WAITING" ? "สร้างห้องของคุณเอง แล้วชวนเพื่อนมากดเข้าร่วม" : "ห้องที่เริ่มแข่งแล้วจะแสดงที่นี่"}
          >
            <Button type="button" variant="secondary" onClick={() => void loadRooms().catch(() => undefined)}>
              โหลดรายการห้องอีกครั้ง
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {rooms.map((room) => (
              <li key={room.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="break-words text-body-md font-bold text-on-surface">
                    {room.title ?? `ห้องของ ${room.playerOne.displayName}`}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-label-md text-on-surface-variant">
                    {room.status === "WAITING" ? (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <Users aria-hidden className="size-4" />
                          {room.playerOne.displayName} · {room.playerOne.eloRating} Elo
                        </span>
                        <span>{since(room.createdAt, now)}</span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Swords aria-hidden className="size-4" />
                        {room.playerOne.displayName} {room.playerOneWins} – {room.playerTwoWins}{" "}
                        {room.playerTwo?.displayName ?? "-"}
                        {room.currentRound ? ` · ข้อที่ ${room.currentRound}/3` : " · รอเริ่ม"}
                      </span>
                    )}
                  </p>
                </div>
                {room.isMine ? (
                  <Link href={`/matches/${room.id}`} className={primaryButtonClass}>
                    เข้าห้องของคุณ
                  </Link>
                ) : room.status === "WAITING" ? (
                  <Button
                    type="button"
                    busy={joining === room.id}
                    disabled={joining !== null || disabled || Boolean(hostingId)}
                    disabledReason={hostingId ? "ปิดห้องของคุณก่อนเข้าร่วมห้องอื่น" : undefined}
                    onClick={() => void joinRoom(room.id)}
                  >
                    เข้าร่วม
                  </Button>
                ) : (
                  <span className="text-label-md text-on-surface-variant">กำลังแข่ง</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
