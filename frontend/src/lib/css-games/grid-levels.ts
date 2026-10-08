import type { Declarations, Level, Unit } from './types';

/**
 * Grid Attack — วางเขตโจมตี (กล่องสีแดง) ให้ทับสไลม์ทุกตัวบนสนาม 5×5 ด้วย CSS Grid
 * ด่านช่วงหลังให้จัดทั้งกองทัพด้วย grid-template-* ของสนาม
 * เนื้อหาเขียนขึ้นใหม่สำหรับสาขา (ไม่ได้คัดลอกจากเว็บอื่น)
 */

const FIELD: Declarations = {
  display: 'grid',
  'grid-template-columns': 'repeat(5, 1fr)',
  'grid-template-rows': 'repeat(5, 1fr)',
};

const ATTACK: Unit = { kind: 'attack' };
const ALLY: Unit = { kind: 'ally' };
const allies = (n: number): Unit[] => Array.from({ length: n }, () => ALLY);

function attack(
  id: number,
  rest: Omit<Level, 'id' | 'edit' | 'selector' | 'targetKind' | 'base' | 'units' | 'lines'> &
    Partial<Pick<Level, 'units' | 'lines'>> & { preset?: Declarations },
): Level {
  const { preset, ...level } = rest;

  return {
    id,
    edit: 'unit',
    selector: '.attack',
    targetKind: 'attack',
    base: FIELD,
    units: [{ kind: 'attack', style: preset }],
    lines: 2,
    ...level,
  };
}

function army(id: number, rest: Omit<Level, 'id' | 'edit' | 'selector'>): Level {
  return { id, edit: 'container', selector: '#field', ...rest };
}

