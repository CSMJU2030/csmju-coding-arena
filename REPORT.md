# REPORT — csmju-coding-arena

วันที่ตรวจ: 3 ตุลาคม 2026

## ผลรัน

ยังไม่ผ่าน conformance ครบตามมาตรฐาน และยังไม่พร้อมเปิดใช้ SSO จริง

แก้ GH-04 โดยปรับ standards submodule ให้ชี้แท็ก v1.7.0 ที่ commit
`88c4ce86271df943da1ffd1fde80633dfdd16a47` ให้ตรง `.standards-version`
การแก้นี้เปลี่ยนเฉพาะ pointer และรายงาน ไม่เปลี่ยนโค้ดระบบ

ตัวตรวจ static รอบก่อนแก้ GH-04 แสดง 18 PASS และ 1 FAIL จาก 19 scripts
ในจำนวน PASS มี 2 scripts ที่ข้ามการตรวจเพราะเครื่องไม่มี jq จึงไม่ถือว่าทั้ง 18 รายการตรวจครบ
ตรวจ whitelist dependency และการสร้าง OpenAPI/API types ซ้ำเพิ่มเติมด้วย Node แล้วผ่าน

```text
  ✅ PASS  API Contract Sync           check-api-conventions.sh
  ✅ PASS  Data Dictionary Compliance  check-field-aliases.sh
  ✅ PASS  Data Dictionary Compliance  check-snake-case.sh
  ✅ PASS  Data Dictionary Compliance  check-no-hardcoded-faculty.sh
  ✅ PASS  Data Dictionary Compliance  check-money-fields.sh
  ✅ PASS  UI Token Compliance         check-ui-tokens.sh
  ✅ PASS  Code Quality                check-qa.sh
  ✅ PASS  Exception Validation        check-exceptions.sh

❌ 1 / 19 checks failed — merge would be blocked.
```

สาเหตุ GH-04 ในผลรันครั้งก่อน: `.standards-version` ระบุ 1.7.0 แต่ submodule ชี้
`b0e3645e0ad4cc649a229513cdce37c980d02c30` แทนแท็ก v1.7.0
ที่ `88c4ce86271df943da1ffd1fde80633dfdd16a47`
ปัจจุบันปรับ pointer ให้ตรงแท็กแล้ว และเก็บผลรันครั้งก่อนข้างบนไว้เป็นประวัติ

```text
CSMJU2030 Subsystem Conformance Runner
standard      : v1.2
subsystem     : csmju-coding-arena
base url      : http://localhost:3202
core hub      : https://csmju2030.jowave.com
level         : L3

ERROR: ไม่ได้ตั้ง CONFORMANCE_ACCOUNTS_FILE — core_hub_url ไม่ใช่ Core Hub ในเครื่อง
runner หยุดก่อน login บัญชีใด ๆ
```

ข้อความ v1.2 ด้านบนเป็นข้อความที่ runner ปัจจุบันพิมพ์ ไม่ได้แก้ต้นฉบับมาตรฐาน
ไม่มีผลสรุป passed/failed/skipped ของ runtime เนื่องจาก runner เริ่มทดสอบไม่ได้

ผลตรวจโค้ดและการทำงาน:

| รายการ | ผล |
|---|---|
| Lint frontend/backend | PASS |
| Typecheck frontend/backend | PASS |
| Unit tests backend | 172 passed, 0 failed |
| API client tests frontend | 11 passed, 0 failed |
| Production build frontend/backend | PASS |
| Migrations ทั้ง 3 ชุดบน PostgreSQL 16 ชั่วคราว | PASS |
| แข่งขันบน PostgreSQL และ Docker จริง | PASS |
| HTTP API กับ JWKS จำลอง | PASS |
| Dependency เทียบ whitelist | PASS ตรวจเพิ่มเติมด้วย Node |
| OpenAPI และ types สร้างซ้ำตรงทุกไบต์ | PASS ตรวจเพิ่มเติมด้วย Node |
| Auth/common/core-hub production files ตรง reference | PASS ยกเว้น role-mapping และ permissions ที่ปรับตามโดเมน |

