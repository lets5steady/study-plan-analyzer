import { cn } from '../../utils/cn';
import { Badge } from '../ui';

// ─── Diagnosis data ───────────────────────────────────────────────────────────

type DiagnosisKey =
  | 'no_project'
  | 'not_started'
  | 'restart'
  | 'ideal'
  | 'overloaded'
  | 'efficient'
  | 'burnout'
  | 'highperf';

type ActionType = 'tasks' | 'analytics' | 'reschedule' | 'none';

interface DiagnosisEntry {
  key: DiagnosisKey;
  label: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  cardColor: string;           // Tailwind classes for card border/bg accent
  labelColor: string;          // label text color
  trend: string;
  action: string;
  actionType: ActionType;
}

const DIAGNOSES: Record<DiagnosisKey, DiagnosisEntry> = {
  no_project: {
    key: 'no_project',
    label: 'プロジェクトを追加しましょう',
    badgeVariant: 'neutral',
    cardColor: 'border-l-gray-300 dark:border-l-gray-600 bg-gray-50/60 dark:bg-gray-800/30',
    labelColor: 'text-gray-600 dark:text-gray-300',
    trend: 'まだプロジェクトが登録されていません。学習する科目・資格などをプロジェクトとして追加すると、進捗・効率・完了予測などの分析機能が使えるようになります。',
    action: 'プロジェクトを追加する',
    actionType: 'tasks',
  },
  not_started: {
    key: 'not_started',
    label: 'さあ、学習を始めましょう！',
    badgeVariant: 'info',
    cardColor: 'border-l-indigo-400 dark:border-l-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20',
    labelColor: 'text-indigo-700 dark:text-indigo-300',
    trend: 'プロジェクトの設定が完了しています。学習セッションを記録すると、集中効率（CPI）や進捗スピード（SPI）などの分析が自動的に始まります。最初の一歩を踏み出しましょう！',
    action: '学習セッションを記録する',
    actionType: 'tasks',
  },
  restart: {
    key: 'restart',
    label: 'リスタート・調整完了',
    badgeVariant: 'info',
    cardColor: 'border-l-blue-400 dark:border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/20',
    labelColor: 'text-blue-700 dark:text-blue-300',
    trend: '新しい計画に基づいた初日です。まずはこのベースラインに慣れていきましょう。',
    action: '本日のタスクを確認する',
    actionType: 'tasks',
  },
  ideal: {
    key: 'ideal',
    label: '安定した学習リズム',
    badgeVariant: 'success',
    cardColor: 'border-l-emerald-400 dark:border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/15',
    labelColor: 'text-emerald-700 dark:text-emerald-300',
    trend: '計画通りの進捗を維持しており、時間効率もバランスが良い状態です。無理なく理想的なサイクルで進めることができています。',
    action: '現在の学習習慣を維持する',
    actionType: 'none',
  },
  overloaded: {
    key: 'overloaded',
    label: '高負荷・オーバーコスト',
    badgeVariant: 'warning',
    cardColor: 'border-l-amber-400 dark:border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20',
    labelColor: 'text-amber-700 dark:text-amber-300',
    trend: '予定を前倒しで進めていますが、1タスクあたりの消費時間が想定を上回っています。時間消費で進捗を維持している状態です。',
    action: 'タスクを細分化して見積もりを見直す',
    actionType: 'tasks',
  },
  efficient: {
    key: 'efficient',
    label: '集中力◎・時間不足',
    badgeVariant: 'warning',
    cardColor: 'border-l-amber-400 dark:border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20',
    labelColor: 'text-amber-700 dark:text-amber-300',
    trend: '1時間あたりの集中度は素晴らしいです。あとは学習の「開始時間」を早めるか、回数を増やすだけで一気に進みます。',
    action: '学習時間を確保する',
    actionType: 'analytics',
  },
  burnout: {
    key: 'burnout',
    label: 'キャパオーバーの兆候',
    badgeVariant: 'danger',
    cardColor: 'border-l-red-400 dark:border-l-red-500 bg-red-50/60 dark:bg-red-950/20',
    labelColor: 'text-red-700 dark:text-red-300',
    trend: '学習内容の難易度が想定より高いか、生活リズムと計画が合わなくなっている可能性があります。目標を現実的な範囲に縮小しましょう。',
    action: '再スケジューリングを行う',
    actionType: 'reschedule',
  },
  highperf: {
    key: 'highperf',
    label: 'ハイパフォーマンス',
    badgeVariant: 'success',
    cardColor: 'border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/20',
    labelColor: 'text-emerald-700 dark:text-emerald-300',
    trend: '計画を大幅に上回るスピードと、極めて高い時間効率を両立できています。現在の課題に対してリソースが余っている状態です。',
    action: '発展的な内容に挑戦する',
    actionType: 'tasks',
  },
};

