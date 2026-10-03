import Link from "next/link";
import { EmptyState, secondaryButtonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      headingLevel="h1"
      title="ไม่พบหน้าที่คุณกำลังค้นหา"
      description="ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายแล้ว"
    >
      <Link href="/" className={secondaryButtonClass}>
        กลับหน้าหลัก
      </Link>
    </EmptyState>
  );
}
