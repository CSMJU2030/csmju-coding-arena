"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { validationFields } from "@/lib/api";

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  function capture(error: unknown, form: string) {
    const fields = validationFields(error);
    setErrors(
      Object.fromEntries(
        Object.entries(fields).map(([field, message]) => [
          `${form}-${field}`,
          message,
        ]),
      ),
    );
    const first = Object.keys(fields)[0];
    if (first)
      document
        .querySelector<HTMLElement>(`#${form} [name="${first}"]`)
        ?.focus();
  }
  return { errors, capture, clear: () => setErrors({}) };
}

export function FieldError({
  name,
  errors,
}: {
  name: string;
  errors: Record<string, string>;
}) {
  return errors[name] ? (
    <p id={`${name}-error`} className="mt-2 text-body-md text-error">
      {errors[name]}
    </p>
  ) : null;
}

const buttonBase =
  "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 py-3 text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container disabled:cursor-not-allowed disabled:opacity-40";
export const primaryButtonClass = `${buttonBase} btn-gradient text-on-primary shadow-md`;
export const secondaryButtonClass = `${buttonBase} border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant/50 active:bg-surface-container-high`;
export const inputClass =
  "input-field min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface placeholder:text-outline";
export const cardClass =
  "rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm";

export function Button({
  variant = "primary",
  busy = false,
  disabledReason,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabledReason?: string;
}) {
  const reasonId = useId();
  const reason = busy ? "กำลังดำเนินการ กรุณารอสักครู่" : disabledReason;
  const style =
    variant === "danger"
      ? `${buttonBase} border border-error bg-error text-on-primary hover:bg-on-error-container`
      : variant === "secondary"
        ? secondaryButtonClass
        : primaryButtonClass;
  return (
    <>
      <button
        {...props}
        type={type}
        disabled={disabled || busy}
        aria-busy={busy}
        aria-describedby={
          disabled || busy
            ? reason
              ? reasonId
              : props["aria-describedby"]
            : props["aria-describedby"]
        }
        title={disabled || busy ? reason : props.title}
        className={`${style} ${busy ? "btn-loading" : ""} ${className}`}
      >
        <span className="btn-text">{children}</span>
        {busy && (
          <span className="dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>
      {(disabled || busy) && reason && (
        <span id={reasonId} className="sr-only">
          {reason}
        </span>
      )}
    </>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <header className="fade-slide-up space-y-2">
      {eyebrow && <p className="text-label-md text-primary">{eyebrow}</p>}
      <h1 className="break-words font-display text-headline-md font-bold md:text-headline-lg">
        {title}
      </h1>
      {description && (
        <p className="max-w-prose text-body-md text-on-surface-variant">
          {description}
        </p>
      )}
    </header>
  );
}

export function Notice({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg p-4 text-body-md ${tone === "error" ? "bg-error-container text-on-error-container" : "bg-success/10 text-on-surface"}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
  headingLevel = "h2",
}: {
  title: string;
  description: string;
  children: ReactNode;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <div
      className={`${cardClass} flex flex-col items-center gap-4 p-6 text-center md:p-8`}
    >
      <svg
        aria-hidden="true"
        className="h-12 w-12 text-outline"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path d="M4 7h16v13H4zM3 7l3-4h12l3 4M9 11h6" />
      </svg>
      <div className="space-y-2">
        <Heading className="font-display text-headline-md">{title}</Heading>
        <p className="max-w-prose text-body-md text-on-surface-variant">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function LoadingState({
  label = "กำลังโหลดข้อมูล...",
}: {
  label?: string;
}) {
  const [longWait, setLongWait] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLongWait(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div className="space-y-3 motion-safe:animate-pulse" aria-hidden="true">
        <div className="h-8 w-2/3 rounded-lg bg-surface-container-high" />
        <div className="h-4 w-full rounded-lg bg-surface-container-high" />
      </div>
      <div
        className={`${cardClass} space-y-4 p-6 motion-safe:animate-pulse`}
        aria-hidden="true"
      >
        <div className="h-5 w-1/2 rounded-lg bg-surface-container-high" />
        <div className="h-20 rounded-lg bg-surface-container-low" />
        <div className="h-11 w-32 rounded-lg bg-surface-container-high" />
      </div>
      <p
        className={
          longWait ? "text-body-md text-on-surface-variant" : "sr-only"
        }
      >
        {label}
      </p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  loginHref,
  missing = false,
}: {
  message: string;
  onRetry?: () => void;
  loginHref?: string;
  missing?: boolean;
}) {
  return (
    <EmptyState
      headingLevel="h1"
      title={
        loginHref
          ? "เข้าสู่ระบบเพื่อใช้งาน"
          : missing
            ? "ไม่พบข้อมูล"
            : message.includes("ไม่มีสิทธิ์")
              ? "ไม่มีสิทธิ์เข้าถึง"
              : "โหลดข้อมูลไม่สำเร็จ"
      }
      description={message}
    >
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={secondaryButtonClass}>
          กลับหน้าหลัก
        </Link>
        {loginHref ? (
          <a href={loginHref} className={primaryButtonClass}>
            เข้าสู่ระบบด้วย Core Hub
          </a>
        ) : (
          onRetry && <Button onClick={onRetry}>ลองอีกครั้ง</Button>
        )}
      </div>
    </EmptyState>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  busy,
  onCancel,
  onConfirm,
  confirmLabel = "ลบ",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    cancel.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl border-0 bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-on-surface/40"
    >
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-headline-md">
            {title}
          </h2>
          <button
            ref={cancel}
            aria-label="ปิด"
            disabled={busy}
            onClick={onCancel}
            className={secondaryButtonClass}
            type="button"
          >
            ×
          </button>
        </div>
        <div
          id={bodyId}
          className="space-y-3 text-body-md text-on-surface-variant"
        >
          {children}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button variant="danger" busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

const submissionLabels: Record<string, string> = {
  PENDING: "รอตรวจคำตอบ",
  EVALUATING: "กำลังตรวจคำตอบ",
  ACCEPTED: "คำตอบถูกต้อง",
  WRONG_ANSWER: "คำตอบไม่ถูกต้อง",
  TIME_LIMIT_EXCEEDED: "ใช้เวลาเกินกำหนด",
  RUNTIME_ERROR: "เกิดข้อผิดพลาดขณะรัน",
  COMPILATION_ERROR: "โค้ดไม่ผ่านการแปลโปรแกรม",
};
export function SubmissionStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-label-sm ${status === "ACCEPTED" ? "bg-success/10 text-on-surface" : ["PENDING", "EVALUATING"].includes(status) ? "bg-primary-container/10 text-primary-container" : "bg-error-container text-on-error-container"}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {submissionLabels[status] ?? "ยังไม่มีผลตรวจ"}
    </span>
  );
}
