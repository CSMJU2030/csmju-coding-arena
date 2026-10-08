import { judgeOutputs, normalizeOutput } from './browser-judge';

describe('judgeOutputs (ตัดสินผลที่เบราว์เซอร์รันมา)', () => {
  const expected = ['3', '10', 'hello\nworld'];

  it('ผ่านทุกชุด = ACCEPTED (ไม่สน CRLF และช่องว่างท้ายบรรทัด)', () => {
    expect(
      judgeOutputs(expected, 'COMPLETED', ['3\n', '10 ', 'hello  \r\nworld']),
    ).toEqual({
      status: 'ACCEPTED',
      failedTest: null,
    });
  });

  it('ผลไม่ตรง = WRONG_ANSWER พร้อมบอกชุดที่ผิด', () => {
    expect(
      judgeOutputs(expected, 'COMPLETED', ['3', '11', 'hello\nworld']),
    ).toEqual({
      status: 'WRONG_ANSWER',
      failedTest: 2,
    });
  });

  it('error กลางทาง = สถานะ error ที่ชุดถัดจากชุดที่ส่งผลมา', () => {
    expect(judgeOutputs(expected, 'TIME_LIMIT_EXCEEDED', ['3'])).toEqual({
      status: 'TIME_LIMIT_EXCEEDED',
      failedTest: 2,
    });
    expect(judgeOutputs(expected, 'COMPILATION_ERROR', [])).toEqual({
      status: 'COMPILATION_ERROR',
      failedTest: 1,
    });
  });

  it('ชุดก่อนหน้าผิดมาก่อน error = WRONG_ANSWER', () => {
    expect(judgeOutputs(expected, 'RUNTIME_ERROR', ['4'])?.status).toBe(
      'WRONG_ANSWER',
    );
  });

  it('จำนวนผลไม่สอดคล้อง = null (คำขอผิดรูปแบบ)', () => {
    expect(judgeOutputs(expected, 'COMPLETED', ['3', '10'])).toBeNull();
    expect(
      judgeOutputs(expected, 'COMPLETED', ['3', '10', 'x', 'y']),
    ).toBeNull();
    expect(
      judgeOutputs(expected, 'RUNTIME_ERROR', ['3', '10', 'hello\nworld']),
    ).toBeNull();
  });

  it('normalizeOutput ตัดช่องว่างหัวท้ายแบบเดียวกับตัวตรวจเดิม', () => {
    expect(normalizeOutput('  a \r\n b  \n\n')).toBe('a\n b');
  });
});
