/**
 * สิทธิ์ฝั่งหน้าเว็บ — อิง `subsystemRole` จาก `/api/v1/me` (ผลของ role-mapping ฝั่ง backend)
 * ไม่ใช้ coreRole ตรง ๆ เพื่อให้ตรงกับที่ backend อนุญาตเสมอ (backend ตรวจซ้ำทุกคำขออยู่แล้ว)
 *
 *   student          → STUDENT  ประลอง 1 ต่อ 1 · ส่งคำตอบ
 *   staff · lecturer → STAFF    จัดการโจทย์และชุดทดสอบ
 *   admin            → ADMIN    เหมือน STAFF
 *   alumni · guest   → ALUMNI   ดูโจทย์ · อันดับ · ใช้คอมไพเลอร์ออนไลน์
 */
export interface RoleProfile {
  coreRole: string;
  subsystemRole?: string;
}

export const canPlay = (p: RoleProfile | null | undefined) => p?.subsystemRole === "STUDENT";

export const canManage = (p: RoleProfile | null | undefined) =>
  p?.subsystemRole === "STAFF" || p?.subsystemRole === "ADMIN";

export function homeFor(p: RoleProfile): string {
  if (canPlay(p)) return "/student";
  if (canManage(p)) return "/teacher/problems";
  return "/";
}

const ROLE_LABELS: Record<string, string> = {
  student: "นักศึกษา",
  alumni: "ศิษย์เก่า",
  staff: "บุคลากร",
  lecturer: "อาจารย์",
  guest: "ผู้เยี่ยมชม",
  admin: "ผู้ดูแลระบบ",
};

export const roleLabel = (p: RoleProfile) => ROLE_LABELS[p.coreRole] ?? p.coreRole;