การแข่งขันตรวจการจับคู่ซ้ำ ใช้โจทย์ร่วมกัน 3 ข้อไม่ซ้ำ จำกัดผู้เข้าร่วมและคำตอบที่รอตรวจ
ตัดสินคำตอบที่ส่งทันแต่ตรวจเสร็จหลังหมดเวลา จบเกมที่ 2 ชัยชนะ อัปเดต Elo เพียงครั้งเดียว
และห้ามอาจารย์เปลี่ยนโจทย์หรือเฉลยระหว่างเกม
Docker ตรวจคำตอบปกติ เวลารันเกินกำหนด การพยายามปิดตัวจับเวลา การเขียน filesystem ระบบ
และการเชื่อมต่อออกเครือข่าย

HTTP API ตรวจ JWT RS256 ผ่าน JWKS จำลอง การแยกบทบาท 400/401/403/404, pagination,
อาจารย์จัดการชุดทดสอบ นักเรียนดูเฉลยลับไม่ได้ และ callback ที่ไม่มี state cookie
ไม่มีการใช้บัญชีหรือข้อมูลนักศึกษาจริงในการทดสอบ

ตรวจ UI นักเรียนและอาจารย์ใน browser ด้วยข้อมูลจำลอง
หน้าฟอร์มอาจารย์ที่ viewport 360px ไม่ล้นแนวนอน และช่องกรอกใช้ font 16px
ยังไม่ได้ตรวจ UI ผ่าน SSO จริงหรือรับรองตรง template ทุกไบต์

หมายเหตุเครื่องมือ: pnpm wrapper ในเครื่องพยายามติดตั้ง modules ซ้ำก่อนรัน scripts
การตรวจ QA ตั้ง `pnpm_config_verify_deps_before_run=false` เฉพาะ process
หลังติดตั้ง dependency และ lockfile สำเร็จแล้ว ไม่ได้แก้ค่าตรวจ dependency ของโปรเจกต์หรือ CI

## ไฟล์ที่สร้าง/แก้ไข

- `backend/src/auth/`, `backend/src/common/`, `backend/src/core-hub/` — ใช้สัญญากลางจาก demo
- `backend/src/auth/role-mapping.ts`, `permissions.ts` — บทบาทและสิทธิ์ของระบบนี้
- `backend/src/matches/` — การล็อกจับคู่/ส่งคำตอบ การตัดสินตามเวลาส่ง และการแข่งขัน 2 ใน 3
- `backend/src/evaluation/` — รัน Python ใน Docker แยกเครือข่าย จำกัด CPU/memory/process/output
  พร้อมกู้คืนงานค้างและไม่ลงโทษนักเรียนเมื่อเครื่องตรวจไม่พร้อม
- `backend/src/problems/`, `test-cases/`, `submissions/`, `users/` — permission, pagination,
  คะแนนและชื่อผู้เล่นของโดเมน แยกจากข้อมูลตัวตน
- `backend/prisma/schema.prisma`, migration `202610030002_arena_compliance` —
  เปลี่ยน users เป็น player_ratings โดยรักษา foreign keys/คะแนน เพิ่มเวลาสำหรับงานตรวจ
- `backend/src/contracts/`, `generate-openapi.ts`, `backend/openapi.json`,
  `frontend/src/lib/api-schema.d.ts` — สัญญา API และ types ที่สร้างจาก backend
- `backend/test/competition.integration.ts`, `api.integration.ts` — ทดสอบธุรกิจและ API บนฐานข้อมูลชั่วคราว
- `frontend/src/components/`, `frontend/src/app/` — หน้าแยกบทบาท ฟอร์ม สถานะข้อมูล
  เมนูมือถือ labels/focus และ loading/error/not-found ตาม route
- `frontend/src/lib/api.ts`, `use-form-draft.ts` — ต่ออายุผ่าน SSO และเก็บร่างฟอร์ม/โค้ดโดยไม่เก็บ token
- `.env.example`, `backend/.env.example`, `subsystem.yaml`, `README.md`, package files —
  ชื่อระบบ พอร์ต callback วิธีเริ่ม และ dependency ที่อนุญาต

## ชั้น auth ที่คัดลอกมา

