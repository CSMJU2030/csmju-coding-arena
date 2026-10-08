import type { CSSProperties } from 'react';
import type { Declarations } from './types';

/** คุณสมบัติที่เกมยอมให้ใช้ — เรื่องจัดวางล้วน ๆ (ไม่มี background-image/url/content ฯลฯ) */
export const ALLOWED_PROPERTIES = new Set([
  'display',
  'flex-direction',
  'flex-wrap',
  'flex-flow',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'justify-self',
  'justify-items',
  'place-self',
  'place-items',
  'place-content',
  'order',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'flex',
  'gap',
  'row-gap',
  'column-gap',
  'grid-template-columns',
  'grid-template-rows',
  'grid-template-areas',
  'grid-template',
  'grid-auto-flow',
  'grid-auto-columns',
  'grid-auto-rows',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
  'grid-column',
  'grid-row',
  'grid-area',
]);

/** ค่าที่ยอมรับ: ตัวอักษร ตัวเลข หน่วย / % ( ) , ช่องว่าง และสตริงในเครื่องหมายคำพูดคู่ (grid-template-areas) */
const SAFE_VALUE = /^[\w\s\-.,/%()"]+$/u;

export interface ParseResult {
  declarations: Declarations;
  problems: string[];
}

/** อ่าน "prop: value;" ทีละรายการ — ส่วนที่ไม่รู้จักถูกข้ามพร้อมบอกเหตุผล (ไม่ทำให้เกมพัง) */
export function parseDeclarations(input: string): ParseResult {
  const declarations: Declarations = {};
  const problems: string[] = [];
  const cleaned = input.replace(/\/\*[\s\S]*?\*\//gu, '');

  for (const raw of cleaned.split(';')) {
    const text = raw.trim();
    if (!text) continue;
    const colon = text.indexOf(':');
    if (colon < 0) {
      problems.push(`"${text.slice(0, 30)}" ขาดเครื่องหมาย :`);
      continue;
    }
    const property = text.slice(0, colon).trim().toLowerCase();
    const value = text.slice(colon + 1).trim();
    if (!ALLOWED_PROPERTIES.has(property)) {
      problems.push(`ไม่รู้จัก ${property} (เกมนี้ใช้ได้เฉพาะคุณสมบัติจัดวาง flex/grid)`);
      continue;
    }
    if (!value || value.length > 200 || !SAFE_VALUE.test(value) || /url\(|expression/iu.test(value)) {
      problems.push(`ค่าของ ${property} ไม่ถูกต้อง`);
      continue;
    }
    declarations[property] = value;
  }

  return { declarations, problems };
}

/** grid-column-start → gridColumnStart สำหรับ style ของ React */
export function toStyle(declarations: Declarations): CSSProperties {
  const style: Record<string, string> = {};
  for (const [property, value] of Object.entries(declarations)) {
    style[property.replace(/-([a-z])/gu, (_, c: string) => c.toUpperCase())] = value;
  }
  return style as CSSProperties;
}

export function formatDeclarations(declarations: Declarations): string[] {
  return Object.entries(declarations).map(([p, v]) => `${p}: ${v};`);
}
