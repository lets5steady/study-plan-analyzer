import type { ScheduleEntry, StudySession } from '../types';

export interface BurnupPoint {
  date: string;
  pv: number;   // cumulative planned value (hours)
  ac: number;   // cumulative actual cost (hours)
}

export interface EfficiencyPoint {
  date: string;
  actual: number;   // actual study hours that day
  planned: number;  // planned study hours that day (from schedule)
}

// ─── Burnup chart ─────────────────────────────────────────────────────────────

export function buildBurnupData(
  schedule: ScheduleEntry[],
  sessions: StudySession[],
): BurnupPoint[] {
  if (schedule.length === 0 && sessions.length === 0) return [];

  // Build maps keyed by YYYY-MM-DD
  const pvByDate = new Map<string, number>();
  for (const e of schedule) {
    pvByDate.set(e.date, (pvByDate.get(e.date) ?? 0) + e.allocatedHours);
  }

  const acByDate = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    acByDate.set(s.date, (acByDate.get(s.date) ?? 0) + s.actualDurationMinutes / 60);
  }

  // Determine full date range
  const allDates = new Set([...pvByDate.keys(), ...acByDate.keys()]);
  if (allDates.size === 0) return [];

  const sorted = [...allDates].sort();
  const start = sorted[0];
  const today = new Date().toISOString().slice(0, 10);
  const end = sorted.at(-1)! > today ? sorted.at(-1)! : today;

  // Walk day by day and accumulate
  const result: BurnupPoint[] = [];
  let cumPV = 0;
  let cumAC = 0;

  const cur = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  while (cur <= endDate) {
    const d = cur.toISOString().slice(0, 10);
    cumPV += pvByDate.get(d) ?? 0;
    cumAC += acByDate.get(d) ?? 0;
    result.push({ date: d, pv: Math.round(cumPV * 10) / 10, ac: Math.round(cumAC * 10) / 10 });
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

// ─── Daily efficiency chart ───────────────────────────────────────────────────

export function buildEfficiencyData(
  schedule: ScheduleEntry[],
  sessions: StudySession[],
): EfficiencyPoint[] {
  const plannedByDate = new Map<string, number>();
  for (const e of schedule) {
    plannedByDate.set(e.date, (plannedByDate.get(e.date) ?? 0) + e.allocatedHours);
  }

  const actualByDate = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    actualByDate.set(s.date, (actualByDate.get(s.date) ?? 0) + s.actualDurationMinutes / 60);
  }

  const allDates = new Set([...plannedByDate.keys(), ...actualByDate.keys()]);
  if (allDates.size === 0) return [];

  return [...allDates]
    .sort()
    .map((date) => ({
      date,
      actual: Math.round((actualByDate.get(date) ?? 0) * 10) / 10,
      planned: Math.round((plannedByDate.get(date) ?? 0) * 10) / 10,
    }));
}
