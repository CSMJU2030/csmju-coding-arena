import type { Metadata } from "next";
import { LanguageDirectory } from "@/components/language-directory";

export const metadata: Metadata = { title: "ภาษาทั้งหมด · Coding Arena" };

export default function LanguagesPage() {
  return <LanguageDirectory />;
}
