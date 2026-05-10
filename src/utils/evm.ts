/**
 * Pure EVM (Earned Value Management) calculation functions.
 * No React, no side-effects — safe to unit-test in isolation.
 *
 * Unit convention: all monetary/effort values are in HOURS.
 */

import type {
  Topic,
  Subject,
  StudySession,
  ScheduleEntry,
  EVMMetrics,
  AppSettings,
} from '../types';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Topic-level EV ──────────────────────────────────────────────────────────

/**
 * Compute the Earned Value for a single topic.
 *
 * completionPercent is now auto-calculated from subtask completion ratio
 * (completedSubs / totalSubs × 100), so EV scales directly with it.
 *
 *   EV = BAC × (completionPercent / 100)
 *
 * A topic with status === 'completed' always returns its full BAC.
 */
export function computeTopicEV(topic: Topic): number {
  if (topic.status === 'completed') return topic.plannedHours;

  return topic.plannedHours * (topic.completionPercent / 100);
}

// ─── Subject-level aggregates ─────────────────────────────────────────────────

/** BAC = Σ topic.plannedHours */
export function computeBAC(subject: Subject): number {
  return subject.topics.reduce((s, t) => s + t.plannedHours, 0);
}

/** EV = Σ computeTopicEV(topic) */
export function computeEV(subject: Subject): number {
  return subject.topics.reduce((s, t) => s + computeTopicEV(t), 0);
}

/**
 * AC = Σ actualDurationMinutes for completed sessions of this subject.
 * Converted from minutes → hours.
 */
export function computeAC(subjectId: string, sessions: StudySession[]): number {
  return sessions
    .filter((s) => s.subjectId === subjectId && s.status === 'completed')
    .reduce((sum, s) => sum + s.actualDurationMinutes / 60, 0);
}

/**
 * PV = Σ allocatedHours for schedule entries of this subject where date ≤ todayStr.
 */
export function computePV(
  subjectId: string,
  schedule: ScheduleEntry[],
  todayStr: string,
): number {
  return schedule
    .filter((e) => e.subjectId === subjectId && e.date <= todayStr)
    .reduce((sum, e) => sum + e.allocatedHours, 0);
}

// ─── Forecast completion date ─────────────────────────────────────────────────

/**
 * Walk through future schedule entries in date order, accumulating
 * (allocatedHours / cpi) until the running total covers `etc`.
 * Returns the date of the entry that tips the balance, or null if the
 * schedule runs out before ETC is met (exam date risk).
 */
function forecastDate(
  subjectId: string,
  schedule: ScheduleEntry[],
  todayStr: string,
  etc: number,
  cpi: number,
): string | null {
  if (etc <= 0) return todayStr;

  const effectiveCPI = Math.max(cpi, 0.01); // guard against zero/negative
  const future = schedule
    .filter((e) => e.subjectId === subjectId && e.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulative = 0;
  for (const entry of future) {
    // Effective hours per CPI: if CPI < 1 each planned hour takes 1/CPI actual hours,
    // so we need more schedule days to accumulate `etc` actual hours.
    cumulative += entry.allocatedHours / effectiveCPI;
    if (cumulative >= etc) return entry.date;
  }

  return future.at(-1)?.date ?? null; // schedule exhausted — return last known date
}

// ─── Full subject metrics ─────────────────────────────────────────────────────

export function computeEVMMetrics(
  subject: Subject,
  sessions: StudySession[],
  schedule: ScheduleEntry[],
  settings: AppSettings,
  today: Date,
): EVMMetrics {
  const todayStr = toDateStr(today);

  const bac = computeBAC(subject);
  const pv  = computePV(subject.id, schedule, todayStr);
  const ev  = computeEV(subject);
  const ac  = computeAC(subject.id, sessions);

  const sv  = ev - pv;
  // Guard: if no PV yet (schedule hasn't started), treat SPI as 1 (neutral).
  const spi = pv === 0 ? 1 : ev / pv;

  const cv  = ev - ac;
  // Guard: if no AC yet, CPI = 1 (neutral — no data to penalise or reward).
  const cpi = ac === 0 ? 1 : ev / ac;

  // EAC = BAC / CPI  (if CPI → 0 use a large sentinel rather than Infinity
  // so JSON serialisation stays valid)
  const eac = cpi < 0.001 ? bac * 999 : bac / cpi;
  const etc = Math.max(0, eac - ac);
  const vac = bac - eac;

  const percentComplete = bac === 0 ? 0 : Math.min(100, (ev / bac) * 100);

  const completionDate =
    subject.status === 'completed'
      ? todayStr
      : forecastDate(subject.id, schedule, todayStr, etc, cpi);

  return {
    subjectId: subject.id,
    bac,
    pv,
    ev,
    ac,
    sv,
    spi,
    cv,
    cpi,
    eac,
    etc,
    vac,
    forecastCompletionDate: completionDate,
    percentComplete,
    isOnTrack:
      spi >= settings.spiWarningThreshold &&
      cpi >= settings.cpiWarningThreshold,
  };
}

// ─── Aggregate across all subjects ───────────────────────────────────────────

export type TotalEVMMetrics = EVMMetrics & { subjectId: 'ALL' };

export function computeTotalMetrics(
  metricsMap: Record<string, EVMMetrics>,
  settings: AppSettings,
): TotalEVMMetrics {
  const all = Object.values(metricsMap);

  if (all.length === 0) {
    return {
      subjectId: 'ALL',
      bac: 0, pv: 0, ev: 0, ac: 0,
      sv: 0, spi: 1,
      cv: 0, cpi: 1,
      eac: 0, etc: 0, vac: 0,
      percentComplete: 0,
      isOnTrack: true,
      forecastCompletionDate: null,
    };
  }

  const bac = all.reduce((s, m) => s + m.bac, 0);
  const pv  = all.reduce((s, m) => s + m.pv,  0);
  const ev  = all.reduce((s, m) => s + m.ev,  0);
  const ac  = all.reduce((s, m) => s + m.ac,  0);

  const sv  = ev - pv;
  const spi = pv  === 0 ? 1 : ev / pv;
  const cv  = ev - ac;
  const cpi = ac  === 0 ? 1 : ev / ac;
  const eac = cpi < 0.001 ? bac * 999 : bac / cpi;
  const etc = Math.max(0, eac - ac);
  const vac = bac - eac;
  const percentComplete = bac === 0 ? 0 : Math.min(100, (ev / bac) * 100);

  // Latest forecast date across subjects (worst-case)
  const dates = all
    .map((m) => m.forecastCompletionDate)
    .filter((d): d is string => d !== null)
    .sort();
  const forecastCompletionDate = dates.at(-1) ?? null;

  return {
    subjectId: 'ALL',
    bac, pv, ev, ac,
    sv, spi,
    cv, cpi,
    eac, etc, vac,
    percentComplete,
    isOnTrack:
      spi >= settings.spiWarningThreshold &&
      cpi >= settings.cpiWarningThreshold,
    forecastCompletionDate,
  };
}
