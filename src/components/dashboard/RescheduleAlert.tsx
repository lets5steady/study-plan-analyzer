import { useEVM } from '../../hooks/useEVM';
import { Button } from '../ui';

export function RescheduleAlert() {
  const { totalMetrics, examRisks, hasScheduleRisk, rescheduleFromToday } = useEVM();
  const { spi, cpi } = totalMetrics;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 animate-amber-pulse">
      <div className="flex items-start gap-3">
        <span className="text-amber-500 text-xl shrink-0 mt-0.5">⚠</span>
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            もう少しペースを上げると良さそうです
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-amber-700 dark:text-amber-400">
            {hasScheduleRisk && (
              <span>進捗スピード {spi.toFixed(2)}（計画より遅れています）</span>
            )}
            {cpi < 1 && (
              <span>集中効率 {cpi.toFixed(2)}（予定より多く時間がかかっています）</span>
            )}
          </div>

          {examRisks.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {examRisks.map((r) => (
                <li key={r.subjectId} className="text-xs text-red-600 dark:text-red-400">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    {r.subjectName}：目標完了日（{r.examDate}）までに間に合わない可能性があります（約 {r.daysAtRisk} 日超過の見込み）
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            「スケジュールを組み直す」を押すと、今日から残りのタスクを再配分します。
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={rescheduleFromToday}
          className="shrink-0 bg-amber-500 hover:bg-amber-600 whitespace-nowrap"
        >
          スケジュールを組み直す
        </Button>
      </div>
    </div>
  );
}
