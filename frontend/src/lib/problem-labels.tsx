export const CATEGORY_LABELS: Record<string, string> = {
  BASICS: "พื้นฐาน",
  CONDITIONS: "เงื่อนไข",
  LOOPS: "ลูป",
  STRINGS: "ข้อความ",
  LISTS: "ลิสต์",
  MATH: "คณิตศาสตร์",
  ALGORITHMS: "อัลกอริทึม",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "ง่าย",
  MEDIUM: "ปานกลาง",
  HARD: "ยาก",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS);
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS);

const DIFFICULTY_TONE: Record<string, string> = {
  EASY: "bg-success/15 text-on-surface",
  MEDIUM: "bg-brand-amber/25 text-on-surface",
  HARD: "bg-error-container text-on-error-container",
};

export function ProblemTags({ category, difficulty }: { category?: string; difficulty?: string }) {
  return (
    <span className="inline-flex flex-wrap gap-2 text-label-sm">
      {category ? (
        <span className="rounded-full bg-primary-container/10 px-3 py-1 text-primary-container">
          {CATEGORY_LABELS[category] ?? category}
        </span>
      ) : null}
      {difficulty ? (
        <span className={`rounded-full px-3 py-1 ${DIFFICULTY_TONE[difficulty] ?? ""}`}>
          {DIFFICULTY_LABELS[difficulty] ?? difficulty}
        </span>
      ) : null}
    </span>
  );
}
