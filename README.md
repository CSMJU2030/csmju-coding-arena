# csmju-coding-arena

Coding Arena — ระบบย่อยของโครงการ CSMJU2030

มาตรฐานกลางอยู่ใน `standards/` (submodule ของ CSMJU2030/csmju2030-standards)
ใช้ standards v1.8.1 ตาม `.standards-version`

## เปิดระบบในเครื่อง

ใช้ Node.js 22, pnpm 12.3.4, PostgreSQL 16 และ Docker ที่รองรับ Linux containers
Frontend ใช้พอร์ต 3209 และ backend ใช้ 4209 โดย browser เข้าผ่าน frontend เท่านั้น

```bash
git submodule update --init
pnpm install
docker pull python:3.12-alpine
```

คัดลอก `backend/.env.example` เป็น `backend/.env.local` แล้วกรอก DATABASE_URL ของฐานข้อมูลระบบย่อย
หรือกรอก DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD ให้ครบ ใช้พอร์ตฐานข้อมูลที่ทีมได้รับ เช่น 5433
ห้ามใช้ฐานข้อมูล Core Hub

```bash
pnpm --filter backend exec prisma migrate deploy
pnpm dev
```

เปิด `http://localhost:3209` การเข้าสู่ระบบจะส่งไป Core Hub ไม่มีบัญชีหรือรหัสผ่านใน Coding Arena
ตัวตรวจคำตอบต้องเข้าถึง Docker ได้ หาก Docker ไม่พร้อม คำตอบจะคงสถานะรอตรวจและลองใหม่โดยไม่ตัดสินแพ้

## ทดลองรันแบบ container ตามมาตรฐาน deploy

คำสั่งนี้ build และเริ่ม PostgreSQL, API และ web ตาม production layout โดย web เปิดที่พอร์ต 3209
และฐานข้อมูลเดิมจะเก็บอยู่ใน Docker volume:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api
```

ทั้งสาม service ต้อง healthy ก่อนลอง login ผ่าน `http://localhost:3209` ใน Chrome
หยุด container โดยเก็บข้อมูลไว้ด้วย `docker compose down` (อย่าใช้ `-v` หากต้องการเก็บฐานข้อมูล)

ถ้าต้องการทดสอบตัวตรวจโค้ดจาก API container ในเครื่อง ให้ใช้ compose override นี้แทน (ใช้ Docker socket เฉพาะ Docker Desktop ในเครื่อง):

```bash
docker compose -f docker-compose.yml -f docker-compose.local-judge.yml up -d --build
```

ก่อนเปิดใช้การตรวจโค้ดบน server ต้องได้รับอนุมัติจาก PM และให้ DevOps จัด Docker daemon แบบ rootless สำหรับงานนี้
แล้วกำหนด `DOCKER_HOST` และเตรียม image `JUDGE_IMAGE` ที่ปักหมุด digest ไว้ ห้ามเชื่อม `/var/run/docker.sock` ของ daemon หลักเข้ากับ API container

## ลงทะเบียนใน Core Hub

ระบบนี้ยังไม่ได้ลงทะเบียนและเปิดใช้งาน ต้องให้เจ้าของระบบลงทะเบียนและผู้ดูแลอนุมัติก่อนทดสอบ SSO จริง

| รายการ | ค่า |
|---|---|
| Subsystem ID | `csmju-coding-arena` |
| Base URL | `http://localhost:3209` |
| Callback URL | `http://localhost:3209/auth/callback` |
| Role mapping | `student → STUDENT` · `alumni → ALUMNI` · `staff → STAFF` · `lecturer → STAFF` · `guest → ALUMNI` · `admin → ADMIN` |

รูปแบบ callback ใช้พอร์ต frontend ตาม `standards/docs/connect-core-hub.md` พอร์ตของทีมนี้คือ 3209
เมื่อขึ้น host จริง ต้องให้ผู้ดูแลเปลี่ยน Base URL และ Callback URL เป็น HTTPS และใช้ NODE_ENV=production

## การแข่งขันและหน้าอาจารย์

- นักเรียนจับคู่ 1 ต่อ 1 สุ่มโจทย์ที่เปิดใช้งานและมีชุดทดสอบ 3 ข้อไม่ซ้ำกัน ทั้งคู่ใช้ชุดเดียวกัน นาฬิกาเริ่มเมื่อผู้เล่นทั้งสองเปิดสนามแล้ว
- แต่ละข้อมีเวลา 10 นาที คำตอบที่ถูกและส่งก่อนชนะ รอผลคำตอบที่ส่งก่อนหน้านั้นก่อนตัดสิน
- ชนะครบ 2 ข้อจบเกม หากครบ 3 ข้อแล้วยังไม่มีใครชนะ 2 ข้อ เกมเสมอ
- Elo เริ่ม 1200 ใช้ K=32 และอัปเดตครั้งเดียวต่อเกม อันดับแสดงผู้ที่มีผลแข่งขันสูงสุด 5 คน
- อาจารย์เพิ่ม แก้ไข และปิดโจทย์ รวมถึงจัดการชุดทดสอบได้ทุกโจทย์
  ระหว่างโจทย์ถูกใช้ในเกมที่ยังไม่จบ จะไม่อนุญาตให้เปลี่ยนโจทย์หรือเฉลย การปิดโจทย์เก็บประวัติเดิมไว้
