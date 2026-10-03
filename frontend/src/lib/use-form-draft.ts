"use client";
import { useEffect, useRef, useState } from "react";

/** Store only an unfinished domain form, never identity or authentication credentials. */
export function useFormDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const ready = useRef(false);
  useEffect(() => {
    ready.current = false;
    const timer = window.setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(
          sessionStorage.getItem(key) ?? "null",
        );
        if (
          saved &&
          typeof saved === "object" &&
          Object.entries(initial).every(
            ([name, item]) =>
              name in saved &&
              typeof saved[name as keyof typeof saved] === typeof item,
          )
        ) {
          setValue(saved as T);
        }
      } catch {
        /* A malformed or blocked draft must not prevent editing. */
      }
      ready.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, initial]);
  useEffect(() => {
    if (!ready.current) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage may be disabled. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
