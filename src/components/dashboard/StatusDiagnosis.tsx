import { cn } from '../../utils/cn';
import { Badge } from '../ui';

// ─── Diagnosis data ───────────────────────────────────────────────────────────

type DiagnosisKey =
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
): DiagnosisEntry {
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

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusDiagnosisProps {
  spi: number;
  cpi: number;
  isRescheduledToday: boolean;
  onNavigate?: (tab: 'tasks' | 'analytics') => void;
  onReschedule?: () => void;
}

export function StatusDiagnosis({
  spi, cpi, isRescheduledToday, onNavigate, onReschedule,
}: StatusDiagnosisProps) {
  const d = getStatusDiagnosis(spi, cpi, isRescheduledToday);

  const handleAction = () => {
    if (d.actionType === 'tasks')     onNavigate?.('tasks');
    if (d.actionType === 'analytics') onNavigate?.('analytics');
    if (d.actionType === 'reschedule') onReschedule?.();
  };

  // Icon per key
  const icon: Record<DiagnosisKey, string> = {
    restart:   '🔄',
    ideal:     '✅',
    overloaded:'⚡',
    efficient: '🎯',
    burnout:   '⚠️',
    highperf:  '🚀',
  };

  return (
    <div className={cn(
      'rounded-2xl border border-gray-100 dark:border-gray-800 border-l-4 bg-white dark:bg-gray-900 shadow-sm p-5',
      d.cardColor,
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-lg">{icon[d.key]}</span>
        <span className={cn('text-base font-bold', d.labelColor)}>{d.label}</span>
        {isRescheduledToday && d.key !== 'restart' && (
          <Badge variant="info">計画見直し済み</Badge>
        )}
        {d.key === 'restart' && (
          <Badge variant="info">計画見直し済み</Badge>
        )}
        {/* SPI / CPI indicators */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-400 dark:text-gray-500">
            SPI <span className={cn('font-semibold tabular-nums', spi >= BUFFER_LOW ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{spi.toFixed(2)}</span>
          </span>
          <span className="text-gray-200 dark:text-gray-700">/</span>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            CPI <span className={cn('font-semibold tabular-nums', cpi >= BUFFER_LOW ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{cpi.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Trend text */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
        {d.trend}
      </p>

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
          {d.action} ✓
        </span>
      )}
    </div>
  );
}
