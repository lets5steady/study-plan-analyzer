// ─── Primitive enums ────────────────────────────────────────────────────────

export type SubjectStatus = 'not_started' | 'in_progress' | 'completed' | 'paused';
export type SessionStatus = 'planned' | 'completed' | 'skipped';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Per-weekday available study hours.
 * Used by the auto-scheduler to distribute topic load across days.
 */
export type WeeklyWorkPattern = Record<DayOfWeek, number>;

// ─── Subtask ──────────────────────────────────────────────────────────────────

/**
 * A granular sub-task within a Topic.
 * Completing all subtasks contributes 30% of the topic's BAC to EV.
 * Completing the main topic (completionPercent = 100) contributes the other 70%.
 */
export interface Subtask {
  id: string;
  name: string;
  completed: boolean;
  order: number;
  /** 'main' = primary learning item, 'sub' = practice / supplementary. Defaults to 'main'. */
  type?: 'main' | 'sub';
}

// ─── Core domain types ───────────────────────────────────────────────────────

/**
 * A single topic/chapter within a subject.
 * plannedHours is the Budget at Completion (BAC) for this unit.
 *
 * EV split when subtasks are present:
 *   EV = 0.7 × BAC × (completionPercent / 100)   ← main-task progress
 *      + 0.3 × BAC × (completedSubtasks / totalSubtasks)  ← sub-task progress
 * When subtasks are absent, EV = BAC × (completionPercent / 100).
 */
export interface Topic {
  id: string;
  name: string;
  plannedHours: number;       // BAC (Budget at Completion) for this topic
  earnedHours: number;        // cached EV — authoritative value is computed by useEVM
  actualHours: number;        // AC (Actual Cost) — real time spent
  completionPercent: number;  // 0–100, main-task progress
  subtasks: Subtask[];        // optional granular sub-tasks (empty = unused)
  status: SubjectStatus;
  notes: string;
  order: number;
}

/**
 * A subject (e.g. "Calculus", "AWS Solutions Architect").
 * Aggregates Topics and holds the exam / deadline context.
 */
export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;              // hex color for UI differentiation
  examDate: string | null;    // ISO 8601 date string
  plannedStartDate: string;   // ISO 8601 date string
  topics: Topic[];
  status: SubjectStatus;
  targetHoursPerWeek: number;
  createdAt: string;          // ISO 8601 datetime
  updatedAt: string;          // ISO 8601 datetime
}

// ─── Study session ────────────────────────────────────────────────────────────

/**
 * A discrete study session (one sitting).
 * Links to one Subject and optionally to one Topic.
 */
export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string | null;
  date: string;               // ISO 8601 date string (YYYY-MM-DD)
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  status: SessionStatus;
  difficulty: Difficulty;
  memo: string;
  createdAt: string;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * One day-slot in the auto-generated study schedule.
 * The scheduler fills these slots using WeeklyWorkPattern.
 * PV at a given date = Σ allocatedHours for entries where date ≤ today.
 */
export interface ScheduleEntry {
  id: string;
  date: string;           // YYYY-MM-DD
  subjectId: string;
  topicId: string;
  allocatedHours: number;
}

// ─── EVM computed metrics (derived — never stored) ───────────────────────────

/**
 * EVM metrics for a single Subject, computed on-the-fly from its data.
 *
 * PV  = Planned Value   — Σ allocatedHours for schedule entries up to today
 * EV  = Earned Value    — 70% main-task + 30% sub-task completion × BAC
 * AC  = Actual Cost     — Σ actualDurationMinutes (from sessions) converted to hours
 * BAC = Budget at Completion — Σ topic.plannedHours
 *
 * SPI = EV / PV   (≥1 = ahead of schedule, <1 = behind)
 * CPI = EV / AC   (≥1 = efficient,         <1 = over time budget)
 * EAC = BAC / CPI
 * ETC = EAC − AC
 * VAC = BAC − EAC  (negative = projected overrun)
 */
export interface EVMMetrics {
  subjectId: string;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;             // Schedule Variance = EV − PV
  spi: number;            // Schedule Performance Index
  cv: number;             // Cost Variance = EV − AC
  cpi: number;            // Cost Performance Index
  eac: number;            // Estimate at Completion
  etc: number;            // Estimate to Complete
  vac: number;            // Variance at Completion
  forecastCompletionDate: string | null;
  percentComplete: number;
  isOnTrack: boolean;
}

// ─── App settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  defaultWeeklyHoursGoal: number;
  workDaysPerWeek: number;         // 1–7
  reminderEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  spiWarningThreshold: number;     // default 0.9
  cpiWarningThreshold: number;     // default 0.9
  weeklyWorkPattern: WeeklyWorkPattern;  // hours available each weekday
  /** ISO date (YYYY-MM-DD) of the most recent manual reschedule. Used to suppress the
   *  schedule-risk alert on the same day the user pressed "スケジュールを組み直す". */
  lastRescheduledAt: string | null;
}

// ─── Root storage schema ─────────────────────────────────────────────────────

export interface AppData {
  version: '1.0.0';
  settings: AppSettings;
  subjects: Subject[];
  sessions: StudySession[];
  schedule: ScheduleEntry[];
  exportedAt?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_WEEKLY_WORK_PATTERN: WeeklyWorkPattern = {
  0: 3,   // Sun
  1: 2,   // Mon
  2: 2,   // Tue
  3: 2,   // Wed
  4: 2,   // Thu
  5: 2,   // Fri
  6: 3,   // Sat
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultWeeklyHoursGoal: 10,
  workDaysPerWeek: 5,
  reminderEnabled: false,
  theme: 'system',
  language: 'ja',
  spiWarningThreshold: 0.9,
  cpiWarningThreshold: 0.9,
  weeklyWorkPattern: DEFAULT_WEEKLY_WORK_PATTERN,
  lastRescheduledAt: null,
};

export const INITIAL_APP_DATA: AppData = {
  version: '1.0.0',
  settings: DEFAULT_SETTINGS,
  subjects: [],
  sessions: [],
  schedule: [],
};