export const GRID_LEVELS: Level[] = [
  attack(1, {
    title: 'ฟันแรก',
    story: 'สไลม์ตัวแรกโผล่มาที่ช่องที่ 3 ของแถวบน ส่งเขตโจมตีไปที่ช่องนั้น',
    lesson: [
      'Grid แบ่งสนามด้วย **เส้นกริด** นับจาก 1 · สนาม 5 ช่องมีเส้น 1 ถึง 6',
      '`grid-column-start` บอกว่าลูกเริ่มที่เส้นแนวตั้งเส้นไหน',
    ],
    solution: { 'grid-column-start': '3' },
    hint: 'grid-column-start: 3;',
  }),
  attack(2, {
    title: 'สุดขอบสนาม',
    story: 'สไลม์หนีไปมุมขวาบน',
    lesson: ['ช่องสุดท้ายของสนาม 5 คอลัมน์เริ่มที่เส้น 5'],
    solution: { 'grid-column-start': '5' },
    hint: 'เส้นที่ 5',
  }),
  attack(3, {
    title: 'ฟันยาว',
    story: 'สไลม์สามตัวเรียงกัน เขตโจมตีเริ่มที่เส้น 2 แล้ว ต้องลากยาวไปให้ถึง',
    lesson: ['`grid-column-end` บอกเส้นที่ลูก**สิ้นสุด** (ไม่รวมช่องหลังเส้นนั้น)'],
    preset: { 'grid-column-start': '2' },
    fixed: { 'grid-column-start': '2' },
    solution: { 'grid-column-end': '5' },
    hint: 'จบที่เส้น 5 จะครอบช่อง 2, 3, 4',
  }),
  attack(4, {
    title: 'นับเป็นช่องด้วย span',
    story: 'ขี้เกียจนับเส้น? บอกจำนวนช่องที่จะคลุมแทนได้',
    lesson: ['`span n` แปลว่า "คลุม n ช่อง" เช่น `grid-column-end: span 3`'],
    preset: { 'grid-column-start': '3' },
    fixed: { 'grid-column-start': '3' },
    solution: { 'grid-column-end': 'span 3' },
    hint: 'span 3',
  }),
  attack(5, {
    title: 'คาถาย่อ grid-column',
    story: 'สไลม์ยึดช่อง 2 ถึง 4 ของแถวบน',
    lesson: ['`grid-column: <เริ่ม> / <จบ>` เขียน start กับ end ในบรรทัดเดียว เช่น `grid-column: 1 / 3`'],
    solution: { 'grid-column': '2 / 5' },
    hint: 'grid-column: 2 / 5;',
  }),
  attack(6, {
    title: 'ลงไปแถวล่าง',
    story: 'คราวนี้สไลม์อยู่แถวที่ 4',
    lesson: ['แนวนอนเรียกว่า row — `grid-row-start` ทำงานแบบเดียวกับ grid-column-start แต่แนวตั้ง'],
    preset: { 'grid-column': '2 / 4' },
    fixed: { 'grid-column': '2 / 4' },
    solution: { 'grid-row-start': '4' },
    hint: 'grid-row-start: 4;',
  }),
  attack(7, {
    title: 'กำแพงสไลม์แนวดิ่ง',
    story: 'สไลม์ต่อตัวกันเป็นแนวดิ่งที่คอลัมน์ขวาสุด',
    lesson: ['`grid-row: <เริ่ม> / <จบ>` คู่กับ grid-column'],
    preset: { 'grid-column': '5' },
    fixed: { 'grid-column': '5' },
    solution: { 'grid-row': '2 / 5' },
    hint: 'แถว 2 ถึงก่อนเส้น 5',
  }),
  attack(8, {
    title: 'รังสไลม์สี่เหลี่ยม',
    story: 'สไลม์จับกลุ่มเป็นสี่เหลี่ยมมุมซ้ายบน',
    lesson: ['ใช้ `grid-column` และ `grid-row` พร้อมกันเพื่อคลุมเป็นสี่เหลี่ยม'],
    solution: { 'grid-column': '2 / 4', 'grid-row': '1 / 3' },
    lines: 3,
    hint: 'คอลัมน์ 2-3 · แถว 1-2',
  }),
  attack(9, {
    title: 'ฟันทั้งแถวด้วยเลขติดลบ',
    story: 'สไลม์เต็มแถวกลาง ใช้เส้นสุดท้ายโดยไม่ต้องนับ',
    lesson: ['เส้นกริดนับย้อนจากท้ายได้ด้วยเลขติดลบ: `-1` คือเส้นสุดท้ายเสมอ', '`grid-column: 1 / -1` = คลุมทั้งแถว'],
    preset: { 'grid-row': '3' },
    fixed: { 'grid-row': '3' },
    solution: { 'grid-column': '1 / -1' },
    hint: '1 / -1',
  }),
  attack(10, {
    title: 'คาถาใหญ่ grid-area',
    story: 'รังใหญ่กลางสนาม ร่ายคาถาเดียวให้จบ',
    lesson: ['`grid-area: แถวเริ่ม / คอลัมน์เริ่ม / แถวจบ / คอลัมน์จบ`'],
    solution: { 'grid-area': '2 / 2 / 5 / 5' },
    hint: 'grid-area: 2 / 2 / 5 / 5;',
  }),
  attack(11, {
    title: 'เสาสไลม์สองแถว',
    story: 'สไลม์เรียงเต็มความสูงที่สองคอลัมน์ขวา',
    lesson: ['ผสม span กับเลขติดลบได้: `grid-column: 4 / span 2` · `grid-row: 1 / -1`'],
    solution: { 'grid-column': '4 / span 2', 'grid-row': '1 / -1' },
    lines: 3,
    hint: 'คอลัมน์ 4 คลุม 2 ช่อง · แถวเต็มความสูง',
  }),
  attack(12, {
    title: 'แซงคิวพันธมิตร',
    story: 'เหล่าพันธมิตรยืนเต็มแถวแรก เขตโจมตีต้องแทรกไปช่องแรกสุด',
    lesson: ['ใน grid ใช้ `order` ได้เหมือน flexbox — ลูกที่ order น้อยกว่าถูกวางก่อน'],
    units: [ALLY, ALLY, ATTACK, ALLY, ALLY],
    solution: { order: '-1' },
    hint: 'order ติดลบ',
  }),
  army(13, {
    title: 'จัดทัพสามคอลัมน์',
    story: 'ทัพพันธมิตรต้องยืนเป็นสามคอลัมน์เท่ากัน',
    lesson: [
      'ด่านนี้แก้ CSS ของสนาม: `grid-template-columns` กำหนดจำนวนและความกว้างคอลัมน์',
      '`fr` คือ "ส่วน" ของพื้นที่ที่เหลือ — `1fr 1fr 1fr` = สามคอลัมน์เท่ากัน',
    ],
    units: allies(6),
    base: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    fixed: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    solution: { 'grid-template-columns': '1fr 1fr 1fr' },
    lines: 2,
    hint: '1fr สามครั้ง',
  }),
  army(14, {
    title: 'repeat ประหยัดแรง',
    story: 'สี่คอลัมน์เท่ากัน เขียนซ้ำก็เมื่อย',
    lesson: ['`repeat(n, ขนาด)` = เขียนขนาดเดิม n ครั้ง เช่น `repeat(4, 1fr)`'],
    units: allies(8),
    base: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    fixed: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    solution: { 'grid-template-columns': 'repeat(4, 1fr)' },
    lines: 2,
    hint: 'repeat(4, 1fr)',
  }),
  army(15, {
    title: 'ปีกซ้ายเล็ก ปีกขวาใหญ่',
    story: 'คอลัมน์ขวากว้างกว่าซ้ายสามเท่า',
    lesson: ['`1fr 3fr` แบ่งพื้นที่เป็น 4 ส่วน ซ้ายได้ 1 ขวาได้ 3'],
    units: allies(4),
    base: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    fixed: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    solution: { 'grid-template-columns': '1fr 3fr' },
    lines: 2,
    hint: '1fr 3fr',
  }),
  army(16, {
    title: 'ผสมหน่วยวัด',
    story: 'คอลัมน์แรกกว้าง 100px พอดี ที่เหลือแบ่ง 1:2',
    lesson: ['ผสม px กับ fr ได้ — px ถูกจองก่อน แล้ว fr แบ่งส่วนที่เหลือ'],
    units: allies(3),
    base: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    fixed: { display: 'grid', 'grid-template-rows': 'repeat(5, 1fr)' },
    solution: { 'grid-template-columns': '100px 1fr 2fr' },
    lines: 2,
    hint: '100px 1fr 2fr',
  }),
  army(17, {
    title: 'แถวสูงไม่เท่ากัน',
    story: 'ห้าคอลัมน์เหมือนเดิม แต่แถวล่างสูงกว่าแถวบนสี่เท่า',
    lesson: ['`grid-template-rows` ใช้รูปแบบเดียวกับ columns แต่กำหนดแถว'],
    units: allies(10),
    base: { display: 'grid', 'grid-template-columns': 'repeat(5, 1fr)' },
    fixed: { display: 'grid', 'grid-template-columns': 'repeat(5, 1fr)' },
    solution: { 'grid-template-rows': '1fr 4fr' },
    lines: 2,
    hint: '1fr 4fr',
  }),
  army(18, {
    title: 'คาถาย่อ grid-template',
    story: 'กำหนดแถวและคอลัมน์ในบรรทัดเดียว',
    lesson: ['`grid-template: <แถว> / <คอลัมน์>` เช่น `grid-template: 1fr 1fr / 1fr 2fr`'],
    units: allies(4),
    base: { display: 'grid' },
    fixed: { display: 'grid' },
    solution: { 'grid-template': '1fr 3fr / 2fr 1fr' },
    lines: 2,
    hint: 'แถว 1fr 3fr · คอลัมน์ 2fr 1fr',
  }),
  attack(19, {
    title: 'จุดอ่อนมุมขวาบน',
    story: 'เขตโจมตีเล็กกว่าช่อง ต้องชิดมุมขวาบนของช่องกลางสนาม',
    lesson: [
      '`justify-self` จัดลูกในช่องตามแนวนอน · `align-self` ตามแนวตั้ง',
      'ค่า: `start` `center` `end` `stretch` (ใช้ได้เมื่อลูกเล็กกว่าช่อง)',
    ],
    preset: { 'grid-area': '3 / 3', width: '50%', height: '50%' },
    fixed: { 'grid-area': '3 / 3' },
    solution: { 'justify-self': 'end', 'align-self': 'start' },
    lines: 3,
    hint: 'justify-self: end; align-self: start;',
  }),
  army(20, {
    title: 'บอสใหญ่: แผนที่ทัพ',
    story: 'วาดแผนที่ทัพด้วยชื่อพื้นที่ — นักธนูยึดแถวบน นักเวทยึดฝั่งซ้าย อัศวินคุมที่เหลือ',
    lesson: [
      '`grid-template-areas` วาดผังด้วยข้อความ แต่ละแถวอยู่ใน "..." และแต่ละช่องคือชื่อพื้นที่',
      'ลูกที่มี `grid-area: a` จะไปอยู่ในช่องชื่อ a ทั้งหมด (ต้องเป็นสี่เหลี่ยม)',
    ],
    units: [
      { kind: 'archer', style: { 'grid-area': 'a' } },
      { kind: 'mage', style: { 'grid-area': 'b' } },
      { kind: 'knight', style: { 'grid-area': 'c' } },
    ],
    base: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
    fixed: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', 'grid-template-rows': 'repeat(3, 1fr)' },
    solution: { 'grid-template-areas': '"a a a" "b c c" "b c c"' },
    lines: 2,
    hint: 'grid-template-areas: "a a a" "b c c" "b c c";',
  }),
];
