/**
 * สไปรต์พิกเซลของเกม — วาดจากตาราง 16×16 ลง canvas แล้วเก็บเป็น data URL (ไม่มีไฟล์รูปหรือโหลดจากภายนอก)
 * สีมาจากชุดสีของ Core Hub (ฉากเกม = จุดอิสระของ ui-design-system)
 */

const PALETTE: Record<string, string> = {
  k: 'rgb(15 23 42)',
  w: 'rgb(255 255 255)',
  s: 'rgb(240 196 150)',
  h: 'rgb(70 45 30)',
  // อัศวิน (น้ำเงิน)
  B: 'rgb(33 84 217)',
  b: 'rgb(120 160 240)',
  g: 'rgb(170 180 200)',
  // นักเวท (ม่วง)
  P: 'rgb(124 58 237)',
  p: 'rgb(196 160 255)',
  y: 'rgb(241 185 75)',
  // นักธนู (เขียว)
  G: 'rgb(22 140 90)',
  l: 'rgb(110 210 150)',
  n: 'rgb(120 80 40)',
  // สไลม์
  S: 'rgb(60 190 90)',
  m: 'rgb(150 235 160)',
  // พันธมิตร
  A: 'rgb(200 140 40)',
  a: 'rgb(250 210 120)',
  r: 'rgb(220 60 60)',
};

const KNIGHT = [
  '................',
  '.....gggggg.....',
  '....gggggggg....',
  '....gkkggkkg....',
  '....gggggggg....',
  '.....gggggg.....',
  '...BBBBBBBBBB...',
  '..BbBBBBBBBBbB..',
  '..BbBBByyBBBbB..',
  '..ssBBByyBBBss..',
  '....BBBBBBBB....',
  '....BBB..BBB....',
  '....ggg..ggg....',
  '....ggg..ggg....',
  '...kkkk..kkkk...',
  '................',
];

const MAGE = [
  '.......PP.......',
  '......PPPy......',
  '.....PPPPPP.....',
  '....PPPPPPPP....',
  '...PPPPPPPPPP...',
  '.....ssssss.....',
  '.....skssks.....',
  '.....ssssss.....',
  '....PPPPPPPPy...',
  '...PpPPPPPPPy...',
  '...sPPPPPPPPy...',
  '....PPPPPPPPy...',
  '....PPPPPPPP....',
  '...PPPPPPPPPP...',
  '...kkk....kkk...',
  '................',
];

const ARCHER = [
  '................',
  '.....GGGGGG.....',
  '....GGGGGGGG....',
  '....GssssssG..n.',
  '....GskssksG.n.n',
  '.....ssssss.n..n',
  '....GGGGGGGGn..n',
  '...GlGGGGGGGn..n',
  '...sGGGnnGGGn..n',
  '....GGGGGGGG.n.n',
  '....GGGGGGGG..n.',
  '....nnn..nnn....',
  '....GGG..GGG....',
  '....GGG..GGG....',
  '...kkkk..kkkk...',
  '................',
];

const ALLY = [
  '................',
  '......aaaa......',
  '.....aaaaaa.....',
  '.....skssks.....',
  '.....ssssss.....',
  '....AAAAAAAA....',
  '...AaAAAAAAaA...',
  '...sAAArrAAAs...',
  '....AAAAAAAA....',
  '....AAA..AAA....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const SLIME = [
  '................',
  '................',
  '................',
  '................',
  '......SSSS......',
  '....SSSSSSSS....',
  '...SSmmSSSSSS...',
  '..SSmmSSSSSSSS..',
  '..SSSwkSSSwkSS..',
  '.SSSSkkSSSkkSSS.',
  '.SSSSSSSSSSSSSS.',
  '.SSSSSrrrrSSSSS.',
  '.SSSSSSSSSSSSSS.',
  '..SSSSSSSSSSSS..',
  '................',
  '................',
];

/** วงเวทเป้าหมาย — สีตามตัวละคร (X ถูกแทนด้วยสีหลัก) */
const RING = [
  '................',
  '................',
  '.....XXXXXX.....',
  '...XX......XX...',
  '..X..x....x..X..',
  '.X....x..x....X.',
  '.X.....xx.....X.',
  'X......xx......X',
  'X.....x..x.....X',
  '.X...x....x...X.',
  '.X..x......x..X.',
  '..X..........X..',
  '...XX......XX...',
  '.....XXXXXX.....',
  '................',
  '................',
];

export type SpriteName = 'knight' | 'mage' | 'archer' | 'ally' | 'slime' | 'ring-knight' | 'ring-mage' | 'ring-archer' | 'ring-ally';

const RING_COLORS: Record<string, [string, string]> = {
  knight: [PALETTE.B, PALETTE.b],
  mage: [PALETTE.P, PALETTE.p],
  archer: [PALETTE.G, PALETTE.l],
  ally: [PALETTE.A, PALETTE.a],
};

const cache = new Map<SpriteName, string>();

function draw(rows: string[], colors: Record<string, string>): string {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color = colors[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return canvas.toDataURL('image/png');
}

/** data URL ของสไปรต์ (สร้างครั้งเดียวต่อชื่อ) — เรียกได้เฉพาะฝั่งเบราว์เซอร์ */
export function sprite(name: SpriteName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  let url: string;
  if (name.startsWith('ring-')) {
    const [main, light] = RING_COLORS[name.slice(5)];
    url = draw(RING, { X: main, x: light });
  } else {
    const rows = { knight: KNIGHT, mage: MAGE, archer: ARCHER, ally: ALLY, slime: SLIME }[name as 'knight'];
    url = draw(rows, PALETTE);
  }
  cache.set(name, url);
  return url;
}
