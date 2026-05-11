import { useEVM } from '../../hooks/useEVM';

export function RescheduleAlert() {
  const {
    totalMetrics,
    examRisks,
    hasScheduleRisk,
    rescheduleDeadlineFirst,
    reschedulePaceFirst,
  } = useEVM();
  const { spi, cpi } = totalMetrics;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 animate-amber-pulse">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
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
            スケジュールの組み直し方法を選んでください。
          </p>
        </div>
      </div>

      {/* Mode selection cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* 期限厳守モード */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              期限厳守モード
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
            当初の目標日はそのまま。今日以降の残り日数に遅れ分を均等に上乗せし、スケジュールを引き直します。
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-500 italic">
            「遅れによる予測のズレを解消し、新しい『計画値』に修正しました。」
          </p>
          <button
            onClick={rescheduleDeadlineFirst}
            className="mt-auto w-full px-3 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
          >
            このモードで組み直す
          </button>
        </div>

        {/* ペース優先モード */}
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🔄</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              ペース優先モード
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
            現在の完了予測日を新しい目標日として上書きし、SPI を 1.0 にリセットします。無理のない計画で再スタートできます。
          </p>
          <p className="text-[11px] text-blue-500 dark:text-blue-400 italic">
            目標日が更新され、今日から新しいペースで計測が始まります。
          </p>
          <button
            onClick={reschedulePaceFirst}
            className="mt-auto w-full px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            このモードで組み直す
          </button>
        </div>
      </div>
    </div>
  );
}
