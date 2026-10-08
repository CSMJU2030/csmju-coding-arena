import { MAX_TEST_CASES } from '../matches/browser-judge';
import { describeProblem, PROBLEM_BANK, problemId, testCaseId } from './bank';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('คลังโจทย์ที่มากับระบบ', () => {
  it('มีโจทย์มากพอให้สุ่มคละระดับได้ทุกหมวด', () => {
    expect(PROBLEM_BANK.length).toBeGreaterThanOrEqual(30);
    for (const level of ['EASY', 'MEDIUM', 'HARD']) {
      expect(
        PROBLEM_BANK.filter((p) => p.difficulty === level).length,
      ).toBeGreaterThanOrEqual(5);
    }
    const categories = new Set(PROBLEM_BANK.map((p) => p.category));
    expect(categories.size).toBe(7);
  });

  it('id เป็น UUID v4 ไม่ซ้ำกัน และชื่อไม่ซ้ำ', () => {
    const ids = PROBLEM_BANK.flatMap((p) => [
      problemId(p),
      ...p.tests.map((_, i) => testCaseId(p, i)),
    ]);
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(PROBLEM_BANK.map((p) => p.title)).size).toBe(
      PROBLEM_BANK.length,
    );
  });

  it.each(PROBLEM_BANK.map((p) => [p.title, p] as const))(
    '%s: คำตอบอ้างอิงรันได้และอยู่ในขนาดที่ระบบรับ',
    (_title, p) => {
      expect(p.tests.length).toBeGreaterThanOrEqual(3);
      expect(p.tests.length).toBeLessThanOrEqual(MAX_TEST_CASES);
      for (const input of p.tests) {
        const output = p.solve(input);
        expect(output.trim().length).toBeGreaterThan(0);
        // ผลที่ส่งกลับมาตรวจต้องไม่เกิน 10,000 ตัวอักษรต่อชุด (BrowserJudgedSubmissionDto)
        expect(output.length).toBeLessThanOrEqual(10000);
      }
      expect(describeProblem(p)).toContain('ตัวอย่างผลลัพธ์');
    },
  );
});
