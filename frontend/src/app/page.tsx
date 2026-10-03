"use client";

import {
  LoadingState,
  ErrorState,
  PageHeader,
  primaryButtonClass,
} from "@/components/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, apiRequest } from "@/lib/api";

interface Profile {
  coreRole: string;
}

export default function Home() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<Profile>("/api/v1/me")
      .then((profile) => {
        if (!active) return;
        if (profile.coreRole === "student") router.replace("/student");
        else if (profile.coreRole === "lecturer")
          router.replace("/teacher/problems");
        else setError("บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน Coding Arena");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (
          requestError instanceof ApiRequestError &&
          requestError.status === 403
        ) {
          setError("บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน Coding Arena");
        } else if (
          !(requestError instanceof ApiRequestError) ||
          requestError.status !== 401
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ",
          );
        }
        setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (checkingSession && !error) {
    return <LoadingState label="กำลังตรวจสอบบัญชีผู้ใช้..." />;
  }

  if (error)
    return (
      <ErrorState message={error} onRetry={() => window.location.reload()} />
    );
  return (
    <section className="mx-auto flex min-h-96 max-w-3xl flex-col justify-center gap-8">
      <PageHeader
        title="ประลองโจทย์อัลกอริทึมแบบตัวต่อตัว"
        eyebrow="CSMJU2030 · สนามแข่งขันอัลกอริทึม"
        description="จับคู่กับนักศึกษาคนอื่น แก้โจทย์ชุดเดียวกันแบบชนะ 2 ใน 3 ข้อ และสะสม Elo เพื่อไต่อันดับบนกระดานผู้นำ"
      />

      <a className={`${primaryButtonClass} w-fit`} href="/auth/login?next=%2F">
        เข้าสู่ระบบด้วย Core Hub
      </a>
    </section>
  );
}
