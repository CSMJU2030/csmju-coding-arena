/**
 * คลังโจทย์ที่มากับระบบ — นักศึกษาสร้างห้อง/จับคู่ได้ทันทีโดยไม่ต้องรออาจารย์สร้างโจทย์
 *
 * - expected output ทุกชุดคำนวณจาก `solve` (คำตอบอ้างอิง) ตอน seed — ไม่มีคำตอบที่พิมพ์มือ
 * - ชุดทดสอบแรกเป็นตัวอย่างที่แสดงในโจทย์ ที่เหลือซ่อน
 * - รูปแบบข้อมูลเป็น stdin/stdout ใช้ได้ทุกภาษา (Python / JavaScript / TypeScript)
 * - id คงที่: seed ซ้ำได้โดยไม่สร้างซ้ำ และอาจารย์แก้/ปิดโจทย์เหล่านี้ได้ (ระบบไม่เขียนทับ)
 */
export type BankCategory =
  | 'BASICS'
  | 'CONDITIONS'
  | 'LOOPS'
  | 'STRINGS'
  | 'LISTS'
  | 'MATH'
  | 'ALGORITHMS';
export type BankDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface BankProblem {
  /** 4 ส่วนแรกของ UUID v4 — โจทย์ใช้ `<prefix>-000000000000` ชุดทดสอบใช้ `<prefix>-<ลำดับ 12 หลัก>` */
  prefix: string;
  title: string;
  category: BankCategory;
  difficulty: BankDifficulty;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  timeLimitMs?: number;
  tests: string[];
  solve: (input: string) => string;
}

