import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { getDatabaseUrl } from '../src/prisma/database-url';

loadEnv({ path: '.env.local' });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() ?? '' }),
});

async function main() {
  console.log('🌱 เริ่มทำการ Seed ข้อมูล...');

  // 1. สร้างบัญชีผู้สอนสำหรับข้อมูลตัวอย่าง
  const teacher = await prisma.user.upsert({
    where: { coreUserId: 'seed-lecturer' },
    update: {},
    create: {
      displayName: 'อาจารย์ตัวอย่าง',
      coreUserId: 'seed-lecturer',
      eloRating: 1500,
    },
  });
  console.log(`👤 สร้างบัญชีอาจารย์: ${teacher.displayName}`);

  // 2. ข้อมูลโจทย์จำลอง 10 ข้อ พร้อม Test Cases
  const problemsData = [
    {
      title: '1. Hello World',
      description:
        'เขียนโปรแกรมเพื่อพิมพ์คำว่า "Hello, World!" ออกมาทางหน้าจอ (ระวังตัวพิมพ์ใหญ่-เล็ก และเครื่องหมายให้ตรงเป๊ะ)',
      timeLimitMs: 1000,
      testCases: [
        { inputData: '', expectedOutput: 'Hello, World!', isHidden: false },
      ],
    },
    {
      title: '2. A + B Problem',
      description:
        'รับค่าตัวเลขจำนวนเต็ม 2 ตัวที่คั่นด้วยช่องว่าง แล้วพิมพ์ผลบวกออกมา\nตัวอย่าง Input: `3 5`\nตัวอย่าง Output: `8`',
      timeLimitMs: 1000,
      testCases: [
        { inputData: '3 5', expectedOutput: '8', isHidden: false },
        { inputData: '100 250', expectedOutput: '350', isHidden: true },
        { inputData: '-10 50', expectedOutput: '40', isHidden: true },
      ],
    },
    {
      title: '3. คู่หรือคี่ (Even or Odd)',
      description:
        'รับค่าตัวเลขจำนวนเต็ม 1 ตัว หากเป็นเลขคู่ให้พิมพ์ "Even" หากเป็นเลขคี่ให้พิมพ์ "Odd"',
      timeLimitMs: 1000,
      testCases: [
        { inputData: '4', expectedOutput: 'Even', isHidden: false },
        { inputData: '7', expectedOutput: 'Odd', isHidden: false },
        { inputData: '0', expectedOutput: 'Even', isHidden: true },
      ],
    },
    {
      title: '4. หาพื้นที่สี่เหลี่ยมผืนผ้า',
      description:
        'รับค่าความกว้างและความยาว (คั่นด้วยช่องว่าง) ให้คำนวณและพิมพ์พื้นที่ของสี่เหลี่ยมผืนผ้านั้น',
      timeLimitMs: 1000,
      testCases: [
        { inputData: '5 10', expectedOutput: '50', isHidden: false },
        { inputData: '12 12', expectedOutput: '144', isHidden: true },
      ],
    },
    {
      title: '5. แฟกทอเรียล (Factorial)',
      description: 'รับค่าตัวเลข n (0 <= n <= 10) ให้หาค่าของ n! (n factorial)',
      timeLimitMs: 1500,
      testCases: [
        { inputData: '5', expectedOutput: '120', isHidden: false },
        { inputData: '0', expectedOutput: '1', isHidden: true },
        { inputData: '10', expectedOutput: '3628800', isHidden: true },
      ],
    },
    {
      title: '6. หาค่ามากที่สุดจาก 3 จำนวน',
      description:
        'รับตัวเลข 3 ตัวที่คั่นด้วยช่องว่าง ให้พิมพ์ค่าที่มากที่สุดออกมาเพียงตัวเดียว',
      timeLimitMs: 1000,
      testCases: [
        { inputData: '10 25 5', expectedOutput: '25', isHidden: false },
        { inputData: '-5 -1 -10', expectedOutput: '-1', isHidden: true },
        { inputData: '100 100 100', expectedOutput: '100', isHidden: true },
      ],
    },
    {
      title: '7. นับจำนวนสระ (Vowel Count)',
      description:
        'รับข้อความภาษาอังกฤษ 1 บรรทัด ให้นับว่ามีสระ (a, e, i, o, u) ตัวพิมพ์เล็กกี่ตัว',
      timeLimitMs: 1000,
      testCases: [
        { inputData: 'hello world', expectedOutput: '3', isHidden: false },
        {
          inputData: 'csmju coding arena',
          expectedOutput: '6',
          isHidden: true,
        },
        { inputData: 'xyz', expectedOutput: '0', isHidden: true },
      ],
    },
    {
      title: '8. ตรวจสอบพาลินโดรม (Palindrome)',
      description:
        'รับสตริง 1 คำ ให้ตรวจสอบว่าอ่านจากหน้าไปหลัง และหลังมาหน้าเหมือนกันหรือไม่ พิมพ์ "True" ถ้าใช่ และ "False" ถ้าไม่ใช่',
      timeLimitMs: 1000,
      testCases: [
        { inputData: 'radar', expectedOutput: 'True', isHidden: false },
        { inputData: 'hello', expectedOutput: 'False', isHidden: false },
        { inputData: 'a', expectedOutput: 'True', isHidden: true },
      ],
    },
    {
      title: '9. ผลรวมใน Array',
      description:
        'รับตัวเลขที่คั่นด้วยช่องว่าง 1 บรรทัด ให้หาผลรวมของตัวเลขทั้งหมด',
      timeLimitMs: 2000,
      testCases: [
        { inputData: '1 2 3 4 5', expectedOutput: '15', isHidden: false },
        { inputData: '10 20 30 40 50', expectedOutput: '150', isHidden: true },
        { inputData: '-5 5 10 -10', expectedOutput: '0', isHidden: true },
      ],
    },
    {
      title: '10. จำนวนเฉพาะ (Prime Number)',
      description:
        'รับตัวเลขจำนวนเต็มบวก N ตรวจสอบว่าเป็นจำนวนเฉพาะหรือไม่ หากใช่พิมพ์ "Prime" หากไม่ใช่พิมพ์ "Not Prime"',
      timeLimitMs: 2000,
      testCases: [
        { inputData: '7', expectedOutput: 'Prime', isHidden: false },
        { inputData: '10', expectedOutput: 'Not Prime', isHidden: false },
        { inputData: '97', expectedOutput: 'Prime', isHidden: true },
        { inputData: '1', expectedOutput: 'Not Prime', isHidden: true }, // 1 ไม่ใช่จำนวนเฉพาะ
      ],
    },
  ];

  // 3. วนลูปบันทึกโจทย์และ Test Cases
  for (const p of problemsData) {
    const problem = await prisma.problem.create({
      data: {
        authorId: teacher.id,
        title: p.title,
        description: p.description,
        timeLimitMs: p.timeLimitMs,
        isActive: true,
        testCases: {
          create: p.testCases, // Prisma สามารถ Insert table ลูก (TestCases) ไปพร้อมกันได้เลย
        },
      },
    });
    console.log(`📝 สร้างโจทย์สำเร็จ: ${problem.title}`);
  }

  console.log('✅ Seed ข้อมูลเสร็จสมบูรณ์!');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในการ Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
