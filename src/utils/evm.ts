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

// ─── Provisional end-date estimation (no examDate) ───────────────────────────

/**
 * For a subject without an examDate, estimate a provisional completion date
 * by dividing the total planned hours (BAC) by the weekly study target.
 *
 * Priority for weekly hours:
 *   1. subject.targetHoursPerWeek  (per-subject override when > 0)
 *   2. fallbackWeeklyHours         (AppSettings.defaultWeeklyHoursGoal)
 *
 * Returns null when the subject already has an examDate, BAC is zero,
 * or no weekly hours can be determined.
 */
export function estimateProvisionalEndDate(
  subject: Subject,
  fallbackWeeklyHours: number,
): string | null {
  if (subject.examDate) return null;

  const bac = subject.topics.reduce((s, t) => s + t.plannedHours, 0);
  if (bac <= 0) return null;

  const weeklyHours =
    subject.targetHoursPerWeek > 0
      ? subject.targetHoursPerWeek
      : fallbackWeeklyHours;

  if (weeklyHours <= 0) return null;

  const daysNeeded = Math.ceil((bac / weeklyHours) * 7);
  const start = new Date(subject.plannedStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + daysNeeded);

  return end.toISOString().slice(0, 10);
}

/**
 * Compute PV using a straight-line baseline between startDate and endDate.
 * PV grows linearly from 0 at startDate to BAC at endDate.
 */
function computeLinearPV(
  bac: number,
  startDate: string,
  endDate: string,
  today: string,
): number {
  if (today <= startDate) return 0;
  if (today >= endDate) return bac;

  const startMs = new Date(startDate).getTime();
  const endMs   = new Date(endDate).getTime();
  const nowMs   = new Date(today).getTime();

  return bac * ((nowMs - startMs) / (endMs - startMs));
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

  // For subjects without a fixed examDate, use a linear PV baseline derived from
  // targetHoursPerWeek so that PV grows at a steady rate toward the provisional end.
  const provisionalEndDate = estimateProvisionalEndDate(subject, settings.defaultWeeklyHoursGoal);
  const pv = !subject.examDate && provisionalEndDate
    ? computeLinearPV(bac, subject.plannedStartDate, provisionalEndDate, todayStr)
    : computePV(subject.id, schedule, todayStr);

  const ev  = computeEV(subject);
  const ac  = computeAC(subject.id, sessions);

  // ── SPI / SV: use delta from reschedule baseline when available ──────────
  // After rescheduling, PV resets to "today onwards" while EV carries
  // all historical completed work. Comparing them directly inflates SPI.
  // Instead, measure only the progress *since* the last reschedule.
  let spi: number;
  let sv: number;

  const baselineDate = settings.lastRescheduledAt;
  const baselineEV   = settings.rescheduleBaselineEVs?.[subject.id] ?? undefined;

  let effectiveEV: number;
  let effectivePV: number;
  let isDeltaMode = false;

  if (baselineDate && baselineDate !== todayStr && baselineEV !== undefined) {
    // Delta PV: schedule entries from baseline date to today
    effectivePV = schedule
      .filter((e) => e.subjectId === subject.id && e.date >= baselineDate && e.date <= todayStr)
      .reduce((sum, e) => sum + e.allocatedHours, 0);
    effectiveEV = Math.max(0, ev - baselineEV);
    isDeltaMode = true;
    spi = effectivePV === 0 ? 1 : effectiveEV / effectivePV;
    sv  = effectiveEV - effectivePV;
  } else if (baselineDate === todayStr) {
    // Just rescheduled today — too early to evaluate; show neutral
    effectiveEV = 0;
    effectivePV = 0;
    isDeltaMode = true;
    spi = 1;
    sv  = 0;
  } else {
    // No baseline: fall back to absolute EV/PV (first schedule, no reschedule yet)
    effectiveEV = ev;
    effectivePV = pv;
    spi = pv === 0 ? 1 : ev / pv;
    sv  = ev - pv;
  }

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
    effectiveEV,
    effectivePV,
    isDeltaMode,
    provisionalEndDate: subject.examDate ? null : (provisionalEndDate ?? null),
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
      effectiveEV: 0,
      effectivePV: 0,
      isDeltaMode: false,
      provisionalEndDate: null,
    };
  }

  const bac = all.reduce((s, m) => s + m.bac, 0);
  const pv  = all.reduce((s, m) => s + m.pv,  0);
  const ev  = all.reduce((s, m) => s + m.ev,  0);
  const ac  = all.reduce((s, m) => s + m.ac,  0);

  // Aggregate effectiveEV/PV (delta values when in delta mode)
  const effectiveEV = all.reduce((s, m) => s + m.effectiveEV, 0);
  const effectivePV = all.reduce((s, m) => s + m.effectivePV, 0);
  const isDeltaMode = all.some((m) => m.isDeltaMode);

  // Aggregate SPI/SV from effective values for consistency with per-subject logic
  const spi = effectivePV === 0 ? 1 : effectiveEV / effectivePV;
  const sv  = effectiveEV - effectivePV;
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
    effectiveEV,
    effectivePV,
    isDeltaMode,
    provisionalEndDate: null,
  };
}
