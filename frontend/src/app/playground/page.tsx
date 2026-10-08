import type { Metadata } from "next";
import { Suspense } from "react";
import { Playground } from "@/components/playground";
import { LoadingState } from "@/components/ui";

export const metadata: Metadata = { title: "คอมไพเลอร์ออนไลน์ · Coding Arena" };

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<LoadingState label="กำลังเปิดคอมไพเลอร์..." />}>
      <Playground />
    </Suspense>
  );
}
