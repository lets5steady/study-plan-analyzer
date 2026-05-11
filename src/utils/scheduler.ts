/**
 * Auto-scheduler: distributes remaining topic hours across calendar days
 * according to the user's WeeklyWorkPattern.
 *
 * Scheduling priority order:
 *   1. Subject examDate (earliest first; null = lowest priority)
 *   2. Subject plannedStartDate (don't schedule before it)
 *   3. Topic order (ascending)
 */

import type {
  Subject,
  ScheduleEntry,
  WeeklyWorkPattern,
  DayOfWeek,
} from '../types';
import { computeTopicEV } from './evm';

// ─── Date utilities ───────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dayOfWeek(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek;
}

function hoursForDate(date: Date, pattern: WeeklyWorkPattern): number {
  return pattern[dayOfWeek(date)] ?? 0;
}

// ─── Work-item queue ──────────────────────────────────────────────────────────

interface WorkItem {
  subjectId: string;
  topicId: string;
  remainingHours: number;
  /** Lower value = higher scheduling priority */
  priority: number;
  /** Don't schedule before this date (ISO string) */
  notBefore: string;
}

/** Build a priority-sorted list of remaining work from all subjects. */
export function buildWorkQueue(subjects: Subject[], today: Date): WorkItem[] {
  const todayStr = toDateStr(today);

  // Sort subjects: exam date ascending (null last), then plannedStartDate
  const sorted = [...subjects]
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => {
      if (a.examDate && b.examDate) return a.examDate.localeCompare(b.examDate);
      if (a.examDate) return -1;
      if (b.examDate) return 1;
      return a.plannedStartDate.localeCompare(b.plannedStartDate);
    });

  const items: WorkItem[] = [];

  sorted.forEach((subject, si) => {
    // Respect plannedStartDate — don't schedule earlier than it or today
    const notBefore =
      subject.plannedStartDate > todayStr ? subject.plannedStartDate : todayStr;

    subject.topics
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => a.order - b.order)
      .forEach((topic, ti) => {
        const earned = computeTopicEV(topic);
        const remaining = Math.max(0, topic.plannedHours - earned);
        if (remaining < 0.001) return; // effectively done

        items.push({
          subjectId: subject.id,
          topicId: topic.id,
          remainingHours: remaining,
          priority: si * 10_000 + ti,
          notBefore,
        });
      });
  });

  // Sort by priority (already insertion-ordered, but be explicit)
  return items.sort((a, b) => a.priority - b.priority);
}

// ─── Core schedule generator ──────────────────────────────────────────────────

const MAX_SCHEDULE_DAYS = 730; // ~2 years safety cap

/**
 * Generate a fresh day-by-day schedule for all incomplete work.
 *
 * Algorithm:
 *   For each calendar day (starting from `startDate`, up to MAX_SCHEDULE_DAYS):
 *     1. Skip if no hours available that weekday.
 *     2. Fill available hours from the front of the work queue.
 *        A single topic can span multiple days (partial allocation per day).
 *     3. Advance to next work item when it's exhausted.
 */