คัดลอกจาก `CSMJU2030/demo-student-subsystem` ลงทั้ง auth/common/core-hub รวม
verifier, JWKS, SSO controller/session, decorators/guards, response interceptor,
exception filter และ Core Hub client/cache
ตรวจไฟล์ production ตรงทุกไบต์กับ reference ยกเว้น `role-mapping.ts` และ `permissions.ts`
เพิ่ม `RequestRateGuard` แยกต่างหาก ไม่เปลี่ยนตรรกะ reference
ปรับ unit tests ของ role/permissions ให้ตรงกับ Coding Arena

## Role mapping ที่ประกาศ

| Core role | Subsystem role | สิทธิ์หลัก |
|---|---|---|
| student | STUDENT | แข่งขัน ส่งคำตอบ ดูอันดับและโจทย์ |
| lecturer | STAFF | เพิ่ม/แก้ไข/ปิดทุกโจทย์ และเพิ่ม/แก้ไข/ลบชุดทดสอบ |

บทบาทอื่นปฏิเสธ ต้องลง mapping นี้ในทะเบียน Core Hub ให้ตรงกัน
ไม่มีบัญชีล็อกอินหรือ local identity/session table ในระบบ
player_ratings เก็บเพียง reference ID ชื่อเล่นที่ระบบสร้าง และคะแนนการแข่งขัน

## ข้อสมมติที่ตั้งเอง

1. ใช้พอร์ต frontend 3209/backend 4209 ตามโปรเจกต์นี้ ต้องให้ผู้ดูแลยืนยันว่าเป็นพอร์ตทีม
2. รองรับ Python และใช้เวลาแต่ละข้อ 10 นาที ตามโค้ดเดิม
3. เกมที่ครบ 3 ข้อแล้วไม่มีผู้ชนะ 2 ข้อถือว่าเสมอ Elo คิดแบบผลเสมอ
4. Elo เริ่ม 1200, K=32; แสดงอันดับเฉพาะผู้มีผลแข่งขัน และใช้ชื่อผู้เล่นแทนข้อมูลคนจาก Core Hub
5. การลบโจทย์เป็นปิดใช้งาน เพื่อรักษาประวัติการแข่งขัน

## สิ่งที่ยังทำไม่ได้ / เคสที่ยังไม่ผ่าน

- Core Hub ยังไม่ได้ลงทะเบียนและเปิดใช้งาน `csmju-coding-arena`
  ค่า Callback URL ที่ต้องลงทะเบียนคือ `http://localhost:3209/auth/callback`
- ไม่พบไฟล์บัญชีทดสอบสำหรับ Core Hub จริง จึงยังรัน L1–L3 และ SSO จริงไม่ได้
  ห้ามนับผล mock เป็นการผ่าน runtime conformance
- ยังเข้าถึง template UI กลางไม่ได้ แหล่งที่ลองอ่านคืน 404
  components ปัจจุบันเป็น provisional ตามเอกสารและ tokens ไม่ใช่สำเนา template กลาง
  ใช้ CsmjuAppShell, Button, Notice, LoadingState, EmptyState, ErrorState, ConfirmDialog,
  FieldError และ CodeEditor; ยังต้องเทียบต้นฉบับ globals/components เมื่อเข้าถึงได้
- สอง static scripts ข้ามเพราะไม่มี jq ต้องตรวจจริงใน CI เพิ่มเติม แม้ตรวจ logic ที่เกี่ยวข้องด้วย Node แล้ว
- CI เดิม pin reusable workflow v1.5.2 ไม่ได้แก้ไฟล์ที่มาตรฐานป้องกันไว้
  ต้องให้ผู้ดูแล DevOps ตรวจการอัปเดตให้ตรงมาตรฐานที่เลือก
- Rate limiting ปัจจุบันเป็นหน่วยความจำต่อ backend process เหมาะกับการเปิดใช้เครื่องเดียว
  ก่อนหลาย instances ต้องมีข้อกำหนดการจำกัดร่วมจากผู้ดูแล
- ยังไม่ได้ migrate ฐานข้อมูลผู้ใช้จริง ทดสอบ migration เฉพาะฐานข้อมูลชั่วคราว
  สำรองข้อมูลก่อน deploy ตามขั้นตอนทีม

เซิร์ฟเวอร์ UI จำลองและฐานข้อมูลทดสอบใช้เฉพาะการตรวจงาน ไม่เป็นส่วนหนึ่งของระบบที่ deploy
