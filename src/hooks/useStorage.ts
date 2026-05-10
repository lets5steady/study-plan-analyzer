import { useState, useEffect, useCallback, useRef } from 'react';
import { type AppData, INITIAL_APP_DATA } from '../types';

const STORAGE_KEY = 'study_plan_analyzer_v1';

// ─── Migration (extend as schema versions grow) ──────────────────────────────

function migrate(raw: unknown): AppData {
  if (typeof raw !== 'object' || raw === null) return structuredClone(INITIAL_APP_DATA);

  const data = raw as Partial<AppData>;

  // Future: switch (data.version) { case '0.9': ... }
  return {
    ...INITIAL_APP_DATA,
    ...data,
    version: '1.0.0',
    settings: {
      ...INITIAL_APP_DATA.settings,
      ...(data.settings ?? {}),
      // Ensure weeklyWorkPattern is always fully populated
      weeklyWorkPattern: {
        ...INITIAL_APP_DATA.settings.weeklyWorkPattern,
        ...(data.settings?.weeklyWorkPattern ?? {}),
      },
      lastRescheduledAt: data.settings?.lastRescheduledAt ?? null,
    },
    subjects: (data.subjects ?? []).map((s) => ({
      ...s,
      topics: (s.topics ?? []).map((t) => ({
        ...t,
        subtasks: t.subtasks ?? [],  // backfill for pre-subtask data
      })),
    })),
    sessions: data.sessions ?? [],
    schedule: data.schedule ?? [],
  };
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(INITIAL_APP_DATA);
    return migrate(JSON.parse(raw));
  } catch {
    console.warn('[useStorage] Failed to parse stored data — using defaults.');
    return structuredClone(INITIAL_APP_DATA);
  }
}

function save(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[useStorage] Failed to persist data:', e);
  }
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseStorageReturn {
  data: AppData;
  /** Replace the entire dataset (e.g. after import). */
  setData: (next: AppData) => void;
  /** Partial-update helper — merges top-level keys. */
  updateData: (patch: Partial<Omit<AppData, 'version'>>) => void;
  /** Export current data as a downloadable JSON file. */
  exportJSON: () => void;
  /** Import data from a JSON file selected by the user. */
  importJSON: (file: File) => Promise<{ ok: boolean; error?: string }>;
  /** Wipe all data and restore factory defaults. */
  resetData: () => void;
  /** True while an async import operation is in progress. */
  importing: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStorage(): UseStorageReturn {
  const [data, setDataState] = useState<AppData>(load);
  const [importing, setImporting] = useState(false);

  // Persist every state change to LocalStorage
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    save(data);
  }, [data]);

  // ── setData ──────────────────────────────────────────────────────────────
  const setData = useCallback((next: AppData) => {
    setDataState(next);
  }, []);

  // ── updateData ────────────────────────────────────────────────────────────
  const updateData = useCallback(
    (patch: Partial<Omit<AppData, 'version'>>) => {
      setDataState((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // ── exportJSON ────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const payload: AppData = {
      ...data,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study_plan_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // ── importJSON ────────────────────────────────────────────────────────────
  const importJSON = useCallback(
    (file: File): Promise<{ ok: boolean; error?: string }> => {
      setImporting(true);
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target?.result as string);
            const migrated = migrate(parsed);
            setDataState(migrated);
            resolve({ ok: true });
          } catch {
            resolve({ ok: false, error: 'JSONの解析に失敗しました。ファイル形式を確認してください。' });
          } finally {
            setImporting(false);
          }
        };

        reader.onerror = () => {
          setImporting(false);
          resolve({ ok: false, error: 'ファイルの読み込みに失敗しました。' });
        };

        reader.readAsText(file, 'utf-8');
      });
    },
    [],
  );

  // ── resetData ─────────────────────────────────────────────────────────────
  const resetData = useCallback(() => {
    const fresh = structuredClone(INITIAL_APP_DATA);
    setDataState(fresh);
  }, []);

  return { data, setData, updateData, exportJSON, importJSON, resetData, importing };
}
