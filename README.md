# csmju-coding-arena

Coding Arena — ระบบย่อยของโครงการ CSMJU2030

มาตรฐานกลางอยู่ใน `standards/` (submodule ของ CSMJU2030/csmju2030-standards)
ใช้ standards v1.7.0 ตาม `.standards-version`

## เริ่มทำงาน

```bash
git submodule update --init --remote standards/
pnpm install
git checkout -b feature/coding-arena/<เรื่องที่ทำ>
```

ก่อนเปิด PR อ่าน `standards/docs/github-workflow.md` ข้อ 1
