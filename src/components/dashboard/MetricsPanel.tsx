import { useState } from 'react';
import { useEVM } from '../../hooks/useEVM';
import { useStorageContext } from '../../context/StorageContext';
import { Badge, Modal, spiVariant, ProgressBar } from '../ui';
import { cn } from '../../utils/cn';
import { RescheduleAlert } from './RescheduleAlert';
import { StatusDiagnosis } from './StatusDiagnosis';
import { TodayTaskCard } from './TodayTaskCard';
import type { RescheduleMode } from '../../types';

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  hint: string;
  techTerm?: string;
  value: string;
  sub?: string;
  note?: string;
  glow?: boolean;
  className?: string;
  valueColor?: string;
  showTech: boolean;
  onClick?: () => void;
}

function KPICard({ label, hint, techTerm, value, sub, note, glow, className, valueColor, showTech, onClick }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-5 flex flex-col gap-2 transition-all duration-500',
        glow
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-600 animate-emerald-glow'
          : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {showTech && techTerm && (
            <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">{techTerm}</span>
          )}
          {onClick && (
            <span className="text-[10px] text-gray-300 dark:text-gray-600" title="クリックで計算根拠を表示">詳細 ▸</span>
          )}
        </div>
      </div>
      <span className={cn('text-4xl font-bold tabular-nums leading-none', valueColor ?? 'text-gray-900 dark:text-gray-100')}>
        {value}
      </span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
      {note && (
        <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">{note}</span>
      )}
      {sub && <span className="text-xs text-gray-500 dark:text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── KPI Detail Modal ─────────────────────────────────────────────────────────

interface CalcRow {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

interface KPIDetailConfig {
  title: string;
  description: string;
  rows: CalcRow[];
  formula: string;       // "A ÷ B = C" style
  formulaResult: string; // coloured result value
  resultColor: string;
}

function DetailRow({ label, value, sub, highlight }: CalcRow) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0',
      highlight && 'bg-emerald-50/50 dark:bg-emerald-900/10 -mx-3 px-3 rounded-lg',
    )}>
      <span className="flex-1 min-w-0 text-xs text-gray-500 dark:text-gray-400 leading-snug">{label}</span>
      <div className="text-right shrink-0 ml-2">
        <span className={cn('text-xs font-semibold tabular-nums', highlight ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200')}>
          {value}
        </span>
        {sub && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Subject mini card ────────────────────────────────────────────────────────

function SubjectMiniCard({ subjectId, showTech }: { subjectId: string; showTech: boolean }) {
  const { data } = useStorageContext();
  const { metricsMap } = useEVM();

  const subject = data.subjects.find((s) => s.id === subjectId);
  const m = metricsMap[subjectId];
  if (!subject || !m) return null;

  const daysLeft = subject.examDate
    ? Math.ceil((new Date(subject.examDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const spiLabel = showTech ? `SPI ${m.spi.toFixed(2)}` : spiToLabel(m.spi);

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: subject.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{subject.name}</p>
        <ProgressBar value={m.percentComplete} className="mt-1.5" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={spiVariant(m.spi)}>{spiLabel}</Badge>
        {daysLeft !== null && (
          <span className="text-xs text-gray-400">目標まで{daysLeft}日</span>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function spiToLabel(spi: number): string {
  if (spi >= 1.1) return '計画より速い';
  if (spi >= 1.0) return '計画通り';
  if (spi >= 0.9) return 'やや遅れ気味';
  return 'ペースを上げよう';
}

function cpiToLabel(cpi: number): string {
  if (cpi >= 1.1) return '効率よく進んでいます';
  if (cpi >= 1.0) return '集中できています';
  if (cpi >= 0.9) return '少し時間がかかっています';
  return '取り組み方を見直そう';
}

// ─── EVM Glossary (詳細モード用) ─────────────────────────────────────────────

const glossary = [
  { term: 'SPI',  full: 'Schedule Performance Index',  ja: '進捗スピードの指数。1.0 = 計画通り、1.0超 = 計画より速い' },
  { term: 'CPI',  full: 'Cost Performance Index',      ja: '学習効率の指数。1.0 = 予定通りの時間で進んでいる' },
  { term: 'BAC',  full: 'Budget at Completion',        ja: 'プロジェクト全体の予定学習時間' },
  { term: 'EV',   full: 'Earned Value',                ja: '達成した学習の価値（予定時間ベースで換算）' },
  { term: 'AC',   full: 'Actual Cost',                 ja: '実際に使った学習時間の合計' },
  { term: 'EAC',  full: 'Estimate at Completion',      ja: 'このペースで続けた場合の完了見込み時間' },
  { term: 'ETC',  full: 'Estimate to Complete',        ja: '今後あとどれくらいの学習時間が必要か' },
];

function EVMGlossary() {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        EVM 用語集
      </p>
      <dl className="space-y-1.5">
        {glossary.map(({ term, full, ja }) => (
          <div key={term} className="flex gap-2 text-xs">
            <dt className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-10 shrink-0">{term}</dt>
            <dd className="text-gray-500 dark:text-gray-400">
              <span className="text-gray-700 dark:text-gray-300 mr-1">{ja}</span>
              <span className="text-gray-300 dark:text-gray-600">({full})</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Reschedule mode modal ────────────────────────────────────────────────────

interface RescheduleModeModalProps {
  open: boolean;
  onClose: () => void;
  onDeadlineFirst: () => void;
  onPaceFirst: () => void;
}

function RescheduleModeModal({ open, onClose, onDeadlineFirst, onPaceFirst }: RescheduleModeModalProps) {
  const handleSelect = (fn: () => void) => { fn(); onClose(); };

  return (
    <Modal open={open} onClose={onClose} title="スケジュールの組み直し方法を選択">
      <div className="space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          現在の状況に合わせて、スケジュールの調整方法を選んでください。
        </p>
        <div className="grid gap-3">
          {/* 期限厳守 */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">期限厳守モード</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              当初の目標日はそのまま。今日以降の残り日数に遅れ分を均等に上乗せし、スケジュールを引き直します。
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-500 italic">
              気合で追いつきたい方向け
            </p>
            <button
              onClick={() => handleSelect(onDeadlineFirst)}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              このモードで組み直す
            </button>
          </div>

          {/* ペース優先 */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">ペース優先モード</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              現在の完了予測日を新しい目標日として上書きし、SPI を 1.0 にリセットします。無理のない計画で再スタートできます。
            </p>
            <p className="text-[11px] text-blue-500 dark:text-blue-400 italic">
              無理なく確実に進めたい方向け
            </p>
            <button
              onClick={() => handleSelect(onPaceFirst)}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              このモードで組み直す
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main MetricsPanel ────────────────────────────────────────────────────────

interface MetricsPanelProps {
  onNavigate?: (tab: 'tasks' | 'analytics') => void;
  onReschedule?: () => void;
}

type DetailModalType = 'spi' | 'cpi' | 'forecast' | 'achievement' | null;

export function MetricsPanel({ onNavigate }: MetricsPanelProps) {
  const { data } = useStorageContext();
  const { totalMetrics, hasScheduleRisk, hasTimeRisk, examRisks, rescheduleDeadlineFirst, reschedulePaceFirst } = useEVM();
  const [showTech, setShowTech] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  const m = totalMetrics;
  const hasData = data.subjects.length > 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const rescheduledToday = data.settings.lastRescheduledAt === todayStr;
  const lastMode = data.settings.lastRescheduleMode as RescheduleMode | null | undefined;

  const forecastStr = m.forecastCompletionDate
    ? new Date(m.forecastCompletionDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    : '—';

  const daysToForecast = m.forecastCompletionDate
    ? Math.ceil((new Date(m.forecastCompletionDate).getTime() - Date.now()) / 86_400_000)
    : null;

  // ── Detail modal configs ──────────────────────────────────────────────────
  // AC=0 = 学習セッション未記録（未着手状態）
  const noAC = hasData && m.ac === 0;

  const spiColor = m.spi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400'
    : m.spi >= 0.9 ? 'text-amber-500' : 'text-red-500';
  const cpiColor = noAC
    ? 'text-gray-400 dark:text-gray-500'
    : m.cpi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400'
    : m.cpi >= 0.9 ? 'text-amber-500' : 'text-red-500';

  // SPI の内訳表示用: リスケ後はデルタ値（増分EV/PV）を使う
  const spiEV = m.effectiveEV;
  const spiPV = m.effectivePV;
  const spiEVLabel = m.isDeltaMode ? '達成した成果 (EV) ※リスケ以降' : '達成した成果 (EV)';
  const spiPVLabel = m.isDeltaMode ? '予定していた成果 (PV) ※リスケ以降' : '予定していた成果 (PV)';
  const spiPVSub   = m.isDeltaMode ? '最終リスケ日から本日までの計画量' : 'スケジュール上の本日までの計画量';
  const spiSVSub   = m.sv >= 0 ? '計画より進んでいます' : '計画より遅れています';

  const detailConfigs: Record<Exclude<DetailModalType, null>, KPIDetailConfig> = {
    spi: {
      title: '進捗スピード (SPI) の内訳',
      description: m.isDeltaMode
        ? 'リスケ後の計画を基準に、リスケ以降の増分EV ÷ 増分PV で算出します。リスケ以前の完了作業はベースラインとして除外されます。'
        : 'SPIは、予定していた学習量（PV）に対して、実際に達成した成果（EV）の割合を表します。1.0以上なら計画を上回るペース、1.0未満なら遅れている状態です。',
      rows: [
        { label: spiEVLabel, value: `${spiEV.toFixed(2)} pt`, sub: '完了したトピック・タスクから計算' },
        { label: spiPVLabel, value: `${spiPV.toFixed(2)} pt`, sub: spiPVSub },
        { label: 'スケジュール差異 (SV = EV − PV)', value: `${m.sv >= 0 ? '+' : ''}${m.sv.toFixed(2)} pt`, sub: spiSVSub },
      ],
      formula: spiPV === 0 ? `（計画初日 — 評価データなし）` : `${spiEV.toFixed(2)} ÷ ${spiPV.toFixed(2)} = ${m.spi.toFixed(2)}`,
      formulaResult: spiPV === 0 ? '—' : m.spi.toFixed(2),
      resultColor: spiColor,
    },
    cpi: {
      title: '集中効率 (CPI) の内訳',
      description: noAC
        ? 'まだ学習セッションが記録されていないため、CPI を算出できません。学習時間を記録すると自動的に計算されます。'
        : 'CPIは、実際に使った時間（AC）に対して、どれだけの成果（EV）を得られたかのコスパを表します。1.0以上なら予定より少ない時間で成果を出せている状態です。',
      rows: noAC
        ? [
            { label: '達成した成果 (EV)', value: `${m.ev.toFixed(2)} pt`, sub: '完了したトピック・タスクから計算' },
            { label: '実際に使った時間 (AC)', value: '0.00 時間', sub: '学習セッションを記録してください' },
          ]
        : [
            { label: '達成した成果 (EV)', value: `${m.ev.toFixed(2)} pt`, sub: '完了したトピック・タスクから計算' },
            { label: '実際に使った時間 (AC)', value: `${m.ac.toFixed(2)} 時間`, sub: '記録したすべての学習セッションの合計' },
            { label: 'コスト差異 (CV = EV − AC)', value: `${m.cv >= 0 ? '+' : ''}${m.cv.toFixed(2)} pt`, sub: m.cv >= 0 ? '予定より効率よく進んでいます' : '予定より時間がかかっています' },
          ],
      formula: noAC ? '（実績なし — 学習セッションを記録すると算出されます）' : `${m.ev.toFixed(2)} ÷ ${m.ac.toFixed(2)} = ${m.cpi.toFixed(2)}`,
      formulaResult: noAC ? '—' : m.cpi.toFixed(2),
      resultColor: cpiColor,
    },
    forecast: {
      title: '完了見込みの詳細',
      description: '現在の効率（CPI）で学習を続けた場合の完了見込み時間（EAC）と、残り必要な学習時間（ETC）です。',
      rows: [
        { label: '全体の予定時間 (BAC)', value: `${m.bac.toFixed(1)} 時間`, sub: 'すべてのトピックの計画時間合計' },
        { label: '実績時間 (AC)', value: `${m.ac.toFixed(1)} 時間`, sub: 'これまでに使った時間' },
        { label: '完了見込み時間 (EAC = BAC ÷ CPI)', value: `${m.eac.toFixed(1)} 時間`, sub: `${m.bac.toFixed(1)} ÷ ${m.cpi.toFixed(2)}` },
        { label: '残り必要時間 (ETC = EAC − AC)', value: `${m.etc.toFixed(1)} 時間`, sub: `${m.eac.toFixed(1)} − ${m.ac.toFixed(1)}` },
        { label: '完了余裕 (VAC = BAC − EAC)', value: `${m.vac >= 0 ? '+' : ''}${m.vac.toFixed(1)} 時間`, sub: m.vac >= 0 ? '予定内に収まる見込み' : '予定を超過する見込み' },
      ],
      formula: `BAC(${m.bac.toFixed(1)}) ÷ CPI(${m.cpi.toFixed(2)}) = ${m.eac.toFixed(1)}h`,
      formulaResult: `${m.eac.toFixed(1)}h`,
      resultColor: m.vac >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
    },
    achievement: {
      title: '学習達成率 (EV / BAC) の内訳',
      description: '学習達成率は、全体の計画時間（BAC）に対して、実際に達成した成果（EV）の割合です。トピックの完了率とタスクの完了数から算出されます。',
      rows: [
        { label: '達成した成果 (EV)', value: `${m.ev.toFixed(2)} pt`, sub: 'トピック完了率70% + タスク完了数30% で加重計算' },
        { label: '全体の計画時間 (BAC)', value: `${m.bac.toFixed(2)} pt`, sub: 'すべてのトピックの計画時間合計' },
        { label: '実績時間 (AC)', value: `${m.ac.toFixed(1)} 時間`, sub: 'これまでに記録した学習時間の合計' },
        { label: '残り未達成分', value: `${(m.bac - m.ev).toFixed(2)} pt`, sub: `BAC ${m.bac.toFixed(2)} − EV ${m.ev.toFixed(2)}` },
      ],
      formula: `EV(${m.ev.toFixed(2)}) ÷ BAC(${m.bac.toFixed(2)}) = ${m.percentComplete.toFixed(1)}%`,
      formulaResult: `${m.percentComplete.toFixed(1)}%`,
      resultColor: m.percentComplete >= 80 ? 'text-emerald-600 dark:text-emerald-400'
        : m.percentComplete >= 40 ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-600 dark:text-gray-400',
    },
  };

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="進捗スピード"
          hint={hasData ? spiToLabel(m.spi) : '1.0 = 計画通りのペース'}
          techTerm="SPI"
          value={hasData ? m.spi.toFixed(2) : '—'}
          sub={hasData
            ? m.sv >= 0
              ? `+${m.sv.toFixed(1)}h 計画より進んでいます`
              : `${m.sv.toFixed(1)}h 遅れています`
            : undefined}
          note={rescheduledToday ? '※計画を見直しました' : undefined}
          glow={hasData && m.spi >= 1.0}
          showTech={showTech}
          onClick={hasData ? () => setDetailModal('spi') : undefined}
          valueColor={hasData
            ? m.spi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400'
            : m.spi >= 0.9 ? 'text-amber-500'
            : 'text-red-500'
            : undefined}
        />
        <KPICard
          label="集中効率"
          hint={
            !hasData ? '1.0 = 100% の効率'
            : noAC    ? 'まだ学習セッションがありません'
            : cpiToLabel(m.cpi)
          }
          techTerm="CPI"
          value={!hasData ? '—' : noAC ? '未着手' : m.cpi.toFixed(2)}
          sub={
            hasData && !noAC
              ? m.cv >= 0
                ? `+${m.cv.toFixed(1)}h 効率よく進んでいます`
                : `${Math.abs(m.cv).toFixed(1)}h 余分に時間がかかっています`
              : undefined
          }
          glow={hasData && !noAC && m.cpi >= 1.0}
          showTech={showTech}
          onClick={hasData ? () => setDetailModal('cpi') : undefined}
          valueColor={
            !hasData || noAC
              ? 'text-gray-400 dark:text-gray-500'
              : m.cpi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400'
              : m.cpi >= 0.9 ? 'text-amber-500'
              : 'text-red-500'
          }
        />
        <KPICard
          label="学習達成率"
          hint={hasData ? `目標の ${m.percentComplete.toFixed(0)}% を達成` : '全体のうち達成した割合'}
          techTerm="EV / BAC"
          value={hasData ? `${m.percentComplete.toFixed(0)}%` : '—'}
          sub={hasData ? `達成 ${m.ev.toFixed(1)}h ／ 全体 ${m.bac.toFixed(1)}h` : undefined}
          showTech={showTech}
          onClick={hasData ? () => setDetailModal('achievement') : undefined}
          valueColor="text-indigo-600 dark:text-indigo-400"
        />
        <KPICard
          label="完了予測日"
          hint={daysToForecast !== null ? `今のペースで残り約 ${daysToForecast} 日` : 'スケジュール生成後に表示'}
          techTerm="Forecast"
          value={forecastStr}
          showTech={showTech}
          onClick={hasData ? () => setDetailModal('forecast') : undefined}
          valueColor="text-gray-800 dark:text-gray-200"
        />
      </div>

      {/* KPI Detail Modal */}
      {detailModal && (
        <Modal
          open
          onClose={() => setDetailModal(null)}
          title={detailConfigs[detailModal].title}
          footer={
            <button
              onClick={() => setDetailModal(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              閉じる
            </button>
          }
        >
          {(() => {
            const cfg = detailConfigs[detailModal];
            return (
              <div className="space-y-3">
                {/* Description */}
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800 rounded-xl px-3 py-2.5">
                  {cfg.description}
                </p>

                {/* Data rows */}
                <div>
                  <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">根拠データ</h3>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {cfg.rows.map((row) => (
                      <DetailRow key={row.label} {...row} />
                    ))}
                  </div>
                </div>

                {/* Formula */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-3 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">計算式</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <code className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 break-all">
                      {cfg.formula}
                    </code>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">結果</span>
                      <span className={cn('text-xl font-bold tabular-nums', cfg.resultColor)}>
                        {cfg.formulaResult}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ステータス診断 — 常に表示（未設定・未着手・通常状態を自動判別） */}
      <StatusDiagnosis
        spi={m.spi}
        cpi={m.cpi}
        isRescheduledToday={rescheduledToday}
        lastRescheduleMode={lastMode}
        noSubjects={!hasData}
        noAC={noAC}
        onNavigate={onNavigate}
        onReschedule={() => setRescheduleModalOpen(true)}
      />

      {/* 今日のタスク量 */}
      <TodayTaskCard onReschedule={() => setRescheduleModalOpen(true)} />

      {/* 時間サマリ row */}
      {hasData && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: '全体の予定学習時間',
              tech: 'BAC',
              val: `${m.bac.toFixed(1)}h`,
              note: 'すべてのトピックの合計',
            },
            {
              label: '完了までの予想時間',
              tech: 'EAC',
              val: `${m.eac.toFixed(1)}h`,
              note: '今の効率で続けた場合',
            },
            {
              label: 'あと何時間かかる？',
              tech: 'ETC',
              val: `${m.etc.toFixed(1)}h`,
              note: '残り作業の見込み時間',
            },
          ].map(({ label, tech, val, note }) => (
            <div key={tech} className="bg-gray-50 dark:bg-gray-900/60 rounded-xl px-4 py-3 flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
                {showTech && <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">{tech}</span>}
              </div>
              <span className="text-lg font-semibold tabular-nums text-gray-800 dark:text-gray-200">{val}</span>
              <span className="text-[10px] text-gray-400">{note}</span>
            </div>
          ))}
        </div>
      )}

      {/* 詳細用語ボタン */}
      {hasData && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowTech((v) => !v)}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            {showTech ? '▲ EVM用語を隠す' : '▽ EVM用語を表示'}
          </button>
        </div>
      )}
      {showTech && hasData && <EVMGlossary />}

      {/* Reschedule alert / rescheduled-today badge */}
      {rescheduledToday ? (
        <div className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-xl border',
          lastMode === 'pace_first'
            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        )}>
          <div className="flex-1 space-y-0.5">
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold',
              lastMode === 'pace_first'
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
            )}>
              {lastMode === 'pace_first' ? 'ペース優先モード' : '期限厳守モード'}で組み直しました
            </span>
            <p className={cn(
              'text-sm',
              lastMode === 'pace_first'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-amber-700 dark:text-amber-400',
            )}>
              {lastMode === 'pace_first'
                ? '完了予測日を新しい目標日として更新しました。今日から新しいペースで計測が始まります。'
                : '遅れによる予測のズレを解消し、新しい『計画値』に修正しました。引き続き目標日を目指して学習しましょう。'}
            </p>
          </div>
        </div>
      ) : (hasScheduleRisk || hasTimeRisk || examRisks.length > 0) ? (
        <RescheduleAlert />
      ) : null}

      {/* Reschedule mode modal (triggered from StatusDiagnosis burnout action) */}
      <RescheduleModeModal
        open={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        onDeadlineFirst={rescheduleDeadlineFirst}
        onPaceFirst={reschedulePaceFirst}
      />

      {/* Subject overview */}
      {data.subjects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">プロジェクトごとの進み具合</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.subjects.map((s) => (
              <SubjectMiniCard key={s.id} subjectId={s.id} showTech={showTech} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