// ─── Diagnosis logic ──────────────────────────────────────────────────────────

const BUFFER_LOW  = 0.95;
const BUFFER_HIGH = 1.05;

export function getStatusDiagnosis(
  spi: number,
  cpi: number,
  isRescheduledToday: boolean,
  noSubjects?: boolean,
  noAC?: boolean,
): DiagnosisEntry {
  if (noSubjects) return DIAGNOSES.no_project;
  if (noAC)       return DIAGNOSES.not_started;
  if (isRescheduledToday) return DIAGNOSES.restart;

  const spiHigh = spi > BUFFER_HIGH;
  const spiLow  = spi < BUFFER_LOW;
  const cpiHigh = cpi > BUFFER_HIGH;
  const cpiLow  = cpi < BUFFER_LOW;

  if (spiHigh && cpiHigh) return DIAGNOSES.highperf;
  if (spiLow  && cpiLow)  return DIAGNOSES.burnout;
  if (spiHigh && cpiLow)  return DIAGNOSES.overloaded;
  if (spiLow  && cpiHigh) return DIAGNOSES.efficient;
  // One or both values are within buffer — check which side is dominant
  if (spiLow)  return DIAGNOSES.efficient;   // good CPI but slow pace
  if (spiHigh) return DIAGNOSES.overloaded;  // fast but CPI might be marginal
  return DIAGNOSES.ideal;                    // both in buffer
}

// ─── Diagnosis SVG icons ─────────────────────────────────────────────────────

function DiagnosisIcon({ diagKey, labelColor }: { diagKey: DiagnosisKey; labelColor: string }) {
  const cls = cn('w-5 h-5 shrink-0', labelColor);
  switch (diagKey) {
    case 'no_project':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      );
    case 'not_started':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
      );
    case 'restart':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      );
    case 'ideal':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'overloaded':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'efficient':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      );
    case 'burnout':
      return null;
    case 'highperf':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusDiagnosisProps {
  spi: number;
  cpi: number;
  isRescheduledToday: boolean;
  lastRescheduleMode?: 'deadline_first' | 'pace_first' | null;
  noSubjects?: boolean;
  noAC?: boolean;
  onNavigate?: (tab: 'tasks' | 'analytics') => void;
  onReschedule?: () => void;
}

const RESCHEDULE_RESULT_MESSAGES: Record<'deadline_first' | 'pace_first', string> = {
  deadline_first: '遅れによる予測のズレを解消し、新しい計画値に修正しました。',
  pace_first: '目標日が更新され、今日から新しいペースで計測が始まります。',
};

export function StatusDiagnosis({
  spi, cpi, isRescheduledToday, lastRescheduleMode, noSubjects, noAC, onNavigate, onReschedule,
}: StatusDiagnosisProps) {
  const d = getStatusDiagnosis(spi, cpi, isRescheduledToday, noSubjects, noAC);

  const handleAction = () => {
    if (d.actionType === 'tasks')     onNavigate?.('tasks');
    if (d.actionType === 'analytics') onNavigate?.('analytics');
    if (d.actionType === 'reschedule') onReschedule?.();
  };

  return (
    <div className={cn(
      'rounded-2xl border border-gray-100 dark:border-gray-800 border-l-4 bg-white dark:bg-gray-900 shadow-sm p-5',
      d.cardColor,
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <DiagnosisIcon diagKey={d.key} labelColor={d.labelColor} />
        <span className={cn('text-base font-bold', d.labelColor)}>{d.label}</span>
        {isRescheduledToday && d.key !== 'restart' && (
          <Badge variant="info">計画見直し済み</Badge>
        )}
        {d.key === 'restart' && (
          <Badge variant="info">計画見直し済み</Badge>
        )}
        {/* SPI / CPI indicators — 未設定・未着手時は非表示 */}
        {!noSubjects && !noAC && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-400 dark:text-gray-500">
              SPI <span className={cn('font-semibold tabular-nums', spi >= BUFFER_LOW ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{spi.toFixed(2)}</span>
            </span>
            <span className="text-gray-200 dark:text-gray-700">/</span>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              CPI <span className={cn('font-semibold tabular-nums', cpi >= BUFFER_LOW ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{cpi.toFixed(2)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Trend text */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
        {d.trend}
      </p>

      {/* リスケ完了メッセージ */}
      {d.key === 'restart' && lastRescheduleMode && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
          {RESCHEDULE_RESULT_MESSAGES[lastRescheduleMode]}
        </p>
      )}

      {/* Action button */}
      {d.actionType !== 'none' && (
        <button
          onClick={handleAction}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            d.key === 'burnout'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : d.key === 'restart'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : d.key === 'highperf' || d.key === 'ideal'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white',
          )}
        >
          {d.action} →
        </button>
      )}
      {d.actionType === 'none' && (
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
          {d.action}
        </span>
      )}
    </div>
  );
}
