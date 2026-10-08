import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SubmissionStatus } from '../../generated/prisma/client';

/**
 * ตรวจคำตอบแบบ "รันในเบราว์เซอร์ ตัดสินที่ server"
 *
 * server ไม่รันโค้ดของผู้ใช้ (ไม่ต้องมี sandbox ตาม deployment.md ข้อ 8):
 * 1. เบราว์เซอร์ขอ input ของชุดทดสอบ (`test-inputs`) — expected output ไม่เคยออกจาก server
 * 2. เบราว์เซอร์รันโค้ดใน Web Worker ทีละชุด แล้วส่ง stdout ของแต่ละชุดกลับมาพร้อมโค้ด
 * 3. server เทียบกับ expected output แล้วตัดสินทันที
 *
 * ข้อจำกัดที่ยอมรับ: ผู้เล่นเห็น input ของชุดทดสอบ (รวมชุดที่ซ่อน) และอาจแก้ผลที่ส่งได้
 * จึงเก็บโค้ดทุกครั้งที่ส่งไว้ให้อาจารย์ตรวจย้อนหลัง
 */
export const BROWSER_LANGUAGES = [
  'PYTHON',
  'JAVASCRIPT',
  'TYPESCRIPT',
] as const;
export type BrowserLanguage = (typeof BROWSER_LANGUAGES)[number];

export const RUN_OUTCOMES = [
  'COMPLETED',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'COMPILATION_ERROR',
] as const;
export type RunOutcome = (typeof RUN_OUTCOMES)[number];

export const MAX_TEST_CASES = 100;

export class BrowserJudgedSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  @ApiProperty({ type: String })
  problemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, {
    message: 'Source code ยาวเกินไป (รับได้สูงสุด 10,000 ตัวอักษร)',
  })
  @ApiProperty({ type: String })
  sourceCode!: string;

  @IsIn(BROWSER_LANGUAGES)
  @ApiProperty({ enum: BROWSER_LANGUAGES })
  language!: BrowserLanguage;

  /** ผลการรันชุดสุดท้ายที่รัน — COMPLETED = รันครบทุกชุดโดยไม่ error */
  @IsIn(RUN_OUTCOMES)
  @ApiProperty({ enum: RUN_OUTCOMES })
  outcome!: RunOutcome;

  /** stdout ของแต่ละชุดทดสอบตามลำดับที่ได้จาก test-inputs (หยุดที่ชุดที่ error) */
  @IsArray()
  @ArrayMaxSize(MAX_TEST_CASES)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  @ApiProperty({ type: [String] })
  outputs!: string[];
}

export class TestInputsDto {
  @ApiProperty() problemId!: string;
  @ApiProperty() timeLimitMs!: number;
  @ApiProperty({ type: [String] }) inputs!: string[];
}

/** เทียบแบบเดียวกับตัวตรวจเดิม (trim) และไม่สนช่องว่างท้ายบรรทัด / CRLF */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export interface JudgeResult {
  status: SubmissionStatus;
  /** ชุดทดสอบที่ไม่ผ่าน (นับจาก 1) */
  failedTest: number | null;
}

/** คืน null เมื่อจำนวนผลไม่สอดคล้องกับจำนวนชุดทดสอบ (คำขอผิดรูปแบบ) */
export function judgeOutputs(
  expected: string[],
  outcome: RunOutcome,
  outputs: string[],
): JudgeResult | null {
  // รันครบ = ต้องมีผลทุกชุด · หยุดเพราะ error = ต้องมีผลน้อยกว่าจำนวนชุด
  const complete = outcome === 'COMPLETED';
  if (
    complete
      ? outputs.length !== expected.length
      : outputs.length >= expected.length
  ) {
    return null;
  }
  for (let index = 0; index < outputs.length; index += 1) {
    if (normalizeOutput(outputs[index]) !== normalizeOutput(expected[index])) {
      return { status: SubmissionStatus.WRONG_ANSWER, failedTest: index + 1 };
    }
  }
  if (!complete) {
    return {
      status: SubmissionStatus[outcome],
      failedTest: outputs.length + 1,
    };
  }
  return { status: SubmissionStatus.ACCEPTED, failedTest: null };
}
