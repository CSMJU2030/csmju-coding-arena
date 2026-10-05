import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { getDatabaseUrl } from '../src/prisma/database-url';

loadEnv({ path: '.env.local' });
loadEnv();

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  throw new Error('ไม่พบการตั้งค่าฐานข้อมูลใน .env.local');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type SeedProblem = {
  title: string;
  description: string;
  timeLimitMs: number;
  testCases: { inputData: string; expectedOutput: string; isHidden: boolean }[];
};

const problemsData: SeedProblem[] = [
  {
    title: '1. Hello World',
    description:
      'พิมพ์ข้อความ Hello, World! ออกมาหนึ่งบรรทัด โดยตัวพิมพ์และเครื่องหมายต้องตรงตามตัวอย่าง',
    timeLimitMs: 1000,
    testCases: [
      { inputData: '', expectedOutput: 'Hello, World!', isHidden: false },
    ],
  },
  {
    title: '2. ผลบวก A + B',
    description:
      'รับจำนวนเต็มสองจำนวนคั่นด้วยช่องว่าง แล้วพิมพ์ผลบวก\nตัวอย่าง Input: 3 5\nตัวอย่าง Output: 8',
    timeLimitMs: 1000,
    testCases: [
      { inputData: '3 5', expectedOutput: '8', isHidden: false },
      { inputData: '100 250', expectedOutput: '350', isHidden: true },
      { inputData: '-10 50', expectedOutput: '40', isHidden: true },
    ],
  },
  {
    title: '3. เลขคู่หรือเลขคี่',
    description:
      'รับจำนวนเต็มหนึ่งจำนวน ถ้าเป็นเลขคู่ให้พิมพ์ Even ถ้าเป็นเลขคี่ให้พิมพ์ Odd',
    timeLimitMs: 1000,
    testCases: [
      { inputData: '4', expectedOutput: 'Even', isHidden: false },
      { inputData: '7', expectedOutput: 'Odd', isHidden: false },
      { inputData: '0', expectedOutput: 'Even', isHidden: true },
    ],
  },
  {
    title: '4. พื้นที่สี่เหลี่ยมผืนผ้า',
    description:
      'รับความกว้างและความยาวซึ่งเป็นจำนวนเต็มบวกคั่นด้วยช่องว่าง แล้วพิมพ์พื้นที่',
    timeLimitMs: 1000,
    testCases: [
      { inputData: '5 10', expectedOutput: '50', isHidden: false },
      { inputData: '12 12', expectedOutput: '144', isHidden: true },
      { inputData: '1 99', expectedOutput: '99', isHidden: true },
    ],
  },
  {
    title: '5. แฟกทอเรียล',
    description:
      'รับจำนวนเต็ม n โดย 0 <= n <= 10 แล้วพิมพ์ค่า n! (ผลคูณจำนวนเต็มตั้งแต่ 1 ถึง n โดย 0! = 1)',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '5', expectedOutput: '120', isHidden: false },
      { inputData: '0', expectedOutput: '1', isHidden: true },
      { inputData: '10', expectedOutput: '3628800', isHidden: true },
    ],
  },
  {
    title: '6. ค่ามากที่สุดจากสามจำนวน',
    description:
      'รับจำนวนเต็มสามจำนวนคั่นด้วยช่องว่าง แล้วพิมพ์ค่าที่มากที่สุด',
    timeLimitMs: 1000,
    testCases: [
      { inputData: '10 25 5', expectedOutput: '25', isHidden: false },
      { inputData: '-5 -1 -10', expectedOutput: '-1', isHidden: true },
      { inputData: '100 100 100', expectedOutput: '100', isHidden: true },
    ],
  },
  {
    title: '7. นับจำนวนสระภาษาอังกฤษ',
    description:
      'รับข้อความภาษาอังกฤษหนึ่งบรรทัด ให้นับตัวอักษร a, e, i, o, u ทั้งตัวพิมพ์เล็กและใหญ่',
    timeLimitMs: 1000,
    testCases: [
      { inputData: 'hello world', expectedOutput: '3', isHidden: false },
      { inputData: 'Coding Arena', expectedOutput: '5', isHidden: true },
      { inputData: 'xyz', expectedOutput: '0', isHidden: true },
    ],
  },
  {
    title: '8. ตรวจสอบพาลินโดรม',
    description:
      'รับคำภาษาอังกฤษหนึ่งคำ ตรวจว่ากลับลำดับแล้วยังเหมือนเดิมหรือไม่ พิมพ์ True หรือ False โดยแยกตัวพิมพ์เล็กใหญ่',
    timeLimitMs: 1000,
    testCases: [
      { inputData: 'radar', expectedOutput: 'True', isHidden: false },
      { inputData: 'hello', expectedOutput: 'False', isHidden: false },
      { inputData: 'a', expectedOutput: 'True', isHidden: true },
    ],
  },
  {
    title: '9. ผลรวมสมาชิกใน Array',
    description:
      'รับจำนวนเต็มในบรรทัดเดียว คั่นด้วยช่องว่าง แล้วพิมพ์ผลรวมของทุกจำนวน',
    timeLimitMs: 2000,
    testCases: [
      { inputData: '1 2 3 4 5', expectedOutput: '15', isHidden: false },
      { inputData: '10 20 30 40 50', expectedOutput: '150', isHidden: true },
      { inputData: '-5 5 10 -10', expectedOutput: '0', isHidden: true },
    ],
  },
  {
    title: '10. ตรวจสอบจำนวนเฉพาะ',
    description:
      'รับจำนวนเต็มบวก N พิมพ์ Prime ถ้า N เป็นจำนวนเฉพาะ มิฉะนั้นพิมพ์ Not Prime (1 ไม่ใช่จำนวนเฉพาะ)',
    timeLimitMs: 2000,
    testCases: [
      { inputData: '7', expectedOutput: 'Prime', isHidden: false },
      { inputData: '10', expectedOutput: 'Not Prime', isHidden: false },
      { inputData: '97', expectedOutput: 'Prime', isHidden: true },
      { inputData: '1', expectedOutput: 'Not Prime', isHidden: true },
    ],
  },
  {
    title: '11. Fibonacci ตำแหน่งที่ n',
    description:
      'รับจำนวนเต็ม n โดย 0 <= n <= 45 แล้วพิมพ์ Fibonacci ตำแหน่ง n กำหนด F0 = 0, F1 = 1 และ Fn = F(n-1) + F(n-2)',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '0', expectedOutput: '0', isHidden: false },
      { inputData: '7', expectedOutput: '13', isHidden: true },
      { inputData: '10', expectedOutput: '55', isHidden: true },
    ],
  },
  {
    title: '12. ห.ร.ม. ของสองจำนวน',
    description:
      'รับจำนวนเต็มบวก a และ b คั่นด้วยช่องว่าง แล้วพิมพ์ ห.ร.ม. ใช้อัลกอริทึม Euclid ได้',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '12 18', expectedOutput: '6', isHidden: false },
      { inputData: '7 5', expectedOutput: '1', isHidden: true },
      { inputData: '24 60', expectedOutput: '12', isHidden: true },
    ],
  },
  {
    title: '13. ค.ร.น. ของสองจำนวน',
    description:
      'รับจำนวนเต็มบวก a และ b คั่นด้วยช่องว่าง แล้วพิมพ์ ค.ร.น. (ค่าน้อยที่สุดที่หารด้วย a และ b ลงตัว)',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '4 6', expectedOutput: '12', isHidden: false },
      { inputData: '5 7', expectedOutput: '35', isHidden: true },
      { inputData: '8 12', expectedOutput: '24', isHidden: true },
    ],
  },
  {
    title: '14. กลับหลักตัวเลข',
    description:
      'รับจำนวนเต็มบวก N แล้วพิมพ์ตัวเลขที่เรียงหลักกลับด้าน โดยผลลัพธ์เป็นจำนวนเต็ม (เลขศูนย์ด้านหน้าจึงไม่ต้องแสดง)',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '1234', expectedOutput: '4321', isHidden: false },
      { inputData: '1200', expectedOutput: '21', isHidden: true },
      { inputData: '7', expectedOutput: '7', isHidden: true },
    ],
  },
  {
    title: '15. นับจำนวนหลัก',
    description:
      'รับจำนวนเต็มไม่ติดลบ N แล้วพิมพ์จำนวนหลักของ N โดย 0 มีหนึ่งหลัก',
    timeLimitMs: 1000,
    testCases: [
      { inputData: '0', expectedOutput: '1', isHidden: false },
      { inputData: '10025', expectedOutput: '5', isHidden: true },
      { inputData: '7', expectedOutput: '1', isHidden: true },
    ],
  },
  {
    title: '16. เรียงจำนวนเต็มห้าตัว',
    description:
      'รับจำนวนเต็ม 5 จำนวนคั่นด้วยช่องว่าง แล้วพิมพ์เรียงจากน้อยไปมาก คั่นคำตอบด้วยช่องว่าง',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '3 1 4 1 5', expectedOutput: '1 1 3 4 5', isHidden: false },
      {
        inputData: '-2 9 0 -2 3',
        expectedOutput: '-2 -2 0 3 9',
        isHidden: true,
      },
      { inputData: '5 4 3 2 1', expectedOutput: '1 2 3 4 5', isHidden: true },
    ],
  },
  {
    title: '17. ค้นหาด้วย Binary Search',
    description:
      'รับ N, จากนั้นรับจำนวนเต็มเรียงจากน้อยไปมาก N ตัว และรับค่าเป้าหมาย T อีกหนึ่งจำนวน ให้พิมพ์ดัชนีเริ่มจาก 0 ของ T หรือ -1 ถ้าไม่พบ รับประกันว่าค่าในลิสต์ไม่ซ้ำกัน\nรูปแบบ Input: บรรทัดแรก N, บรรทัดที่สองตัวเลข N ตัว, บรรทัดที่สาม T',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '5\n1 3 5 7 9\n7', expectedOutput: '3', isHidden: false },
      { inputData: '5\n1 3 5 7 9\n2', expectedOutput: '-1', isHidden: true },
      { inputData: '1\n4\n4', expectedOutput: '0', isHidden: true },
    ],
  },
  {
    title: '18. นับจำนวนคำ',
    description:
      'รับข้อความหนึ่งบรรทัด แล้วพิมพ์จำนวนคำ คำแบ่งด้วยช่องว่างตั้งแต่หนึ่งตัวขึ้นไป',
    timeLimitMs: 1000,
    testCases: [
      { inputData: 'I love coding', expectedOutput: '3', isHidden: false },
      { inputData: 'one   two', expectedOutput: '2', isHidden: true },
      { inputData: 'algorithm', expectedOutput: '1', isHidden: true },
    ],
  },
  {
    title: '19. ค่ามากเป็นอันดับสองที่ไม่ซ้ำ',
    description:
      'รับ N (2 <= N <= 100) และจำนวนเต็ม N จำนวน แล้วพิมพ์ค่ามากเป็นอันดับสองที่ไม่ซ้ำกัน รับประกันว่ามีค่าไม่ซ้ำกันอย่างน้อยสองค่า\nรูปแบบ Input: บรรทัดแรก N และบรรทัดที่สองจำนวนเต็ม N จำนวน',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '5\n1 3 5 2 4', expectedOutput: '4', isHidden: false },
      { inputData: '6\n9 9 8 8 7 7', expectedOutput: '8', isHidden: true },
      { inputData: '4\n-1 -5 -3 -2', expectedOutput: '-2', isHidden: true },
    ],
  },
  {
    title: '20. วงเล็บเปิดปิดสมดุล',
    description:
      'รับสตริงที่ประกอบด้วยวงเล็บ ( และ ) ตรวจว่าทุกวงเล็บเปิดมีวงเล็บปิดคู่กันและลำดับถูกต้องหรือไม่ พิมพ์ True หรือ False',
    timeLimitMs: 1500,
    testCases: [
      { inputData: '(()())', expectedOutput: 'True', isHidden: false },
      { inputData: '(()', expectedOutput: 'False', isHidden: true },
      { inputData: ')(', expectedOutput: 'False', isHidden: true },
    ],
  },
];

