# Pyodide 314.0.7 (ไฟล์ที่ host เองในเว็บ)

- ที่มา: npm `pyodide@314.0.7` (https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz)
- License: Mozilla Public License 2.0 (MPL-2.0) — https://github.com/pyodide/pyodide/blob/main/LICENSE
- ใช้รัน Python ของผู้ใช้ใน Web Worker ของเบราว์เซอร์ (`frontend/src/lib/python-run.ts`) — ไม่โหลดจาก CDN และไม่ส่งโค้ด/ข้อมูลออกนอกระบบ
- ไม่ได้แก้ไขไฟล์ · คัดมาเฉพาะแกน (ไม่มีแพ็กเกจเสริมอย่าง numpy)
- **สถานะตามมาตรฐาน:** เป็นไลบรารีนอก whitelist (ARC-02) ที่ไม่ได้ติดตั้งผ่าน npm — PL ตัดสินใจใช้ (8 ต.ค. 2569) ต้องยื่นขอข้อยกเว้นหาก PM/DevOps ขอ