- รองรับ Python ปัจจุบันใช้ช่องเขียนโค้ดที่รองรับคีย์บอร์ดและมือถือ

## คอมไพเลอร์ออนไลน์หลายภาษา (Polyglot)

หน้า `/playground` และ `/languages` · API `GET /api/v1/languages` และ `POST /api/v1/code-runs`

- **JavaScript และ HTML/CSS** รันในเบราว์เซอร์ของผู้ใช้ (Web Worker / iframe แบบ sandbox) ใช้ได้ทันทีไม่ต้องมี server รันโค้ด
- **ภาษาอื่น** รันใน image `judge/polyglot` (Debian + toolchain ราว 100 ภาษา) ผ่าน Docker ตาม `DOCKER_HOST`
  คำสั่ง compile/run ทุกภาษาอยู่ที่ `backend/src/languages/languages.ts` ไฟล์เดียว · ผู้ใช้ส่งได้แค่ซอร์สโค้ดกับ stdin
- รันทีละงาน (`POLYGLOT_CONCURRENCY`) คิวรอไม่เกิน `POLYGLOT_QUEUE` · ผู้ใช้หนึ่งคนรันได้ครั้งละงาน · ไม่ log โค้ดหรือ input
- ถ้า Docker หรือ image ไม่พร้อม API ตอบ 503 + `Retry-After` และหน้าเว็บบอกผู้ใช้ตรง ๆ

```bash
docker build -t coding-arena-polyglot:dev judge/polyglot      # ครั้งแรกใช้เวลานาน (image หลาย GB)
pnpm --filter backend languages:smoke                          # รันโค้ดตัวอย่างของทุกภาษา ต้องผ่านทุกบรรทัด
pnpm --filter backend languages:smoke python c rust            # เฉพาะบางภาษา
```

**ก่อนเปิดใช้บน server ต้องให้ PM อนุมัติ (deployment.md ข้อ 8)**

1. ใช้ Docker แบบ rootless ของ user `judge` ที่ DevOps ดูแล และ DevOps ดึง image polyglot ไว้ล่วงหน้า อ้างด้วย digest ใน `POLYGLOT_IMAGE`
2. container ใส่ flag ขั้นต่ำของข้อ 8.3 ครบ และ**เพิ่ม tmpfs `/box` ที่รันไฟล์ได้** (`exec,nosuid,nodev,size=256m`) เพราะภาษาคอมไพล์
   (C, C++, Go, Rust, Fortran, Pascal, COBOL ฯลฯ) ต้องรันไฟล์ที่เพิ่งคอมไพล์ — `/tmp` ยังเป็น `noexec` ตามมาตรฐาน
3. RAM ต่อ container: ค่าเริ่ม 256 MB · JVM/.NET/GHC ใช้ 384–768 MB (ระบุรายภาษาใน `memoryMb`)
4. ซ้อมกับ DevOps ตามข้อ 8.4 (ออกเน็ต · เขียนไฟล์ · fork bomb · กิน RAM · วนไม่จบ) ด้วย `languages:smoke` และโค้ดทดสอบที่พยายามหลุด

## ตรวจงาน

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter backend generate:openapi
pnpm --filter frontend generate:api
```

ทดสอบฐานข้อมูลและ Docker แบบครบวงจรได้ด้วย `backend/test/competition.integration.ts`
และทดสอบ HTTP API กับตัวจำลอง JWKS ได้ด้วย `backend/test/api.integration.ts`
ทั้งสองบังคับใช้ฐานข้อมูลชั่วคราว `arena_test` บน `127.0.0.1` และล้างเฉพาะข้อมูลที่ทดสอบสร้าง

```bash
# ตั้ง DATABASE_URL ของฐานข้อมูล arena_test ก่อน
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend test:competition
pnpm --filter backend exec ts-node --files test/api.integration.ts
```

ชุดทดสอบเหล่านี้ไม่แทนการตรวจ L3 กับ Core Hub จริง อ่านผลและรายการค้างใน [REPORT.md](REPORT.md)
ก่อนเปิด PR อ่าน `standards/docs/github-workflow.md` ข้อ 1
