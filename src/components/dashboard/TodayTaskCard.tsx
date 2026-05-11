import { useMemo } from 'react';
import { useStorageContext } from '../../context/StorageContext';
import { computeTodayTaskBudget } from '../../utils/scheduler';
import { cn } from '../../utils/cn';

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
    </svg>
  );
}

function RescheduleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TodayTaskCardProps {
  onReschedule?: () => void;
}

export function TodayTaskCard({ onReschedule }: TodayTaskCardProps) {
  const { data } = useStorageContext();

  const today = useMemo(() => new Date(), []);

  const budget = useMemo(
    () => computeTodayTaskBudget(data.subjects, data.settings.weeklyWorkPattern, today),
    [data.subjects, data.settings.weeklyWorkPattern, today],
  );

  if (data.subjects.length === 0) return null;

  const subjectColorMap = new Map(data.subjects.map((s) => [s.id, s.color]));

  const usedPct =
    budget.budgetHours > 0
      ? Math.min(100, (budget.totalAllocatedHours / budget.budgetHours) * 100)
      : 0;

  const isRestDay = budget.budgetHours === 0;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            今日のタスク量
          </span>
        </div>
        {onReschedule && !isRestDay && (
          <button
            onClick={onReschedule}
            className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            <RescheduleIcon className="w-3.5 h-3.5" />
            スケジュールを組み直す
          </button>
        )}
      </div>

      {isRestDay ? (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">☕</p>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">今日は休息日です</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            週間パターンで学習時間が割り当てられていません
          </p>
        </div>
      ) : (
        <>
          {/* Main count + budget bar */}
          <div className="flex items-end gap-4 mb-4">
            <div className="shrink-0">
              <span
                className={cn(
                  'text-5xl font-bold tabular-nums leading-none',
                  budget.totalTaskCount === 0
                    ? 'text-gray-400 dark:text-gray-600'
                    : 'text-gray-900 dark:text-gray-100',
                )}
              >
                {budget.totalTaskCount}
              </span>
              <span className="text-base text-gray-400 dark:text-gray-500 ml-1">件</span>
            </div>
            <div className="flex-1 pb-0.5 min-w-0">
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                <span className="tabular-nums">{budget.totalAllocatedHours.toFixed(1)}h 割当</span>
                <span className="tabular-nums">予算 {budget.budgetHours}h</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usedPct >= 100 ? 'bg-amber-400' : 'bg-emerald-500',
                  )}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Per-project breakdown (no topic names) */}
          {budget.projects.length === 0 ? (
            <p className="text-sm text-center text-gray-400 dark:text-gray-600 py-3">
              今日のタスクはありません
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {budget.projects.map((proj) => {
                const color = subjectColorMap.get(proj.subjectId) ?? '#6b7280';
                const projPct =
                  budget.totalAllocatedHours > 0
                    ? (proj.allocatedHoursToday / budget.totalAllocatedHours) * 100
                    : 0;

                return (
                  <div
                    key={proj.subjectId}
                    className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {proj.subjectName}
                    </span>
                    {/* proportional mini-bar */}
                    <div className="w-16 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden hidden sm:block">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${projPct}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400 shrink-0 w-10 text-right">
                      {proj.allocatedHoursToday.toFixed(1)}h
                    </span>
                    <span className="text-xs tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 w-8 text-right">
                      {proj.taskCount}件
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
