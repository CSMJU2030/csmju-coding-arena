import { FLEXBOX_LEVELS } from './flexbox-levels';
import { GRID_LEVELS } from './grid-levels';
import type { GameId, GameMeta } from './types';

export const GAMES: Record<GameId, GameMeta> = {
  flexbox: {
    id: 'flexbox',
    title: 'Flexbox Adventure',
    tagline: 'พาเหล่าฮีโร่ไปยืนบนวงเวทด้วย Flexbox — 24 ด่าน ตั้งแต่ justify-content ถึงบอสใหญ่',
    levels: FLEXBOX_LEVELS,
  },
  grid: {
    id: 'grid',
    title: 'Grid Attack',
    tagline: 'วางเขตโจมตีให้ทับสไลม์และจัดทัพด้วย CSS Grid — 20 ด่าน ตั้งแต่เส้นกริดถึง grid-template-areas',
    levels: GRID_LEVELS,
  },
};

export const API_GAME: Record<GameId, 'FLEXBOX' | 'GRID'> = { flexbox: 'FLEXBOX', grid: 'GRID' };
export const XP_PER_LEVEL = 10;
