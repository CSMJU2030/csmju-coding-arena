import { ALL_LANGUAGES, LANGUAGES, findLanguage } from './languages';

describe('ทะเบียนภาษา', () => {
  it('id ไม่ซ้ำและเป็น kebab-case', () => {
    expect(new Set(ALL_LANGUAGES.map((l) => l.id)).size).toBe(
      ALL_LANGUAGES.length,
    );
    for (const l of ALL_LANGUAGES)
      expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('ชื่อไฟล์ไม่มี path และทุกภาษาใน sandbox มีคำสั่งรัน', () => {
    for (const l of LANGUAGES) {
      expect(l.file).toMatch(/^[A-Za-z0-9_]+\.[A-Za-z0-9]+$/);
      expect(l.run.length).toBeGreaterThan(0);
      expect(l.template.trim()).not.toBe('');
      expect(l.expect).not.toBe('');
    }
  });

  it('ภาษาที่กินหน่วยความจำมากกำหนด memoryMb ไม่เกิน 1 GB', () => {
    for (const l of LANGUAGES)
      expect(l.memoryMb ?? 256).toBeLessThanOrEqual(1024);
  });

  it('ค้นภาษาด้วย id', () => {
    expect(findLanguage('python')?.name).toBe('Python 3');
    expect(findLanguage('../etc/passwd')).toBeUndefined();
  });
});
