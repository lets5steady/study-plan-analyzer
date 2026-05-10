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
                  ⚡ {r.subjectName}：目標完了日（{r.examDate}）までに間に合わない可能性があります（約 {r.daysAtRisk} 日超過の見込み）
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
