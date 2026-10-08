/**
 * เกม CSS (Flexbox Adventure · Grid Attack)
 *
 * หลักการตรวจ (แบบเดียวกับเกมสอน CSS ทั่วไป แต่เนื้อหาเขียนเอง):
 * กระดานมีสองชั้นขนาดเท่ากัน — ชั้น "เงาคำตอบ" ใส่ CSS เฉลย (มองไม่เห็น) และชั้นผู้เล่นใส่ CSS ที่ผู้เล่นพิมพ์
 * เบราว์เซอร์จัด layout จริงทั้งสองชั้น แล้วเทียบตำแหน่ง/ขนาดของตัวละครทีละตัว ตรงกันทั้งหมด = ผ่าน
 * ผู้เล่นจึงตอบได้หลายแบบ (เช่น flex-flow แทน flex-direction + flex-wrap) ขอแค่ผลลัพธ์ตรง
 */

export type GameId = 'flexbox' | 'grid';

/** ชนิดตัวละคร — สีของตัวละครตรงกับสีของเป้าหมาย */
export type UnitKind = 'knight' | 'mage' | 'archer' | 'attack' | 'ally';

export type Declarations = Record<string, string>;

export interface Unit {
  kind: UnitKind;
  /** style คงที่ของตัวนี้ (ทั้งเงาและผู้เล่น) เช่น grid-area */
  style?: Declarations;
}

export interface Level {
  id: number;
  title: string;
  /** เรื่องเล่าสั้น ๆ ของด่าน */
  story: string;
  /** อธิบายคุณสมบัติที่ด่านนี้สอน — `โค้ด` ในเครื่องหมาย backtick จะแสดงเป็นโค้ด */
  lesson: string[];
  /** ผู้เล่นแก้ CSS ของกระดาน (`container`) หรือของตัวละครที่ตรงกับ selector (`unit`) */
  edit: 'container' | 'unit';
  /** selector ที่แสดงในตัวแก้โค้ด เช่น `#field` หรือ `.mage` */
  selector: string;
  /** ตัวละครชนิดไหนที่ CSS ของผู้เล่นมีผล (เมื่อ edit = unit) */
  targetKind?: UnitKind;
  units: Unit[];
  /** style ของกระดานที่ล็อกไว้ — แสดงเป็นบรรทัดอ่านอย่างเดียวถ้าอยู่ใน `fixed` */
  base: Declarations;
  /** บรรทัดที่ผู้เล่นเห็นเหนือช่องพิมพ์ (แก้ไม่ได้) */
  fixed?: Declarations;
  /** CSS เฉลย (ใส่ที่ชั้นเงาเท่านั้น) */
  solution: Declarations;
  /** จำนวนบรรทัดที่ให้พิมพ์ */
  lines: number;
  hint: string;
}

export interface GameMeta {
  id: GameId;
  title: string;
  tagline: string;
  levels: Level[];
}
