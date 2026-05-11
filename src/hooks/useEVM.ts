import { useMemo, useCallback } from 'react';
import { useStorageContext as useStorage } from '../context/StorageContext';
import type { EVMMetrics, ScheduleEntry, RescheduleMode } from '../types';
import {
  computeEVMMetrics,
  computeTotalMetrics,
  computeEV,
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
   * 期限厳守モード: Keep the original target date (examDate / provisionalEndDate) and
   * redistribute all remaining work evenly from today onwards.
   * Preserves past entries as an audit trail.
   */
  rescheduleDeadlineFirst: () => void;

  /**
   * ペース優先モード: Accept the current completion pace by setting each subject's
   * forecastCompletionDate as its new examDate, then regenerate the schedule and
   * reset SPI to 1.0 via a fresh EV baseline.
   */
  reschedulePaceFirst: () => void;

  /**
   * @deprecated Use rescheduleDeadlineFirst() instead.
   * Kept for backwards compatibility with callers that haven't been updated.
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
  /** スナップショット: 全 subject の現時点 EV を Record で返す */
  const snapshotBaselineEVs = useCallback((): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const s of data.subjects) map[s.id] = computeEV(s);
    return map;
  }, [data.subjects]);

  const regenerateSchedule = useCallback(() => {
    const newSchedule = generateSchedule(
      data.subjects,
      data.settings.weeklyWorkPattern,
      today,
    );
    updateData({
      schedule: newSchedule,
      settings: {
        ...data.settings,
        rescheduleBaselineEVs: snapshotBaselineEVs(),
      },
    });
  }, [data.subjects, data.settings, today, updateData, snapshotBaselineEVs]);

  // ── 期限厳守モード ────────────────────────────────────────────────────────
  // Keep the original examDate / provisionalEndDate untouched.
  // Redistribute all remaining work from today using the existing weekly pattern.
  const rescheduleDeadlineFirst = useCallback(() => {
    const newSchedule = reschedule(
      data.schedule,
      data.subjects,
      data.settings.weeklyWorkPattern,
      today,
    );
    const todayStr = today.toISOString().slice(0, 10);
    updateData({
      schedule: newSchedule,
      settings: {
        ...data.settings,
        lastRescheduledAt: todayStr,
        lastRescheduleMode: 'deadline_first' as RescheduleMode,
        rescheduleBaselineEVs: snapshotBaselineEVs(),
      },
    });
  }, [data.schedule, data.subjects, data.settings, today, updateData, snapshotBaselineEVs]);

  // ── ペース優先モード ──────────────────────────────────────────────────────
  // Accept the current pace: set each subject's forecastCompletionDate as its new
  // examDate, regenerate the schedule from today, and reset SPI to 1.0 via a
  // fresh EV baseline snapshot.
  const reschedulePaceFirst = useCallback(() => {
    const todayStr = today.toISOString().slice(0, 10);

    // Update each active subject's examDate to its current forecast completion date.
    const updatedSubjects = data.subjects.map((subject) => {
      if (subject.status === 'completed') return subject;
      const forecast = metricsMap[subject.id]?.forecastCompletionDate;
      if (!forecast) return subject;
      return { ...subject, examDate: forecast, updatedAt: new Date().toISOString() };
    });

    // Fresh schedule respecting the new examDates.
    const newSchedule = generateSchedule(
      updatedSubjects,
      data.settings.weeklyWorkPattern,
      today,
    );

    // Snapshot current EV as baseline → delta SPI starts at 0 / 0 → guarded to 1.0.
    updateData({
      subjects: updatedSubjects,
      schedule: newSchedule,
      settings: {
        ...data.settings,
        lastRescheduledAt: todayStr,
        lastRescheduleMode: 'pace_first' as RescheduleMode,
        rescheduleBaselineEVs: snapshotBaselineEVs(),
      },
    });
  }, [data.subjects, data.settings, metricsMap, today, updateData, snapshotBaselineEVs]);

  // ── 後方互換エイリアス ───────────────────────────────────────────────────
  const rescheduleFromToday = rescheduleDeadlineFirst;

  const autoRescheduleIfNeeded = useCallback((): boolean => {
    if (!hasScheduleRisk) return false;
    const newSchedule = reschedule(
      data.schedule,
      data.subjects,
      data.settings.weeklyWorkPattern,
      today,
    );
    const todayStr = today.toISOString().slice(0, 10);
    updateData({
      schedule: newSchedule,
      settings: {
        ...data.settings,
        lastRescheduledAt: todayStr,
        lastRescheduleMode: 'deadline_first' as RescheduleMode,
        rescheduleBaselineEVs: snapshotBaselineEVs(),
      },
    });
    return true;
  }, [
    hasScheduleRisk,
    data.schedule,
    data.subjects,
    data.settings,
    today,
    updateData,
    snapshotBaselineEVs,
  ]);

  return {
    metricsMap,
    totalMetrics,
    schedule: data.schedule,
    examRisks,
    hasScheduleRisk,
    hasTimeRisk,
    regenerateSchedule,
    rescheduleDeadlineFirst,
    reschedulePaceFirst,
    rescheduleFromToday,
    autoRescheduleIfNeeded,
  };
}
