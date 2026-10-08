"use client";

import { useEffect, useRef } from "react";

/**
 * ฉากเกมพิกเซลของล็อบบี้ (จุดอิสระของ ui-design-system — ใช้สีชุดเดียวกับ token ของ Core Hub)
 *
 * วาดบน canvas ความละเอียดต่ำ (160×72) แล้วขยายแบบ pixelated · นักโค้ดสองคนประลองกัน มีโค้ดลอยขึ้นจากแล็ปท็อป
 * ผู้ใช้ที่ตั้ง "ลดการเคลื่อนไหว" เห็นภาพนิ่งเฟรมเดียว
 */

const W = 160;
const H = 72;

const PALETTE: Record<string, string> = {
  n: "rgb(22 38 77)",
  b: "rgb(13 79 168)",
  p: "rgb(33 84 217)",
  l: "rgb(120 160 240)",
  a: "rgb(241 185 75)",
  w: "rgb(255 255 255)",
  s: "rgb(240 196 150)",
  h: "rgb(60 40 30)",
  g: "rgb(16 185 129)",
  r: "rgb(220 60 60)",
  k: "rgb(15 23 42)",
  c: "rgb(150 160 180)",
};

/** นักโค้ด 12×16 (หันขวา) — สีเสื้อเปลี่ยนตามฝั่ง (ตัว X) */
const CODER = [
  "....hhhh....",
  "...hhhhhh...",
  "...hssssh...",
  "...sksskss..",
  "...ssssss...",
  "....ssss....",
  "..XXXXXXXX..",
  ".XXXXXXXXXX.",
  ".sXXXXXXXXs.",
  ".sXXXXXXXXs.",
  "..XXXXXXXX..",
  "..nnn..nnn..",
  "..nnn..nnn..",
  "..nnn..nnn..",
  "..kkk..kkk..",
  "............",
];

const LAPTOP = [
  "cccccccc",
  "ckkkkkkc",
  "ckgkkgkc",
  "ckkgkkkc",
  "cccccccc",
  "cccccccccc",
];

/** ฟอนต์ 3×5 เฉพาะตัวที่ใช้ */
const GLYPHS: Record<string, string[]> = {
  V: ["x.x", "x.x", "x.x", "x.x", ".x."],
  S: [".xx", "x..", ".x.", "..x", "xx."],
  "{": [".xx", ".x.", "x..", ".x.", ".xx"],
  "}": ["xx.", ".x.", "..x", ".x.", "xx."],
  "<": ["..x", ".x.", "x..", ".x.", "..x"],
  ">": ["x..", ".x.", "..x", ".x.", "x.."],
  "/": ["..x", "..x", ".x.", "x..", "x.."],
  "0": ["xxx", "x.x", "x.x", "x.x", "xxx"],
  "1": [".x.", "xx.", ".x.", ".x.", "xxx"],
  ";": ["...", ".x.", "...", ".x.", "x.."],
};

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, flip = false, shirt = "p") {
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === ".") return;
      const color = PALETTE[ch === "X" ? shirt : ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? x + row.length - 1 - i : x + i, y + j, 1, 1);
    });
  });
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  [...value].forEach((ch, k) => {
    (GLYPHS[ch] ?? []).forEach((row, j) => {
      [...row].forEach((cell, i) => {
        if (cell === "x") ctx.fillRect(x + (k * 4 + i) * scale, y + j * scale, scale, scale);
      });
    });
  });
}

// ดาวตำแหน่งคงที่ (สุ่มแบบกำหนดผลได้ — เหมือนกันทุกครั้งที่เปิด)
const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % W, y: (i * 23) % 40, t: i % 7 }));
const FLOATERS = ["{}", "</>", "01", ";", "{}", "10"];

function draw(ctx: CanvasRenderingContext2D, frame: number) {
  // ฟ้าแบบขั้น
  const bands = ["rgb(10 18 40)", "rgb(16 28 62)", "rgb(22 38 77)", "rgb(18 52 110)", "rgb(13 79 168)"];
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * 11, W, 11);
  });
  STARS.forEach((s) => {
    ctx.fillStyle = (frame / 8 + s.t) % 7 < 1 ? PALETTE.a : PALETTE.l;
    ctx.fillRect(s.x, s.y, 1, 1);
  });

  // พื้นอิฐ
  for (let y = 55; y < H; y += 4) {
    for (let x = (y / 4) % 2 ? -4 : 0; x < W; x += 8) {
      ctx.fillStyle = PALETTE.n;
      ctx.fillRect(x, y, 8, 4);
      ctx.fillStyle = PALETTE.b;
      ctx.fillRect(x + 1, y + 1, 6, 2);
    }
  }

  const bob = (offset: number) => (Math.floor((frame + offset) / 12) % 2 === 0 ? 0 : -1);

  // ผู้เล่นซ้าย (น้ำเงิน) และขวา (เหลือง)
  sprite(ctx, CODER, 26, 39 + bob(0), false, "p");
  sprite(ctx, LAPTOP, 40, 49, false);
  sprite(ctx, CODER, 122, 39 + bob(6), true, "a");
  sprite(ctx, LAPTOP, 110, 49, true);

  // โค้ดลอยขึ้นจากแล็ปท็อปทั้งสองฝั่ง
  FLOATERS.forEach((glyph, i) => {
    const life = (frame + i * 22) % 132;
    const y = 46 - Math.floor(life / 3);
    if (y < 4) return;
    const left = i % 2 === 0;
    const x = left ? 44 + ((i * 5) % 14) : 104 - ((i * 5) % 14);
    text(ctx, glyph, x, y, left ? PALETTE.l : PALETTE.a);
  });

  // VS กะพริบ
  if (Math.floor(frame / 20) % 4 !== 3) {
    text(ctx, "VS", 69, 24, PALETTE.r, 3);
    text(ctx, "VS", 68, 23, PALETTE.w, 3);
  }
}

export function PixelScene({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let raf = 0;
    let last = 0;

    const loop = (now: number) => {
      // 15 เฟรม/วินาทีพอสำหรับพิกเซลอาร์ต (ประหยัดแบตมือถือ)
      if (now - last > 66) {
        last = now;
        draw(ctx, frame++);
      }
      raf = requestAnimationFrame(loop);
    };

    draw(ctx, 0);
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      role="img"
      aria-label="ฉากพิกเซล: นักโค้ดสองคนประลองกัน มีโค้ดลอยขึ้นจากแล็ปท็อป"
      className={`pixel-canvas block h-auto w-full ${className}`}
    />
  );
}