export function generateSchedule(
  subjects: Subject[],
  pattern: WeeklyWorkPattern,
  startDate: Date,
): ScheduleEntry[] {
  const queue = buildWorkQueue(subjects, startDate);
  if (queue.length === 0) return [];

  const entries: ScheduleEntry[] = [];
  let cursor = new Date(startDate);
  let qIdx = 0;

  for (let day = 0; day < MAX_SCHEDULE_DAYS && qIdx < queue.length; day++) {
    const dateStr = toDateStr(cursor);
    const available = hoursForDate(cursor, pattern);

    if (available > 0) {
      let budgetLeft = available;

      while (budgetLeft > 0.001 && qIdx < queue.length) {
        const item = queue[qIdx];

        // Skip items not yet schedulable on this day
        if (item.notBefore > dateStr) {
          qIdx++;
          continue;
        }

        const alloc = Math.min(budgetLeft, item.remainingHours);

        entries.push({
          id: `${item.subjectId}__${item.topicId}__${dateStr}__${entries.length}`,
          date: dateStr,
          subjectId: item.subjectId,
          topicId: item.topicId,
          allocatedHours: Math.round(alloc * 1000) / 1000, // round to 3dp
        });

        item.remainingHours -= alloc;
        budgetLeft -= alloc;

        if (item.remainingHours < 0.001) qIdx++;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return entries;
}

// ─── Reschedule ───────────────────────────────────────────────────────────────

/**
 * Reschedule triggered when SPI < threshold.
 *
 * Strategy:
 *   - Keep all past entries (date < today) unchanged to preserve history.
 *   - Discard today's and future entries.
 *   - Re-generate the schedule from today for all remaining work.
 *
 * This means any work that *should* have been done by today but wasn't
 * will be pushed forward — the new schedule reflects realistic capacity.
 */
export function reschedule(
  existingSchedule: ScheduleEntry[],
  subjects: Subject[],
  pattern: WeeklyWorkPattern,
  today: Date,
): ScheduleEntry[] {
  const todayStr = toDateStr(today);

  // History: entries strictly before today (audit trail)
  const history = existingSchedule.filter((e) => e.date < todayStr);

  // Fresh schedule from today onwards
  const future = generateSchedule(subjects, pattern, today);

  return [...history, ...future];
}

// ─── Exam-date risk check ─────────────────────────────────────────────────────

export interface ExamRisk {
  subjectId: string;
  subjectName: string;
  examDate: string;
  forecastCompletionDate: string;
  daysAtRisk: number; // positive = will finish AFTER exam
}

// ─── Today's task plan ───────────────────────────────────────────────────────

/**
 * A single topic to study today, with its allocated hours for the day.
 */
export interface TodayTask {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  /** Hours allocated for this topic today (≤ today's budget). */
  allocatedHours: number;
  /** Total remaining hours for this topic across all future days. */
  remainingHours: number;
}

/**
 * The set of topics to work on today, constrained to today's time budget.
 */
export interface TodayTaskPlan {
  date: string;
  /** Hours available today per WeeklyWorkPattern. */
  budgetHours: number;
  /** Topics to study today, in priority order. */
  tasks: TodayTask[];
  /** Number of distinct topics. */
  taskCount: number;
  /** Sum of allocatedHours across all tasks (≤ budgetHours). */
  totalAllocatedHours: number;
}

/**
 * Compute which topics to study today and how many hours to spend on each.
 *
 * Strategy:
 *   1. Derive today's time budget from WeeklyWorkPattern.
 *   2. If the schedule already has entries for today (pre-computed),
 *      use them directly — they already respect the budget.
 *   3. Otherwise, fall back to the priority-sorted work queue and
 *      greedily fill today's budget from front to back.
 *
 * Topics whose notBefore date is in the future are skipped.
 * A topic that only partially fits is included with a pro-rated allocatedHours.
 */
export function computeTodayTaskPlan(
  subjects: Subject[],
  schedule: ScheduleEntry[],
  pattern: WeeklyWorkPattern,
  today: Date,
): TodayTaskPlan {
  const todayStr = toDateStr(today);
  const budgetHours = hoursForDate(today, pattern);

  // Fast lookup: topicId → { topic, subject }
  const topicLookup = new Map(
    subjects.flatMap((s) =>
      s.topics.map((t) => [t.id, { topic: t, subject: s }] as const),
    ),
  );

  let tasks: TodayTask[];

  const todayEntries = schedule.filter((e) => e.date === todayStr);

  if (todayEntries.length > 0) {
    // Schedule already covers today — merge by topicId in case of split entries.
    const merged = new Map<string, TodayTask>();

    for (const entry of todayEntries) {
      const lookup = topicLookup.get(entry.topicId);
      if (!lookup) continue;
      const { topic, subject } = lookup;

      const existing = merged.get(entry.topicId);
      if (existing) {
        existing.allocatedHours =
          Math.round((existing.allocatedHours + entry.allocatedHours) * 1000) / 1000;
      } else {
        const remaining = Math.max(0, topic.plannedHours - computeTopicEV(topic));
        merged.set(entry.topicId, {
          subjectId: subject.id,
          subjectName: subject.name,
          topicId: topic.id,
          topicName: topic.name,
          allocatedHours: entry.allocatedHours,
          remainingHours: Math.round(remaining * 1000) / 1000,
        });
      }
    }

    tasks = Array.from(merged.values());
  } else {
    // No schedule for today — derive from the priority-sorted work queue.
    const queue = buildWorkQueue(subjects, today);
    tasks = [];
    let budgetLeft = budgetHours;

    for (const item of queue) {
      if (budgetLeft <= 0.001) break;
      if (item.notBefore > todayStr) continue;

      const lookup = topicLookup.get(item.topicId);
      if (!lookup) continue;
      const { topic, subject } = lookup;

      const alloc = Math.round(Math.min(budgetLeft, item.remainingHours) * 1000) / 1000;
      tasks.push({
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
        allocatedHours: alloc,
        remainingHours: Math.round(item.remainingHours * 1000) / 1000,
      });
      budgetLeft -= alloc;
    }
  }

  const totalAllocatedHours =
    Math.round(tasks.reduce((s, t) => s + t.allocatedHours, 0) * 1000) / 1000;

  return {
    date: todayStr,
    budgetHours,
    tasks,
    taskCount: tasks.length,
    totalAllocatedHours,
  };
}

/**
 * Returns subjects where the forecast completion date exceeds their exam date.
 */
export function detectExamRisks(
  subjects: Subject[],
  forecastMap: Record<string, string | null>,
): ExamRisk[] {
  const risks: ExamRisk[] = [];

  for (const subject of subjects) {
    if (!subject.examDate) continue;
    const forecast = forecastMap[subject.id];
    if (!forecast) continue;
    if (forecast > subject.examDate) {
      const examMs = new Date(subject.examDate).getTime();
      const forecastMs = new Date(forecast).getTime();
      risks.push({
        subjectId: subject.id,
        subjectName: subject.name,
        examDate: subject.examDate,
        forecastCompletionDate: forecast,
        daysAtRisk: Math.ceil((forecastMs - examMs) / 86_400_000),
      });
    }
  }

  return risks;
}
