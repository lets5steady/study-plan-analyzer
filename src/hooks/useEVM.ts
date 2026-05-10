import { useMemo, useCallback } from 'react';
import { useStorageContext as useStorage } from '../context/StorageContext';
import type { EVMMetrics, ScheduleEntry } from '../types';
import {
  computeEVMMetrics,
  computeTotalMetrics,
  type TotalEVMMetrics,
} from '../utils/evm';
import {
  generateSchedule,
  reschedule,
  detectExamRisks,
  type ExamRisk,
} from '../utils/scheduler';

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseEVMReturn {
  /** EVM metrics per subject, keyed by subjectId */
  metricsMap: Record<string, EVMMetrics>;

  /** Aggregated EVM across all subjects (subjectId = 'ALL') */
  totalMetrics: TotalEVMMetrics;

  /** Current stored schedule */
  schedule: ScheduleEntry[];

  /**
   * Subjects whose forecast completion date exceeds their exam date.
   * Populated only when the schedule exists and metrics are computed.
   */
  examRisks: ExamRisk[];

  /** True when any subject SPI < spiWarningThreshold */
  hasScheduleRisk: boolean;

  /** True when any subject CPI < cpiWarningThreshold */
  hasTimeRisk: boolean;

  /**
   * Regenerate the schedule from scratch starting today.
   * Call after adding/editing subjects or topics.
   */
  regenerateSchedule: () => void;

  /**
   * Reschedule incomplete work from today onwards (triggered when SPI < 1).
   * Preserves past entries as an audit trail.
   */
  rescheduleFromToday: () => void;

  /**
   * Auto-reschedule if any subject's SPI is below the warning threshold.
   * Returns true when a reschedule was actually performed.
   */
  autoRescheduleIfNeeded: () => boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEVM(): UseEVMReturn {
  const { data, updateData } = useStorage();

  // Stable "today" within a render pass — re-evaluated each render so the
  // hook stays accurate across day boundaries without a timer.
  const today = useMemo(() => new Date(), []);

  // ── Per-subject metrics ──────────────────────────────────────────────────
  const metricsMap = useMemo<Record<string, EVMMetrics>>(() => {
    const map: Record<string, EVMMetrics> = {};
    for (const subject of data.subjects) {
      map[subject.id] = computeEVMMetrics(
        subject,
        data.sessions,
        data.schedule,
        data.settings,
        today,
      );
    }
    return map;
  }, [data.subjects, data.sessions, data.schedule, data.settings, today]);

  // ── Aggregate totals ─────────────────────────────────────────────────────
  const totalMetrics = useMemo(
    () => computeTotalMetrics(metricsMap, data.settings),
    [metricsMap, data.settings],
  );

  // ── Exam-date risk detection ─────────────────────────────────────────────
  const examRisks = useMemo(() => {
    const forecastMap: Record<string, string | null> = {};
    for (const [id, m] of Object.entries(metricsMap)) {
      forecastMap[id] = m.forecastCompletionDate;
    }
    return detectExamRisks(data.subjects, forecastMap);
  }, [data.subjects, metricsMap]);

  // ── Risk flags ───────────────────────────────────────────────────────────
  const { spiWarningThreshold, cpiWarningThreshold } = data.settings;

  const hasScheduleRisk = useMemo(
    () => Object.values(metricsMap).some((m) => m.spi < spiWarningThreshold),
    [metricsMap, spiWarningThreshold],
  );

  const hasTimeRisk = useMemo(
    () => Object.values(metricsMap).some((m) => m.cpi < cpiWarningThreshold),
    [metricsMap, cpiWarningThreshold],
  );

  // ── Schedule actions ─────────────────────────────────────────────────────
  const regenerateSchedule = useCallback(() => {
    const newSchedule = generateSchedule(
      data.subjects,
      data.settings.weeklyWorkPattern,
      today,
    );
    updateData({ schedule: newSchedule });
  }, [data.subjects, data.settings.weeklyWorkPattern, today, updateData]);

  const rescheduleFromToday = useCallback(() => {
    const newSchedule = reschedule(
      data.schedule,
      data.subjects,
      data.settings.weeklyWorkPattern,
      today,
    );
    const todayStr = today.toISOString().slice(0, 10);
    updateData({
      schedule: newSchedule,
      settings: { ...data.settings, lastRescheduledAt: todayStr },
    });
  }, [
    data.schedule,
    data.subjects,
    data.settings.weeklyWorkPattern,
    today,
    updateData,
  ]);

  const autoRescheduleIfNeeded = useCallback((): boolean => {
    if (!hasScheduleRisk) return false;
    const newSchedule = reschedule(
      data.schedule,
      data.subjects,
      data.settings.weeklyWorkPattern,
      today,
    );
    updateData({ schedule: newSchedule });
    return true;
  }, [
    hasScheduleRisk,
    data.schedule,
    data.subjects,
    data.settings.weeklyWorkPattern,
    today,
    updateData,
  ]);

  return {
    metricsMap,
    totalMetrics,
    schedule: data.schedule,
    examRisks,
    hasScheduleRisk,
    hasTimeRisk,
    regenerateSchedule,
    rescheduleFromToday,
    autoRescheduleIfNeeded,
  };
}
