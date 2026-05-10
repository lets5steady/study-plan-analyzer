import { useEffect, useRef, useState } from 'react';
import { useStorageContext } from '../../context/StorageContext';
import { Switch, ProgressBar, Button } from '../ui';
import { cn } from '../../utils/cn';
import {
  updateTopic, toggleSubtask, addSubtask,
  updateSubtask, deleteSubtask,
} from '../../utils/mutations';
import {
  VOLUME_OPTIONS, calcVolumeHours, formatVolumeTime, type VolumeId,
} from '../../utils/learningModes';
import type { Topic, SubjectStatus } from '../../types';

// ─── Task type ────────────────────────────────────────────────────────────────

type TaskType = 'main' | 'sub';

const taskTypeStyles = {
  main: {
    dot:      'bg-emerald-500',
    label:    'メイン',
    activeBg: 'bg-emerald-500 text-white',
    row:      '',
    text:     'text-sm text-gray-800 dark:text-gray-200',
  },
  sub: {
    dot:      'bg-amber-400',
    label:    'サブ',
    activeBg: 'bg-amber-400 text-white',
    row:      'pl-5',
    text:     'text-sm text-gray-500 dark:text-gray-400',
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcFromSubtasks(subtasks: Topic['subtasks']): { completionPercent: number; status: SubjectStatus } {
  const total = subtasks.length;
  const done  = subtasks.filter((s) => s.completed).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const status: SubjectStatus =
    pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';
  return { completionPercent: pct, status };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopicRowProps {
  subjectId: string;
  topic: Topic;
  onDeleteTopic: () => void;
}

// ─── TopicRow ─────────────────────────────────────────────────────────────────

export function TopicRow({ subjectId, topic, onDeleteTopic }: TopicRowProps) {
  const { data, updateData } = useStorageContext();

  const [expanded, setExpanded] = useState(false);

  // Task add input
  const [newSubName, setNewSubName]   = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('main');

  // Task inline editing
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName]   = useState('');

  // Topic inline editing
  const [editingTopic, setEditingTopic]     = useState(false);
  const [editTopicName, setEditTopicName]   = useState(topic.name);
  const [editTopicHours, setEditTopicHours] = useState(topic.plannedHours);
  const [editVolume, setEditVolume]         = useState<VolumeId | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset editing state when collapsing
  useEffect(() => {
    if (!expanded) {
      setNewSubName('');
      setEditingSubId(null);
      setEditingTopic(false);
    }
  }, [expanded]);

  const statusColors: Record<string, string> = {
    completed:   'text-emerald-600 dark:text-emerald-400',
    in_progress: 'text-amber-500',
    not_started: 'text-gray-400',
    paused:      'text-gray-400',
  };

  const subject = data.subjects.find((s) => s.id === subjectId);
  const weeklyHours = subject?.targetHoursPerWeek ?? 7;

  const mutate = (patch: Partial<Topic>) =>
    updateData({ subjects: updateTopic(data.subjects, subjectId, topic.id, patch) });

  // ── Toggle subtask ────────────────────────────────────────────────────────
  const handleToggleSub = (subtaskId: string) => {
    const toggled = toggleSubtask(data.subjects, subjectId, topic.id, subtaskId);
    const updatedTopic = toggled
      .find((s) => s.id === subjectId)?.topics
      .find((t) => t.id === topic.id);
    const patch = updatedTopic ? calcFromSubtasks(updatedTopic.subtasks) : {};
    updateData({ subjects: updateTopic(toggled, subjectId, topic.id, patch) });
  };

  // ── Add subtask ───────────────────────────────────────────────────────────
  const handleAddSubtask = () => {
    // Use typed value; fall back to topic.name when input is empty
    const name = (newSubName.trim() || topic.name).trim();
    if (!name) return;

    const newSub = {
      id: crypto.randomUUID(),
      name,
      completed: false,
      order: topic.subtasks.length,
      type: newTaskType,
    };

    let subjects = addSubtask(data.subjects, subjectId, topic.id, newSub);

    // If user typed a custom name, remove the auto-generated task (same name as topic)
    if (name !== topic.name) {
      const autoId = topic.subtasks.find((st) => st.name === topic.name)?.id;
      if (autoId) {
        subjects = deleteSubtask(subjects, subjectId, topic.id, autoId);
      }
    }

    const updatedTopic = subjects
      .find((s) => s.id === subjectId)?.topics
      .find((t) => t.id === topic.id);
    const patch = updatedTopic ? calcFromSubtasks(updatedTopic.subtasks) : {};
    updateData({ subjects: updateTopic(subjects, subjectId, topic.id, patch) });

    setNewSubName('');
    inputRef.current?.focus();
  };

  // ── Delete subtask ────────────────────────────────────────────────────────
  const handleDeleteSub = (subtaskId: string) => {
    const deleted = deleteSubtask(data.subjects, subjectId, topic.id, subtaskId);
    const updatedTopic = deleted
      .find((s) => s.id === subjectId)?.topics
      .find((t) => t.id === topic.id);
    const patch = updatedTopic ? calcFromSubtasks(updatedTopic.subtasks) : {};
    updateData({ subjects: updateTopic(deleted, subjectId, topic.id, patch) });
  };

  // ── Save inline task name edit ────────────────────────────────────────────
  const handleSaveSubEdit = (subtaskId: string) => {
    const name = editSubName.trim();
    if (!name) { setEditingSubId(null); return; }
    updateData({ subjects: updateSubtask(data.subjects, subjectId, topic.id, subtaskId, { name }) });
    setEditingSubId(null);
  };

  // ── Save topic edit ───────────────────────────────────────────────────────
  const handleSaveTopicEdit = () => {
    const name = editTopicName.trim();
    if (!name) { setEditingTopic(false); return; }
    mutate({ name, plannedHours: editTopicHours });
    setEditingTopic(false);
    setEditVolume(null);
  };

  const completedSubs = topic.subtasks.filter((s) => s.completed).length;
  const totalSubs     = topic.subtasks.length;

  const evEstimate =
    totalSubs > 0
      ? topic.plannedHours * (completedSubs / totalSubs)
      : topic.plannedHours * (topic.completionPercent / 100);

  const mainTasks = topic.subtasks.filter((s) => (s.type ?? 'main') === 'main');
  const subTasks  = topic.subtasks.filter((s) => s.type === 'sub');

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      expanded
        ? 'border-emerald-400 dark:border-emerald-600'
        : topic.status === 'completed'
          ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-800/15'
          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900',
    )}>

      {/* ── Row header ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
          expanded
            ? 'bg-emerald-100 dark:bg-emerald-700/30 rounded-t-xl'
            : 'bg-white dark:bg-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40',
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={cn(
          'w-2 h-2 rounded-full shrink-0',
          topic.status === 'completed'   && 'bg-emerald-500',
          topic.status === 'in_progress' && 'bg-amber-400',
          (topic.status === 'not_started' || topic.status === 'paused') && 'bg-gray-300 dark:bg-gray-600',
        )} />

        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-sm font-medium truncate',
            topic.status === 'completed'
              ? 'line-through text-gray-400 dark:text-gray-600'
              : 'text-gray-800 dark:text-gray-200',
          )}>
            {topic.name}
          </span>
          <ProgressBar value={topic.completionPercent} className="mt-1 w-32" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm text-gray-400 hidden sm:inline" title="達成した学習量 (Earned Value)">
            達成 {evEstimate.toFixed(1)}h
          </span>
          <span className="text-sm text-gray-400 hidden sm:inline">／予定 {topic.plannedHours}h</span>
          <span className={cn('text-sm', statusColors[topic.status])}>
            {topic.status === 'completed' ? '✓' : topic.status === 'in_progress' ? '▶' : '○'}
          </span>
          {/* Topic edit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditTopicName(topic.name);
              setEditTopicHours(topic.plannedHours);
              setExpanded(true);
              setEditingTopic((v) => !v);
            }}
            className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors px-1.5 py-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="トピックを編集"
          >
            <span className="hidden sm:inline">✎ 編集</span>
            <span className="sm:hidden">✎</span>
          </button>
          {/* Topic delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteTopic(); }}
            className="text-sm text-gray-400 hover:text-red-400 dark:hover:text-red-500 transition-colors px-1.5 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20"
            title="トピックを削除"
          >
            <span className="hidden sm:inline">削除</span>
            <span className="sm:hidden">✕</span>
          </button>
          <span className={cn('text-sm text-gray-400 transition-transform ml-0.5', expanded ? 'rotate-180' : '')}>▼</span>
        </div>
      </div>

      {/* ── Expanded detail ──────────────────────────────────────────────── */}
      {expanded && (
        <div
          className="bg-emerald-50 dark:bg-emerald-700/20 border-t border-emerald-300 dark:border-emerald-600 px-4 py-4 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress display */}
          <div className="rounded-lg bg-white/70 dark:bg-gray-900/60 border border-emerald-100 dark:border-emerald-900/50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                学習の進み具合（タスクから自動計算）
              </span>
              <span className={cn(
                'text-sm font-semibold tabular-nums',
                topic.completionPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400'
                  : topic.completionPercent > 0  ? 'text-amber-500'
                  : 'text-gray-400',
              )}>
                {topic.completionPercent}%
              </span>
            </div>
            <ProgressBar value={topic.completionPercent} className="h-2" />
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-1.5">
              {totalSubs > 0
                ? `タスク ${completedSubs} / ${totalSubs} 完了`
                : 'タスクを追加すると自動で計算されます'}
            </p>
          </div>

          {/* Task list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">タスク</span>
              <div className="flex items-center gap-2">
                {totalSubs > 0 && (
                  <span className="text-sm text-gray-400">{completedSubs}/{totalSubs} 完了</span>
                )}
                <button
                  onClick={() => { inputRef.current?.focus(); inputRef.current?.select(); }}
                  className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >＋ タスクを追加</button>
              </div>
            </div>

            <div className="space-y-1">
              {mainTasks.map((st) => (
                <TaskItem
                  key={st.id}
                  subtask={st}
                  taskType="main"
                  isEditing={editingSubId === st.id}
                  editValue={editSubName}
                  onToggle={() => handleToggleSub(st.id)}
                  onDelete={() => handleDeleteSub(st.id)}
                  onEditStart={() => { setEditingSubId(st.id); setEditSubName(st.name); }}
                  onEditChange={setEditSubName}
                  onEditSave={() => handleSaveSubEdit(st.id)}
                  onEditCancel={() => setEditingSubId(null)}
                />
              ))}

              {mainTasks.length > 0 && subTasks.length > 0 && (
                <div className="flex items-center gap-2 py-0.5">
                  <div className="flex-1 h-px bg-emerald-100 dark:bg-emerald-900/40" />
                  <span className="text-xs text-emerald-400/60 dark:text-emerald-700 shrink-0">サブタスク</span>
                  <div className="flex-1 h-px bg-emerald-100 dark:bg-emerald-900/40" />
                </div>
              )}

              {subTasks.map((st) => (
                <TaskItem
                  key={st.id}
                  subtask={st}
                  taskType="sub"
                  isEditing={editingSubId === st.id}
                  editValue={editSubName}
                  onToggle={() => handleToggleSub(st.id)}
                  onDelete={() => handleDeleteSub(st.id)}
                  onEditStart={() => { setEditingSubId(st.id); setEditSubName(st.name); }}
                  onEditChange={setEditSubName}
                  onEditSave={() => handleSaveSubEdit(st.id)}
                  onEditCancel={() => setEditingSubId(null)}
                />
              ))}

              {totalSubs === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-600 py-2 text-center">
                  タスクを追加してください
                </p>
              )}
            </div>

            {/* Add task row */}
            <div className="flex gap-2 mt-3 items-center">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 text-sm">
                {(['main', 'sub'] as TaskType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewTaskType(t)}
                    className={cn(
                      'px-2.5 py-1.5 font-medium transition-colors',
                      newTaskType === t
                        ? taskTypeStyles[t].activeBg
                        : 'bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                    )}
                  >
                    {taskTypeStyles[t].label}
                  </button>
                ))}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAddSubtask()}
                placeholder={topic.name}
                className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
              <Button size="sm" variant="secondary" onClick={handleAddSubtask}>追加</Button>
            </div>

            {newSubName === '' && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
                💡 タスクをさらに細かく登録すると、分析グラフがより正確になります。空欄のまま追加するとトピック名がそのまま使われます。
              </p>
            )}
          </div>

          {/* Topic inline edit form */}
          {editingTopic && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-gray-900/60 p-3 space-y-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">トピックを編集</span>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">トピック名</span>
                <input
                  autoFocus
                  type="text"
                  value={editTopicName}
                  onChange={(e) => setEditTopicName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSaveTopicEdit()}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>

              {/* Volume selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">ボリューム感</span>
                <div className="grid grid-cols-3 gap-2">
                  {VOLUME_OPTIONS.map((vol) => {
                    const hours = calcVolumeHours(weeklyHours, vol.coefficient);
                    const timeStr = formatVolumeTime(hours);
                    return (
                      <button
                        key={vol.id}
                        type="button"
                        onClick={() => {
                          setEditVolume(vol.id);
                          setEditTopicHours(Math.round(hours * 2) / 2 || 0.5);
                        }}
                        className={cn(
                          'text-left rounded-lg border p-2 transition-all',
                          editVolume === vol.id
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-800/40 dark:border-emerald-500 ring-1 ring-emerald-400 dark:ring-emerald-500'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700',
                        )}
                      >
                        <div className={cn(
                          'text-sm font-semibold',
                          editVolume === vol.id
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
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">予定時間 (h)</span>
                <input
                  type="number"
                  min={0.5} step={0.5}
                  value={editTopicHours}
                  onChange={(e) => { setEditTopicHours(Number(e.target.value)); setEditVolume(null); }}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  ※ 選択すると目安時間が自動入力されます。手動で微調整も可能です。
                </p>
              </label>

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setEditingTopic(false); setEditVolume(null); }}>キャンセル</Button>
                <Button size="sm" onClick={handleSaveTopicEdit}>保存</Button>
              </div>
            </div>
          )}

          {/* Actual hours + notes */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">実際に使った時間 (h)</span>
              <input
                type="number"
                min={0} step={0.5}
                value={topic.actualHours}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0) mutate({ actualHours: v });
                }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <div className="flex flex-col justify-end">
              <span className="text-sm text-gray-400">予定 {topic.plannedHours}h</span>
              <span className="text-sm text-gray-400">
                {topic.actualHours > topic.plannedHours
                  ? `予定より ${(topic.actualHours - topic.plannedHours).toFixed(1)}h 多くかかっています`
                  : `あと ${(topic.plannedHours - topic.actualHours).toFixed(1)}h 余裕あり`}
              </span>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">メモ</span>
            <textarea
              rows={2}
              value={topic.notes}
              onChange={(e) => mutate({ notes: e.target.value })}
              placeholder="気づき・補足を残す…"
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </label>

        </div>
      )}
    </div>
  );
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

