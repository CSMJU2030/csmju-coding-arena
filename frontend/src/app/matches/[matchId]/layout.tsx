import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "การแข่งขันตัวต่อตัว · Coding Arena · CSMJU",
};

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