/** สุ่มแบบกำหนด seed ได้ — ชุดทดสอบใหญ่เหมือนเดิมทุกครั้งที่ seed */
function rng(seed: number) {
  let state = seed >>> 0;
  return (min: number, max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
}
const list = (seed: number, n: number, min: number, max: number) => {
  const next = rng(seed);
  return Array.from({ length: n }, () => next(min, max));
};
const lines = (input: string) => input.split('\n');
const ints = (line: string) =>
  line.trim().split(/\s+/).filter(Boolean).map(Number);
const join = (values: (string | number)[]) => values.join(' ');
const withList = (values: number[]) => `${values.length}\n${join(values)}`;

export const PROBLEM_BANK: BankProblem[] = [
  // ---------------- พื้นฐาน ----------------
  {
    prefix: '0cf80e4e-df8c-4f7b-8f8f',
    title: 'ผลบวกสองจำนวน',
    category: 'BASICS',
    difficulty: 'EASY',
    statement: 'รับจำนวนเต็มสองจำนวน แล้วพิมพ์ผลบวก',
    inputFormat:
      'บรรทัดเดียว มีจำนวนเต็ม a และ b คั่นด้วยช่องว่าง (-10^9 ≤ a, b ≤ 10^9)',
    outputFormat: 'ผลบวก a + b',
    tests: ['3 4', '-5 12', '0 0', '1000000000 1000000000', '-7 -8'],
    solve: (input) => {
      const [a, b] = ints(input);
      return String(a + b);
    },
  },
  {
    prefix: 'ceb1a0ce-9994-435f-9dd8',
    title: 'พื้นที่และเส้นรอบรูปสี่เหลี่ยมผืนผ้า',
    category: 'BASICS',
    difficulty: 'EASY',
    statement:
      'รับความกว้างและความยาวของสี่เหลี่ยมผืนผ้า แล้วพิมพ์พื้นที่และเส้นรอบรูป',
    inputFormat: 'จำนวนเต็ม w และ h คั่นด้วยช่องว่าง (1 ≤ w, h ≤ 100000)',
    outputFormat: 'พื้นที่และเส้นรอบรูป คั่นด้วยช่องว่าง',
    tests: ['4 5', '1 1', '100000 100000', '7 3'],
    solve: (input) => {
      const [w, h] = ints(input);
      return join([w * h, 2 * (w + h)]);
    },
  },
  {
    prefix: '7523b4f2-a722-4b0b-95a8',
    title: 'องศาเซลเซียสเป็นฟาเรนไฮต์',
    category: 'BASICS',
    difficulty: 'EASY',
    statement:
      'แปลงอุณหภูมิจากองศาเซลเซียสเป็นองศาฟาเรนไฮต์ ด้วยสูตร F = C × 9 / 5 + 32',
    inputFormat: 'จำนวนเต็ม C (-273 ≤ C ≤ 1000)',
    outputFormat: 'ค่า F แสดงทศนิยม 1 ตำแหน่ง',
    tests: ['100', '0', '-40', '37', '-273', '21'],
    solve: (input) => ((Number(input) * 9) / 5 + 32).toFixed(1),
  },
  {
    prefix: 'f4b12fda-9209-4c5c-8e0d',
    title: 'แปลงวินาทีเป็นเวลา',
    category: 'BASICS',
    difficulty: 'EASY',
    statement: 'รับจำนวนวินาที แล้วแสดงเป็นชั่วโมง:นาที:วินาที',
    inputFormat: 'จำนวนเต็ม s (0 ≤ s ≤ 359999)',
    outputFormat: 'เวลาในรูปแบบ HH:MM:SS (เติม 0 ข้างหน้าให้ครบ 2 หลัก)',
    tests: ['3725', '0', '59', '86399', '359999'],
    solve: (input) => {
      const s = Number(input);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    },
  },
  {
    prefix: 'dd44f3c0-05c8-4c93-99e1',
    title: 'แบ่งขนมให้เพื่อน',
    category: 'BASICS',
    difficulty: 'EASY',
    statement:
      'มีขนม n ชิ้น แบ่งให้เพื่อน k คนเท่า ๆ กันให้มากที่สุด แต่ละคนได้กี่ชิ้น และเหลือกี่ชิ้น',
    inputFormat: 'จำนวนเต็ม n และ k (0 ≤ n ≤ 10^9, 1 ≤ k ≤ 10^9)',
    outputFormat: 'จำนวนที่แต่ละคนได้ และจำนวนที่เหลือ คั่นด้วยช่องว่าง',
    tests: ['17 5', '10 10', '0 3', '1000000000 7', '3 8'],
    solve: (input) => {
      const [n, k] = ints(input);
      return join([Math.floor(n / k), n % k]);
    },
  },

  // ---------------- เงื่อนไข ----------------
  {
    prefix: '483d3bfd-7921-4bd7-ad4e',
    title: 'คู่หรือคี่',
    category: 'CONDITIONS',
    difficulty: 'EASY',
    statement: 'บอกว่าจำนวนเต็มที่รับมาเป็นเลขคู่หรือเลขคี่',
    inputFormat: 'จำนวนเต็ม n (-10^9 ≤ n ≤ 10^9)',
    outputFormat: 'พิมพ์ even ถ้าเป็นเลขคู่ หรือ odd ถ้าเป็นเลขคี่',
    tests: ['7', '10', '0', '-3', '-8'],
    solve: (input) => (Math.abs(Number(input)) % 2 === 0 ? 'even' : 'odd'),
  },
  {
    prefix: '0c8c9910-46e1-4199-a8f6',
    title: 'ตัดเกรด',
    category: 'CONDITIONS',
    difficulty: 'EASY',
    statement:
      'ตัดเกรดจากคะแนน: 80 ขึ้นไป A · 70–79 B · 60–69 C · 50–59 D · ต่ำกว่า 50 F',
    inputFormat: 'คะแนนเป็นจำนวนเต็ม (0 ≤ score ≤ 100)',
    outputFormat: 'เกรด (A, B, C, D หรือ F)',
    tests: ['85', '79', '60', '50', '49', '100', '0'],
    solve: (input) => {
      const s = Number(input);
      return s >= 80
        ? 'A'
        : s >= 70
          ? 'B'
          : s >= 60
            ? 'C'
            : s >= 50
              ? 'D'
              : 'F';
    },
  },
  {
    prefix: '203f0aba-a563-467d-b463',
    title: 'ปีอธิกสุรทิน',
    category: 'CONDITIONS',
    difficulty: 'MEDIUM',
    statement:
      'ปีอธิกสุรทิน (กุมภาพันธ์มี 29 วัน) คือปีที่หารด้วย 4 ลงตัว ยกเว้นปีที่หารด้วย 100 ลงตัว แต่ถ้าหารด้วย 400 ลงตัวยังนับเป็นปีอธิกสุรทิน',
    inputFormat: 'ปีคริสต์ศักราช y (1 ≤ y ≤ 9999)',
    outputFormat: 'พิมพ์ leap ถ้าเป็นปีอธิกสุรทิน ไม่อย่างนั้นพิมพ์ common',
    tests: ['2024', '1900', '2000', '2023', '2100', '2400'],
    solve: (input) => {
      const y = Number(input);
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
        ? 'leap'
        : 'common';
    },
  },
  {
    prefix: '936ed3cd-0f60-4e08-bb67',
    title: 'มากที่สุดในสามจำนวน',
    category: 'CONDITIONS',
    difficulty: 'EASY',
    statement: 'รับจำนวนเต็มสามจำนวน แล้วพิมพ์จำนวนที่มากที่สุด',
    inputFormat: 'จำนวนเต็ม a b c ในบรรทัดเดียว',
    outputFormat: 'จำนวนที่มากที่สุด',
    tests: ['3 9 4', '-1 -5 -3', '7 7 2', '0 0 0', '1000000 -1000000 999999'],
    solve: (input) => String(Math.max(...ints(input))),
  },
  {
    prefix: '3cc68982-8212-49e9-87e7',
    title: 'ค่าส่งพัสดุ',
    category: 'CONDITIONS',
    difficulty: 'MEDIUM',
    statement:
      'คิดค่าส่งตามน้ำหนัก (กิโลกรัม): ไม่เกิน 1 กก. คิด 30 บาท · กิโลที่ 2–5 คิดเพิ่มกิโลละ 10 บาท · ตั้งแต่กิโลที่ 6 คิดเพิ่มกิโลละ 15 บาท',
    inputFormat: 'น้ำหนักเป็นจำนวนเต็ม w (1 ≤ w ≤ 1000)',
    outputFormat: 'ค่าส่งเป็นบาท',
    tests: ['3', '1', '5', '6', '20', '1000'],
    solve: (input) => {
      const w = Number(input);
      if (w <= 1) return '30';
      if (w <= 5) return String(30 + (w - 1) * 10);
      return String(70 + (w - 5) * 15);
    },
  },

  // ---------------- ลูป ----------------
  {
    prefix: 'cd7bb9d9-38fb-4db5-b009',
    title: 'ผลรวม 1 ถึง n',
    category: 'LOOPS',
    difficulty: 'EASY',
    statement: 'หาผลรวม 1 + 2 + 3 + ... + n',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 10^6)',
    outputFormat: 'ผลรวม',
    tests: ['10', '1', '100', '1000000', '12345'],
    solve: (input) => {
      const n = Number(input);
      return String((n * (n + 1)) / 2);
    },
  },
  {
    prefix: 'c6acd49c-e647-484a-81ed',
    title: 'สูตรคูณ',
    category: 'LOOPS',
    difficulty: 'EASY',
    statement: 'พิมพ์สูตรคูณแม่ n ตั้งแต่คูณ 1 ถึงคูณ 12',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 1000)',
    outputFormat: '12 บรรทัด รูปแบบ "n x i = ผลคูณ"',
    tests: ['3', '12', '1', '999'],
    solve: (input) => {
      const n = Number(input);
      return Array.from(
        { length: 12 },
        (_, i) => `${n} x ${i + 1} = ${n * (i + 1)}`,
      ).join('\n');
    },
  },
  {
    prefix: '56ad6969-5ceb-4bbd-b5d6',
    title: 'FizzBuzz',
    category: 'LOOPS',
    difficulty: 'EASY',
    statement:
      'พิมพ์ตัวเลข 1 ถึง n บรรทัดละตัว แต่ถ้าหารด้วย 3 ลงตัวให้พิมพ์ Fizz หารด้วย 5 ลงตัวพิมพ์ Buzz และถ้าหารด้วยทั้ง 3 และ 5 ลงตัวพิมพ์ FizzBuzz',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 1000)',
    outputFormat: 'n บรรทัด',
    tests: ['15', '1', '5', '100'],
    solve: (input) =>
      Array.from({ length: Number(input) }, (_, i) => {
        const k = i + 1;
        return k % 15 === 0
          ? 'FizzBuzz'
          : k % 3 === 0
            ? 'Fizz'
            : k % 5 === 0
              ? 'Buzz'
              : String(k);
      }).join('\n'),
  },
  {
    prefix: '5ac563ae-f818-409e-b85f',
    title: 'สามเหลี่ยมดาว',
    category: 'LOOPS',
    difficulty: 'MEDIUM',
    statement:
      'วาดสามเหลี่ยมด้วยเครื่องหมาย * สูง n แถว แถวที่ i มีดาว i ดวง (ชิดซ้าย)',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 50)',
    outputFormat: 'n บรรทัด',
    tests: ['4', '1', '7', '50'],
    solve: (input) =>
      Array.from({ length: Number(input) }, (_, i) => '*'.repeat(i + 1)).join(
        '\n',
      ),
  },
  {
    prefix: 'a7a16c2c-a6a2-427b-adcc',
    title: 'ผลรวมของหลัก',
    category: 'LOOPS',
    difficulty: 'MEDIUM',
    statement:
      'หาผลรวมของทุกหลักในจำนวนที่รับมา (จำนวนอาจยาวมาก ควรอ่านเป็นข้อความ)',
    inputFormat: 'จำนวนเต็มบวกยาวไม่เกิน 1000 หลัก',
    outputFormat: 'ผลรวมของหลักทั้งหมด',
    tests: [
      '12345',
      '9',
      '1000000000000000000001',
      '99999999999999999999999999999999999999999999',
      String(list(7, 300, 0, 9).join('')).replace(/^0+/, '1'),
    ],
    solve: (input) =>
      String([...input.trim()].reduce((sum, d) => sum + Number(d), 0)),
  },
  {
    prefix: '8fd5342c-ee60-4f5f-abc2',
    title: 'ลำดับคอลลาตซ์',
    category: 'LOOPS',
    difficulty: 'MEDIUM',
    statement:
      'เริ่มจาก n ถ้าเป็นเลขคู่ให้หารด้วย 2 ถ้าเป็นเลขคี่ให้คูณ 3 แล้วบวก 1 ทำซ้ำจนได้ 1 นับว่าต้องทำกี่ครั้ง',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 10^6)',
    outputFormat: 'จำนวนครั้งที่ทำจนได้ 1',
    tests: ['6', '1', '27', '97', '837799'],
    solve: (input) => {
      let n = Number(input);
      let steps = 0;
      while (n !== 1) {
        n = n % 2 === 0 ? n / 2 : 3 * n + 1;
        steps += 1;
      }
      return String(steps);
    },
  },

  // ---------------- ข้อความ ----------------
  {
    prefix: 'b27b2686-289e-49f3-8511',
    title: 'กลับคำ',
    category: 'STRINGS',
    difficulty: 'EASY',
    statement: 'กลับลำดับตัวอักษรของข้อความ',
    inputFormat: 'ข้อความภาษาอังกฤษหนึ่งบรรทัด ยาวไม่เกิน 1000 ตัวอักษร',
    outputFormat: 'ข้อความที่กลับด้านแล้ว',
    tests: ['hello', 'a', 'CodingArena', 'racecar', 'Maejo University 2030'],
    solve: (input) => [...input].reverse().join(''),
  },
  {
    prefix: 'a27869e1-95a4-4ec4-ad28',
    title: 'พาลินโดรม',
    category: 'STRINGS',
    difficulty: 'MEDIUM',
    statement:
      'พาลินโดรมคือคำที่อ่านจากหน้าไปหลังและหลังไปหน้าได้เหมือนกัน ตรวจว่าข้อความเป็นพาลินโดรมหรือไม่ โดยไม่สนตัวพิมพ์เล็ก/ใหญ่ และนับเฉพาะตัวอักษรภาษาอังกฤษกับตัวเลข',
    inputFormat: 'ข้อความหนึ่งบรรทัด',
    outputFormat: 'พิมพ์ yes หรือ no',
    tests: [
      'racecar',
      'A man, a plan, a canal: Panama',
      'hello',
      'Was it a car or a cat I saw?',
      'ab',
      '12321',
    ],
    solve: (input) => {
      const s = input.toLowerCase().replace(/[^a-z0-9]/g, '');
      return s === [...s].reverse().join('') ? 'yes' : 'no';
    },
  },
  {
    prefix: '2096a0d9-151e-440c-b807',
    title: 'นับสระ',
    category: 'STRINGS',
    difficulty: 'EASY',
    statement:
      'นับจำนวนสระภาษาอังกฤษ (a e i o u ทั้งตัวเล็กและตัวใหญ่) ในข้อความ',
    inputFormat: 'ข้อความหนึ่งบรรทัด',
    outputFormat: 'จำนวนสระ',
    tests: [
      'Hello World',
      'rhythm',
      'AEIOU aeiou',
      'Programming is fun',
      'xyz',
    ],
    solve: (input) => String((input.match(/[aeiou]/gi) ?? []).length),
  },
  {
    prefix: '28a4478b-1e74-48a2-919b',
    title: 'ขึ้นต้นด้วยตัวใหญ่',
    category: 'STRINGS',
    difficulty: 'MEDIUM',
    statement:
      'ทำให้ทุกคำขึ้นต้นด้วยตัวพิมพ์ใหญ่ และตัวที่เหลือเป็นตัวพิมพ์เล็ก',
    inputFormat: 'ข้อความภาษาอังกฤษหนึ่งบรรทัด คำคั่นด้วยช่องว่างหนึ่งช่อง',
    outputFormat: 'ข้อความที่แปลงแล้ว',
    tests: [
      'hello world',
      'cODING aRENA',
      'a',
      'maejo university computer science',
    ],
    solve: (input) =>
      input
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(' '),
  },
  {
    prefix: '2c21f94d-16ce-4e4c-9c18',
    title: 'นับคำ',
    category: 'STRINGS',
    difficulty: 'EASY',
    statement: 'นับจำนวนคำในข้อความ (คำคั่นด้วยช่องว่างตั้งแต่หนึ่งช่องขึ้นไป)',
    inputFormat: 'ข้อความหนึ่งบรรทัด',
    outputFormat: 'จำนวนคำ',
    tests: [
      'the quick brown fox',
      'one',
      '  spaces   everywhere  here ',
      'a b c d e f g h i j',
    ],
    solve: (input) => String(input.trim().split(/\s+/).filter(Boolean).length),
  },
  {
    prefix: 'd20752ae-e4ae-456d-9d9a',
    title: 'รหัสซีซาร์',
    category: 'STRINGS',
    difficulty: 'HARD',
    statement:
      'เข้ารหัสข้อความโดยเลื่อนตัวอักษรภาษาอังกฤษไปข้างหน้า k ตำแหน่ง (z เลื่อนต่อวนกลับไป a) คงตัวพิมพ์เล็ก/ใหญ่ไว้ อักขระอื่นไม่เปลี่ยน',
    inputFormat: 'บรรทัดแรกจำนวนเต็ม k (0 ≤ k ≤ 1000) · บรรทัดที่สองข้อความ',
    outputFormat: 'ข้อความที่เข้ารหัสแล้ว',
    tests: [
      '3\nHello, World!',
      '0\nabc',
      '26\nZebra',
      '1\nxyz XYZ',
      '1000\nCoding Arena 2030',
    ],
    solve: (input) => {
      const [first, text = ''] = lines(input);
      const k = Number(first) % 26;
      return text.replace(/[a-z]/gi, (ch) => {
        const base = ch <= 'Z' ? 65 : 97;
        return String.fromCharCode(((ch.charCodeAt(0) - base + k) % 26) + base);
      });
    },
  },
  {
    prefix: '9dc6fb1b-0bea-4e56-80b0',
    title: 'ความถี่ตัวอักษร',
    category: 'STRINGS',
    difficulty: 'MEDIUM',
    statement:
      'นับว่าตัวอักษรแต่ละตัวในคำปรากฏกี่ครั้ง แล้วแสดงเรียงตามตัวอักษร',
    inputFormat: 'คำภาษาอังกฤษตัวพิมพ์เล็กหนึ่งคำ (ยาวไม่เกิน 1000)',
    outputFormat: 'รายการ "ตัวอักษร:จำนวน" เรียงตามตัวอักษร คั่นด้วยช่องว่าง',
    tests: ['banana', 'a', 'mississippi', 'abcabcabc'],
    solve: (input) => {
      const counts = new Map<string, number>();
      for (const ch of input.trim()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
      return [...counts.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([ch, n]) => `${ch}:${n}`)
        .join(' ');
    },
  },

  // ---------------- ลิสต์ ----------------
  {
    prefix: '71aed4af-3248-473c-af43',
    title: 'มากสุดและน้อยสุด',
    category: 'LISTS',
    difficulty: 'EASY',
    statement: 'หาค่ามากที่สุดและน้อยที่สุดในรายการตัวเลข',
    inputFormat: 'บรรทัดแรก n (1 ≤ n ≤ 10^5) · บรรทัดที่สองจำนวนเต็ม n ตัว',
    outputFormat: 'ค่ามากสุดและค่าน้อยสุด คั่นด้วยช่องว่าง',
    tests: [
      '5\n3 9 -2 7 4',
      '1\n42',
      '4\n-1 -1 -1 -1',
      withList(list(11, 100000, -1000000, 1000000)),
    ],
    solve: (input) => {
      const values = ints(lines(input)[1]);
      return join([Math.max(...values), Math.min(...values)]);
    },
  },
  {
    prefix: '02e3e6c6-b7d1-4153-b079',
    title: 'นับเลขคู่',
    category: 'LISTS',
    difficulty: 'EASY',
    statement: 'นับว่าในรายการมีเลขคู่กี่ตัว',
    inputFormat: 'บรรทัดแรก n (1 ≤ n ≤ 10^5) · บรรทัดที่สองจำนวนเต็ม n ตัว',
    outputFormat: 'จำนวนเลขคู่',
    tests: [
      '5\n1 2 3 4 6',
      '3\n1 3 5',
      '4\n0 -2 -3 8',
      withList(list(12, 100000, -1000, 1000)),
    ],
    solve: (input) =>
      String(ints(lines(input)[1]).filter((x) => x % 2 === 0).length),
  },
  {
    prefix: 'bede9fe2-a3a6-4163-ba6b',
    title: 'ค่าเฉลี่ย',
    category: 'LISTS',
    difficulty: 'MEDIUM',
    statement: 'หาค่าเฉลี่ยของรายการตัวเลข',
    inputFormat:
      'บรรทัดแรก n (1 ≤ n ≤ 1000) · บรรทัดที่สองจำนวนเต็ม n ตัว (0 ≤ x ≤ 1000)',
    outputFormat: 'ค่าเฉลี่ยแสดงทศนิยม 2 ตำแหน่ง',
    tests: [
      '3\n1 2 4',
      '1\n7',
      '5\n10 20 30 40 50',
      '3\n1 1 2',
      '7\n100 0 3 9 11 6 2',
      withList(list(13, 999, 0, 1000)),
    ],
    solve: (input) => {
      const values = ints(lines(input)[1]);
      return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    },
  },
  {
    prefix: 'bd870f39-daae-456e-8e71',
    title: 'ตัดตัวซ้ำ',
    category: 'LISTS',
    difficulty: 'MEDIUM',
    statement: 'ลบตัวเลขที่ซ้ำออก โดยเก็บตัวที่พบครั้งแรกไว้และรักษาลำดับเดิม',
    inputFormat: 'บรรทัดแรก n (1 ≤ n ≤ 10^5) · บรรทัดที่สองจำนวนเต็ม n ตัว',
    outputFormat: 'ตัวเลขที่ไม่ซ้ำตามลำดับเดิม คั่นด้วยช่องว่าง',
    tests: [
      '7\n3 1 3 2 1 5 2',
      '1\n9',
      '4\n4 4 4 4',
      withList(list(14, 100000, 1, 500)),
    ],
    solve: (input) => join([...new Set(ints(lines(input)[1]))]),
  },
  {
    prefix: '110ac943-cf9e-4469-b2a7',
    title: 'หมุนรายการ',
    category: 'LISTS',
    difficulty: 'MEDIUM',
    statement:
      'หมุนรายการไปทางขวา k ครั้ง (ตัวสุดท้ายย้ายมาอยู่หน้าสุดในแต่ละครั้ง)',
    inputFormat:
      'บรรทัดแรก n และ k (1 ≤ n ≤ 2000, 0 ≤ k ≤ 10^9) · บรรทัดที่สองจำนวนเต็ม n ตัว',
    outputFormat: 'รายการหลังหมุน คั่นด้วยช่องว่าง',
    tests: [
      '5 2\n1 2 3 4 5',
      '3 0\n7 8 9',
      '4 6\n1 2 3 4',
      '1 1000000000\n5',
      `2000 999999999\n${join(list(15, 2000, 0, 99))}`,
    ],
    solve: (input) => {
      const [head, body] = lines(input);
      const [n, k] = ints(head);
      const values = ints(body);
      const shift = k % n;
      return join([...values.slice(n - shift), ...values.slice(0, n - shift)]);
    },
  },
  {
    prefix: '5c9172c9-2fa3-427f-84c0',
    title: 'ผลรวมช่วงต่อเนื่องที่มากที่สุด',
    category: 'LISTS',
    difficulty: 'HARD',
    statement:
      'หาผลรวมที่มากที่สุดของช่วงต่อเนื่องในรายการ (ช่วงต้องมีอย่างน้อย 1 ตัว)',
    inputFormat:
      'บรรทัดแรก n (1 ≤ n ≤ 10^5) · บรรทัดที่สองจำนวนเต็ม n ตัว (-10^4 ≤ x ≤ 10^4)',
    outputFormat: 'ผลรวมที่มากที่สุด',
    timeLimitMs: 3000,
    tests: [
      '9\n-2 1 -3 4 -1 2 1 -5 4',
      '1\n-7',
      '3\n-3 -1 -2',
      '5\n1 2 3 4 5',
      withList(list(16, 100000, -10000, 10000)),
    ],
    solve: (input) => {
      const values = ints(lines(input)[1]);
      let best = values[0];
      let current = values[0];
      for (const x of values.slice(1)) {
        current = Math.max(x, current + x);
        best = Math.max(best, current);
      }
      return String(best);
    },
  },

  // ---------------- คณิตศาสตร์ ----------------
  {
    prefix: 'b2d9c29d-87aa-45f7-9f83',
    title: 'จำนวนเฉพาะหรือไม่',
    category: 'MATH',
    difficulty: 'MEDIUM',
    statement:
      'จำนวนเฉพาะคือจำนวนเต็มที่มากกว่า 1 และหารลงตัวด้วย 1 กับตัวเองเท่านั้น ตรวจว่า n เป็นจำนวนเฉพาะหรือไม่',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 10^9)',
    outputFormat: 'พิมพ์ prime หรือ not prime',
    tests: ['7', '1', '2', '91', '999999937', '1000000000'],
    solve: (input) => {
      const n = Number(input);
      if (n < 2) return 'not prime';
      for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return 'not prime';
      return 'prime';
    },
  },
  {
    prefix: '9f7bc67c-1abc-44c5-bc5c',
    title: 'ห.ร.ม. และ ค.ร.น.',
    category: 'MATH',
    difficulty: 'MEDIUM',
    statement:
      'หาตัวหารร่วมมาก (ห.ร.ม.) และตัวคูณร่วมน้อย (ค.ร.น.) ของสองจำนวน',
    inputFormat: 'จำนวนเต็ม a และ b (1 ≤ a, b ≤ 10^6)',
    outputFormat: 'ห.ร.ม. และ ค.ร.น. คั่นด้วยช่องว่าง',
    tests: ['12 18', '7 13', '1 1', '1000000 999999', '48 180'],
    solve: (input) => {
      const [a, b] = ints(input);
      let x = a;
      let y = b;
      while (y) [x, y] = [y, x % y];
      return join([x, (a / x) * b]);
    },
  },
  {
    prefix: '9ee74ecc-94ae-4d33-8b97',
    title: 'ฟีโบนัชชี',
    category: 'MATH',
    difficulty: 'MEDIUM',
    statement:
      'ลำดับฟีโบนัชชี F(0) = 0, F(1) = 1 และ F(n) = F(n-1) + F(n-2) หาค่า F(n)',
    inputFormat: 'จำนวนเต็ม n (0 ≤ n ≤ 70)',
    outputFormat: 'ค่า F(n)',
    tests: ['10', '0', '1', '2', '50', '70'],
    solve: (input) => {
      let [a, b] = [0, 1];
      for (let i = 0; i < Number(input); i += 1) [a, b] = [b, a + b];
      return String(a);
    },
  },
  {
    prefix: '1b43ea8a-e6f7-4e68-bc35',
    title: 'แฟกทอเรียลมอดุโล',
    category: 'MATH',
    difficulty: 'HARD',
    statement: 'หาค่า n! (n แฟกทอเรียล) หารเอาเศษด้วย 1000000007',
    inputFormat: 'จำนวนเต็ม n (0 ≤ n ≤ 10^5)',
    outputFormat: 'n! mod 1000000007',
    timeLimitMs: 3000,
    tests: ['5', '0', '20', '1000', '100000'],
    solve: (input) => {
      const MOD = 1_000_000_007n;
      let result = 1n;
      for (let i = 2n; i <= BigInt(input.trim()); i += 1n)
        result = (result * i) % MOD;
      return String(result);
    },
  },
  {
    prefix: '9cd6fe3c-565e-4609-b147',
    title: 'นับจำนวนเฉพาะ',
    category: 'MATH',
    difficulty: 'HARD',
    statement:
      'นับว่ามีจำนวนเฉพาะที่ไม่เกิน n อยู่กี่ตัว (ลองใช้ตะแกรงของเอราทอสเทนีส)',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 200000)',
    outputFormat: 'จำนวนของจำนวนเฉพาะที่ ≤ n',
    timeLimitMs: 3000,
    tests: ['10', '1', '2', '100', '200000'],
    solve: (input) => {
      const n = Number(input);
      const composite = new Uint8Array(n + 1);
      let count = 0;
      for (let i = 2; i <= n; i += 1) {
        if (composite[i]) continue;
        count += 1;
        for (let j = i * i; j <= n; j += i) composite[j] = 1;
      }
      return String(count);
    },
  },

  // ---------------- อัลกอริทึม ----------------
  {
    prefix: '71889905-c563-4543-b6d7',
    title: 'เรียงลำดับตัวเลข',
    category: 'ALGORITHMS',
    difficulty: 'EASY',
    statement: 'เรียงตัวเลขจากน้อยไปมาก',
    inputFormat: 'บรรทัดแรก n (1 ≤ n ≤ 1000) · บรรทัดที่สองจำนวนเต็ม n ตัว',
    outputFormat: 'ตัวเลขที่เรียงแล้ว คั่นด้วยช่องว่าง',
    tests: [
      '5\n5 2 9 1 5',
      '1\n3',
      '4\n-1 -10 7 0',
      withList(list(17, 1000, -10000, 10000)),
    ],
    solve: (input) => join(ints(lines(input)[1]).sort((a, b) => a - b)),
  },
  {
    prefix: '899c4401-9a18-4d67-9472',
    title: 'ค้นหาในรายการที่เรียงแล้ว',
    category: 'ALGORITHMS',
    difficulty: 'MEDIUM',
    statement:
      'มีรายการที่เรียงจากน้อยไปมากแล้ว และคำถาม q ข้อ แต่ละข้อถามว่าค่า x อยู่ตำแหน่งแรกที่เท่าไร (นับจาก 1) ถ้าไม่มีให้ตอบ -1',
    inputFormat:
      'บรรทัดแรก n และ q (1 ≤ n ≤ 10^5, 1 ≤ q ≤ 1000) · บรรทัดที่สองจำนวนเต็ม n ตัวที่เรียงแล้ว · บรรทัดที่สามค่า x จำนวน q ตัว',
    outputFormat: 'คำตอบ q ค่า คั่นด้วยช่องว่าง',
    timeLimitMs: 3000,
    tests: [
      '6 4\n1 3 3 5 8 13\n3 4 13 1',
      '1 2\n5\n5 6',
      `100000 1000\n${join(list(18, 100000, 0, 200000).sort((a, b) => a - b))}\n${join(list(19, 1000, 0, 200000))}`,
    ],
    solve: (input) => {
      const [, body, queries] = lines(input);
      const values = ints(body);
      const first = new Map<number, number>();
      values.forEach((v, i) => {
        if (!first.has(v)) first.set(v, i + 1);
      });
      return join(ints(queries).map((x) => first.get(x) ?? -1));
    },
  },
  {
    prefix: '92e6bc51-1518-41e8-b2fe',
    title: 'วงเล็บถูกต้อง',
    category: 'ALGORITHMS',
    difficulty: 'HARD',
    statement:
      'ตรวจว่าวงเล็บ ( ) [ ] { } ในข้อความเปิด-ปิดถูกต้องหรือไม่ (ทุกวงเล็บเปิดต้องปิดด้วยชนิดเดียวกันตามลำดับ)',
    inputFormat: 'ข้อความที่มีแต่วงเล็บ ยาว 1 ถึง 10^5 ตัว',
    outputFormat: 'พิมพ์ valid หรือ invalid',
    tests: [
      '([]{})',
      '(]',
      '((',
      '{[()()]}',
      ')(',
      '('.repeat(50000) + ')'.repeat(50000),
    ],
    solve: (input) => {
      const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
      const stack: string[] = [];
      for (const ch of input.trim()) {
        if ('([{'.includes(ch)) stack.push(ch);
        else if (stack.pop() !== pairs[ch]) return 'invalid';
      }
      return stack.length ? 'invalid' : 'valid';
    },
  },
  {
    prefix: 'dc367e3a-9494-42b5-a59a',
    title: 'ขึ้นบันได',
    category: 'ALGORITHMS',
    difficulty: 'HARD',
    statement:
      'บันไดมี n ขั้น แต่ละครั้งก้าวได้ 1 หรือ 2 ขั้น มีวิธีขึ้นถึงขั้นบนสุดได้กี่วิธี',
    inputFormat: 'จำนวนเต็ม n (1 ≤ n ≤ 70)',
    outputFormat: 'จำนวนวิธี',
    tests: ['3', '1', '2', '10', '45', '70'],
    solve: (input) => {
      let [a, b] = [1, 1];
      for (let i = 1; i < Number(input); i += 1) [a, b] = [b, a + b];
      return String(b);
    },
  },
  {
    prefix: '94e923f6-8c1b-434a-818f',
    title: 'ทอนเหรียญให้น้อยที่สุด',
    category: 'ALGORITHMS',
    difficulty: 'HARD',
    statement:
      'มีเหรียญหลายชนิด (แต่ละชนิดมีไม่จำกัด) ต้องทอนเงิน m บาทด้วยจำนวนเหรียญน้อยที่สุด ถ้าทอนไม่ได้ให้ตอบ -1',
    inputFormat:
      'บรรทัดแรก m และ k (0 ≤ m ≤ 10000, 1 ≤ k ≤ 20) · บรรทัดที่สองมูลค่าเหรียญ k ชนิด',
    outputFormat: 'จำนวนเหรียญที่น้อยที่สุด หรือ -1',
    timeLimitMs: 3000,
    tests: [
      '11 3\n1 2 5',
      '3 1\n2',
      '0 2\n1 5',
      '6 3\n1 3 4',
      '10000 4\n7 13 29 31',
      '9999 2\n2 4',
    ],
    solve: (input) => {
      const [head, body] = lines(input);
      const [m] = ints(head);
      const coins = ints(body);
      const best = new Array<number>(m + 1).fill(Infinity);
      best[0] = 0;
      for (let v = 1; v <= m; v += 1) {
        for (const c of coins)
          if (c <= v && best[v - c] + 1 < best[v]) best[v] = best[v - c] + 1;
      }
      return String(best[m] === Infinity ? -1 : best[m]);
    },
  },
  {
    prefix: 'e5970b26-a112-4181-93ac',
    title: 'คู่ที่ผลรวมเท่ากับเป้าหมาย',
    category: 'ALGORITHMS',
    difficulty: 'HARD',
    statement: 'นับจำนวนคู่ตำแหน่ง (i < j) ที่ผลรวมของตัวเลขทั้งสองเท่ากับ t',
    inputFormat:
      'บรรทัดแรก n และ t (1 ≤ n ≤ 10^5, -10^6 ≤ t ≤ 10^6) · บรรทัดที่สองจำนวนเต็ม n ตัว',
    outputFormat: 'จำนวนคู่',
    timeLimitMs: 3000,
    tests: [
      '5 6\n1 5 3 3 7',
      '3 10\n1 2 3',
      '4 4\n2 2 2 2',
      `100000 100\n${join(list(20, 100000, 0, 100))}`,
    ],
    solve: (input) => {
      const [head, body] = lines(input);
      const [, t] = ints(head);
      const seen = new Map<number, number>();
      let pairs = 0;
      for (const x of ints(body)) {
        pairs += seen.get(t - x) ?? 0;
        seen.set(x, (seen.get(x) ?? 0) + 1);
      }
      return String(pairs);
    },
  },
];

export const BANK_CATEGORY_LABELS: Record<BankCategory, string> = {
  BASICS: 'พื้นฐาน',
  CONDITIONS: 'เงื่อนไข',
  LOOPS: 'ลูป',
  STRINGS: 'ข้อความ',
  LISTS: 'ลิสต์',
  MATH: 'คณิตศาสตร์',
  ALGORITHMS: 'อัลกอริทึม',
};

export const problemId = (p: BankProblem) => `${p.prefix}-000000000000`;
export const testCaseId = (p: BankProblem, index: number) =>
  `${p.prefix}-${String(index + 1).padStart(12, '0')}`;

/** คำอธิบายเต็มของโจทย์ พร้อมตัวอย่างจากชุดทดสอบแรก */
export function describeProblem(p: BankProblem): string {
  const sample = p.tests[0];
  return [
    p.statement,
    '',
    `ข้อมูลนำเข้า: ${p.inputFormat}`,
    `ผลลัพธ์: ${p.outputFormat}`,
    '',
    'ตัวอย่างข้อมูลนำเข้า',
    sample,
    '',
    'ตัวอย่างผลลัพธ์',
    p.solve(sample),
  ].join('\n');
}
