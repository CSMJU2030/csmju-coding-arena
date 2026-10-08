'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiCollection, apiRequest } from '@/lib/api';
import { API_GAME } from './games';
import type { GameId } from './types';

interface LevelClear {
  game: 'FLEXBOX' | 'GRID';
  level: number;
}

/** ด่านที่ผ่านแล้วของผู้เล่น — เก็บที่ backend (`/api/v1/level-clears`) ผูกกับบัญชี Core Hub */
export function useLevelClears() {
  const [clears, setClears] = useState<Record<GameId, Set<number>>>({ flexbox: new Set(), grid: new Set() });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiCollection<LevelClear>('/api/v1/level-clears')
      .then((rows) => {
        if (!active) return;
        setClears({
          flexbox: new Set(rows.filter((r) => r.game === 'FLEXBOX').map((r) => r.level)),
          grid: new Set(rows.filter((r) => r.game === 'GRID').map((r) => r.level)),
        });
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : 'โหลดความคืบหน้าไม่สำเร็จ'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const record = useCallback((game: GameId, level: number) => {
    setClears((all) => ({ ...all, [game]: new Set([...all[game], level]) }));
    apiRequest('/api/v1/level-clears', { method: 'POST', body: JSON.stringify({ game: API_GAME[game], level }) }).catch(
      (e: unknown) => setError(e instanceof Error ? `บันทึกด่านไม่สำเร็จ: ${e.message}` : 'บันทึกด่านไม่สำเร็จ'),
    );
  }, []);

  return { clears, record, error, loading };
}