function stableId(group: number, item = 0): string {
  const suffix = String(group * 100 + item).padStart(12, '0');
  return `00000000-0000-4000-8000-${suffix}`;
}

async function main() {
  if (!databaseUrl) {
    throw new Error('ไม่พบการตั้งค่าฐานข้อมูลใน .env.local');
  }
  const target = new URL(databaseUrl);
  const targetName = decodeURIComponent(target.pathname.slice(1));
  if (
    targetName !== 'csmju_coding_arena_db' ||
    !['localhost', '127.0.0.1', '::1'].includes(target.hostname)
  ) {
    throw new Error(
      `ยกเลิกเพื่อความปลอดภัย: seed อนุญาตเฉพาะฐานข้อมูล Coding Arena ในเครื่องนี้ (พบ ${target.hostname}/${targetName})`,
    );
  }

  console.log(
    `🌱 เติมโจทย์สำหรับฐานข้อมูลเฉพาะเครื่อง ${target.hostname}/${targetName}`,
  );
  const teacher = await prisma.playerRating.upsert({
    where: { coreUserId: 'seed-lecturer' },
    update: { displayName: 'อาจารย์ตัวอย่าง' },
    create: {
      displayName: 'อาจารย์ตัวอย่าง',
      coreUserId: 'seed-lecturer',
      eloRating: 1500,
    },
  });

  for (const [index, problemData] of problemsData.entries()) {
    const problemId = stableId(index + 1);
    const problem = await prisma.problem.upsert({
      where: { id: problemId },
      update: {
        authorId: teacher.id,
        title: problemData.title,
        description: problemData.description,
        timeLimitMs: problemData.timeLimitMs,
        isActive: true,
      },
      create: {
        id: problemId,
        authorId: teacher.id,
        title: problemData.title,
        description: problemData.description,
        timeLimitMs: problemData.timeLimitMs,
        isActive: true,
      },
    });

    for (const [caseIndex, testCase] of problemData.testCases.entries()) {
      const testCaseId = stableId(index + 1, caseIndex + 1);
      await prisma.testCase.upsert({
        where: { id: testCaseId },
        update: { problemId: problem.id, ...testCase },
        create: { id: testCaseId, problemId: problem.id, ...testCase },
      });
    }
  }

  const [problemCount, testCaseCount] = await Promise.all([
    prisma.problem.count({ where: { authorId: teacher.id } }),
    prisma.testCase.count({ where: { problem: { authorId: teacher.id } } }),
  ]);
  console.log(
    `✅ Seed เสร็จ: ${problemCount} โจทย์, ${testCaseCount} test cases`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('❌ เกิดข้อผิดพลาดในการ Seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