interface TaskItemProps {
  subtask: Topic['subtasks'][number];
  taskType: TaskType;
  isEditing: boolean;
  editValue: string;
  onToggle: () => void;
  onDelete: () => void;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}

function TaskItem({
  subtask, taskType, isEditing, editValue,
  onToggle, onDelete, onEditStart, onEditChange, onEditSave, onEditCancel,
}: TaskItemProps) {
  const s = taskTypeStyles[taskType];
  const { completed } = subtask;

  return (
    <div className={cn('flex items-center gap-2 group', s.row)}>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch size="sm" checked={completed} onChange={onToggle} />
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.dot)} />
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) onEditSave();
              if (e.key === 'Escape') onEditCancel();
            }}
            onBlur={onEditSave}
            className="flex-1 min-w-0 text-sm px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
          />
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer select-none"
          onClick={onToggle}
          onDoubleClick={(e) => { e.stopPropagation(); onEditStart(); }}
          title="ダブルクリックで編集"
        >
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', completed ? 'opacity-30' : '', s.dot)} />
          <span className={cn(s.text, completed && 'line-through opacity-40')}>
            {subtask.name}
          </span>
        </div>
      )}

      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEditStart(); }}
            className="text-sm text-gray-400 hover:text-emerald-500 dark:text-gray-500 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title="タスクを編集"
          >✎ 編集</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-sm text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="タスクを削除"
          >削除</button>
        </div>
      )}
    </div>
  );
}
