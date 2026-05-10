import { useState } from 'react';
import { useStorageContext } from '../../context/StorageContext';
import { useEVM } from '../../hooks/useEVM';
import { Badge, Button, ProgressBar, spiVariant } from '../ui';
import { cn } from '../../utils/cn';
import { addTopic, deleteSubject, deleteTopic, updateSubject } from '../../utils/mutations';
import { TopicRow } from './TopicRow';
import {
  LEARNING_MODES, VOLUME_OPTIONS,
  calcVolumeHours, formatVolumeTime,
  type LearningModeId, type VolumeId,
} from '../../utils/learningModes';
import type { Topic } from '../../types';

const COLORS = [
  '#56A3A1', '#70A1AD', '#CB855D', '#D17A7A',
  '#8A82B8', '#B882A8', '#4D9E7A', '#C9A84A',
];

interface SubjectCardProps {
  subjectId: string;
}

export function SubjectCard({ subjectId }: SubjectCardProps) {
  const { data, updateData } = useStorageContext();
  const { metricsMap } = useEVM();
  const [open, setOpen]               = useState(true);
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName]   = useState('');
  const [newTopicHours, setNewTopicHours] = useState(4);
  const [editingProject, setEditingProject] = useState(false);

  const subject = data.subjects.find((s) => s.id === subjectId);
  const m = metricsMap[subjectId];
  if (!subject) return null;

  // ── project edit state (mirrors AddSubjectModal fields) ──────────────────
  const [editName, setEditName]           = useState(subject.name);
  const [editDesc, setEditDesc]           = useState(subject.description);
  const [editColor, setEditColor]         = useState(subject.color);
  const [editExamDate, setEditExamDate]   = useState(subject.examDate ?? '');
  const [editWeekly, setEditWeekly]       = useState(subject.targetHoursPerWeek);
  const [editMode, setEditMode]           = useState<LearningModeId | null>(null);

  // ── add topic state ──────────────────────────────────────────────────────
  const [selectedVolume, setSelectedVolume] = useState<VolumeId | null>(null);

  const startEditProject = () => {
    setEditName(subject.name);
    setEditDesc(subject.description);
    setEditColor(subject.color);
    setEditExamDate(subject.examDate ?? '');
    setEditWeekly(subject.targetHoursPerWeek);
    setEditMode(null);
    setEditingProject(true);
  };

  const saveEditProject = () => {
    if (!editName.trim()) return;
    updateData({
      subjects: updateSubject(data.subjects, subjectId, {
        name: editName.trim(),
        description: editDesc.trim(),
        color: editColor,
        examDate: editExamDate || null,
        targetHoursPerWeek: editWeekly,
      }),
    });
    setEditingProject(false);
  };

  const daysLeft = subject.examDate
    ? Math.ceil((new Date(subject.examDate).getTime() - Date.now()) / 86_400_000)
    : null;

  // ── Add topic — auto-creates one task with the topic name ────────────────
  const handleAddTopic = () => {
    const name = newTopicName.trim();
    if (!name) return;
    const topic: Topic = {
      id: crypto.randomUUID(),
      name,
      plannedHours: newTopicHours,
      earnedHours: 0,
      actualHours: 0,
      completionPercent: 0,
      subtasks: [
        { id: crypto.randomUUID(), name, completed: false, order: 0, type: 'main' },
      ],
      status: 'not_started',
      notes: '',
      order: subject.topics.length,
    };
    updateData({ subjects: addTopic(data.subjects, subjectId, topic) });
    setNewTopicName('');
    setNewTopicHours(4);
    setSelectedVolume(null);
    setAddingTopic(false);
  };

  const handleDeleteSubject = () => {
    if (!confirm(`プロジェクト「${subject.name}」を削除しますか？`)) return;
    updateData({ subjects: deleteSubject(data.subjects, subjectId) });
  };

  const handleDeleteTopic = (topicId: string, topicName: string) => {
    if (!confirm(`トピック「${topicName}」を削除しますか？`)) return;
    updateData({ subjects: deleteTopic(data.subjects, subjectId, topicId) });
  };

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

      {/* ── Project edit form ──────────────────────────────────────────────── */}
      {editingProject ? (
        <div className="px-5 py-4 space-y-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">プロジェクトを編集</span>
            <button
              onClick={() => setEditingProject(false)}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >✕</button>
          </div>

          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">プロジェクト名</span>
              <input
                autoFocus
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && saveEditProject()}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">説明</span>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">目標完了日</span>
              <input
                type="date"
                value={editExamDate}
                onChange={(e) => setEditExamDate(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Color picker */}
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setEditColor(c)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: editColor === c ? `3px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>

          {/* Learning mode selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">学習モード</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {LEARNING_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => { setEditMode(mode.id); setEditWeekly(mode.weeklyHours); }}
                  className={cn(
                    'text-left rounded-lg border p-2 transition-all',
                    editMode === mode.id
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 dark:border-emerald-600 ring-1 ring-emerald-400 dark:ring-emerald-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800',
                  )}
                >
                  <div className={cn(
                    'text-sm font-semibold',
                    editMode === mode.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200',
                  )}>
                    {mode.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    {mode.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Weekly hours */}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">週間目標時間 (h)</span>
            <input
              type="number"
              min={1} step={0.5}
              value={editWeekly}
              onChange={(e) => { setEditWeekly(Number(e.target.value)); setEditMode(null); }}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-600">
              ※ 上のモードを選ぶと自動入力されます。手動で微調整も可能です。
            </p>
          </label>

          <div className="flex justify-between items-center">
            <Button size="sm" variant="danger" onClick={handleDeleteSubject}>プロジェクトを削除</Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditingProject(false)}>キャンセル</Button>
              <Button size="sm" onClick={saveEditProject} disabled={!editName.trim()}>保存</Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Header (collapsed or expanded) ─────────────────────────────── */
        <div
          className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: subject.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{subject.name}</h3>
              {subject.description && (
                <span className="text-sm text-gray-400 truncate hidden sm:inline">{subject.description}</span>
              )}
            </div>
            {m && <ProgressBar value={m.percentComplete} className="mt-1.5 max-w-xs" />}
            {/* Badges — mobile only, shown below progress bar */}
            {m && (
              <div className="flex gap-1.5 flex-wrap mt-1.5 sm:hidden">
                <Badge variant={spiVariant(m.spi)}>
                  {m.spi >= 1.0 ? '順調 ✓' : m.spi >= 0.9 ? 'やや遅れ' : 'ペース注意'}
                </Badge>
                <Badge variant={m.cpi >= 1 ? 'success' : m.cpi >= 0.9 ? 'warning' : 'danger'}>
                  効率 {m.cpi.toFixed(2)}
                </Badge>
                {daysLeft !== null && (
                  <Badge variant={daysLeft < 14 ? 'danger' : daysLeft < 30 ? 'warning' : 'neutral'}>
                    残 {daysLeft}日
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Badges — desktop only */}
            {m && (
              <span className="hidden sm:inline-flex">
                <Badge variant={spiVariant(m.spi)}>
                  {m.spi >= 1.0 ? '順調 ✓' : m.spi >= 0.9 ? 'やや遅れ' : 'ペース注意'}
                </Badge>
              </span>
            )}
            {m && (
              <span className="hidden sm:inline-flex">
                <Badge variant={m.cpi >= 1 ? 'success' : m.cpi >= 0.9 ? 'warning' : 'danger'}>
                  効率 {m.cpi.toFixed(2)}
                </Badge>
              </span>
            )}
            {daysLeft !== null && (
              <span className="hidden sm:inline-flex">
                <Badge variant={daysLeft < 14 ? 'danger' : daysLeft < 30 ? 'warning' : 'neutral'}>
                  目標まで {daysLeft}日
                </Badge>
              </span>
            )}
            {/* Edit button — stops propagation so it doesn't toggle open */}
            <button
              onClick={(e) => { e.stopPropagation(); startEditProject(); }}
              className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors px-1.5 py-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              title="プロジェクトを編集"
            >✎ 編集</button>
            <span className={cn('text-gray-400 text-sm transition-transform', open ? 'rotate-180' : '')}>▼</span>
          </div>
        </div>
      )}

      {/* ── EVM summary strip ─────────────────────────────────────────────── */}
      {m && open && !editingProject && (
        <div className="flex gap-4 px-5 py-2 bg-gray-50 dark:bg-gray-800/40 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 flex-wrap">
          <span title="全体の予定学習時間 (BAC)">予定 <strong>{m.bac.toFixed(1)}h</strong></span>
          <span title="達成した学習量 (EV)">達成 <strong>{m.ev.toFixed(1)}h</strong></span>
          <span title="実際に使った時間 (AC)">実績 <strong>{m.ac.toFixed(1)}h</strong></span>
          <span title="残り予想時間 (ETC)">残り約 <strong>{m.etc.toFixed(1)}h</strong></span>
          {m.forecastCompletionDate && (
            <span title="このペースでの完了予測日">
              完了予測 <strong>{new Date(m.forecastCompletionDate).toLocaleDateString('ja-JP')}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── Topic list ────────────────────────────────────────────────────── */}
      {open && !editingProject && (
        <div className="p-4 space-y-2">
          {subject.topics.length === 0 && !addingTopic && (
            <p className="text-sm text-gray-400 text-center py-4">
              トピックがありません。下のボタンで追加してください。
            </p>
          )}
          {subject.topics
            .sort((a, b) => a.order - b.order)
            .map((t) => (
              <TopicRow
                key={t.id}
                subjectId={subjectId}
                topic={t}
                onDeleteTopic={() => handleDeleteTopic(t.id, t.name)}
              />
            ))}

          {/* Add topic inline form */}
          {addingTopic ? (
            <div className="rounded-xl border border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-700/25 px-4 py-3 mt-2 space-y-3">
              {/* Topic name */}
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">トピック名</span>
                <input
                  autoFocus
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAddTopic()}
                  placeholder="例：非同期処理 / useEffect"
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>

              {/* Volume selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">ボリューム感</span>
                <div className="grid grid-cols-3 gap-2">
                  {VOLUME_OPTIONS.map((vol) => {
                    const hours = calcVolumeHours(subject.targetHoursPerWeek, vol.coefficient);
                    const timeStr = formatVolumeTime(hours);
                    return (
                      <button
                        key={vol.id}
                        type="button"
                        onClick={() => {
                          setSelectedVolume(vol.id);
                          setNewTopicHours(Math.round(hours * 2) / 2 || 0.5);
                        }}
                        className={cn(
                          'text-left rounded-lg border p-2.5 transition-all',
                          selectedVolume === vol.id
                            ? 'border-emerald-400 bg-emerald-100 dark:bg-emerald-800/40 dark:border-emerald-500 ring-1 ring-emerald-400 dark:ring-emerald-500'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700',
                        )}
                      >
                        <div className={cn(
                          'text-sm font-semibold',
                          selectedVolume === vol.id
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-gray-300',
                        )}>
                          {vol.labelText}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {timeStr}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual hours input */}
              <div className="flex gap-2 items-end">
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">予定時間 (h)</span>
                  <input
                    type="number"
                    min={0.5} step={0.5}
                    value={newTopicHours}
                    onChange={(e) => { setNewTopicHours(Number(e.target.value)); setSelectedVolume(null); }}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
                <div className="flex gap-2 pb-0.5">
                  <Button size="sm" onClick={handleAddTopic}>追加</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingTopic(false); setSelectedVolume(null); }}>✕</Button>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                ※ 選択すると目安時間が自動入力されます。手動で微調整も可能です。
              </p>
            </div>
          ) : (
            <div className="flex justify-start items-center pt-1">
              <Button size="sm" variant="secondary" onClick={() => setAddingTopic(true)}>
                + トピックを追加
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
