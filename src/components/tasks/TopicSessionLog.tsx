import { useState } from 'react';
import { useStorageContext } from '../../context/StorageContext';
import { Button } from '../ui';
import { cn } from '../../utils/cn';
import {
  addSession,
  updateSession,
  deleteSession,
  syncTopicActualHours,
} from '../../utils/mutations';
import type { StudySession } from '../../types';

// ─── Duration presets ─────────────────────────────────────────────────────────

interface DurationPreset {
  hours: number;
  label: string;   // "1.5h（90分）"
}

const DURATION_PRESETS: DurationPreset[] = [
  { hours: 0.25, label: '0.25h（15分）' },
  { hours: 0.5,  label: '0.5h（30分）'  },
  { hours: 0.75, label: '0.75h（45分）' },
  { hours: 1,    label: '1h（60分）'    },
  { hours: 1.5,  label: '1.5h（90分）'  },
  { hours: 2,    label: '2h（120分）'   },
  { hours: 2.5,  label: '2.5h（150分）' },
  { hours: 3,    label: '3h（180分）'   },
  { hours: 4,    label: '4h（240分）'   },
  { hours: 5,    label: '5h（300分）'   },
];

const CUSTOM_VALUE = '__custom__';

/** hours が presets に含まれるか判定 */
function isPreset(hours: number): boolean {
  return DURATION_PRESETS.some((p) => p.hours === hours);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
}

function fmtHours(minutes: number): string {
  const h = minutes / 60;
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(2).replace(/\.?0+$/, '')}h`;
}

/** hours → "Xh（Y分）" */
function hLabel(hours: number): string {
  const mins = Math.round(hours * 60);
  const hStr = hours % 1 === 0 ? `${hours}h` : `${hours}h`;
  return `${hStr}（${mins}分）`;
}

// ─── Duration input (dropdown + direct) ──────────────────────────────────────

interface DurationInputProps {
  hours: number;
  onChange: (v: number) => void;
}

function DurationInput({ hours, onChange }: DurationInputProps) {
  const selectVal = isPreset(hours) ? String(hours) : CUSTOM_VALUE;
  const mins = Math.round(hours * 60);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value !== CUSTOM_VALUE) {
      onChange(Number(e.target.value));
    }
    // カスタム選択時はテキスト入力欄で直接変更してもらう
  };

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) onChange(v);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">学習時間</span>

      {/* Dropdown */}
      <select
        value={selectVal}
        onChange={handleSelect}
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {DURATION_PRESETS.map((p) => (
          <option key={p.hours} value={String(p.hours)}>{p.label}</option>
        ))}
        {!isPreset(hours) && (
          <option value={CUSTOM_VALUE}>{hLabel(hours)}（カスタム）</option>
        )}
        <option value={CUSTOM_VALUE}>その他（直接入力）</option>
      </select>

      {/* Direct number input — always visible */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0.25} step={0.25} max={24}
          value={hours}
          onChange={handleDirectInput}
          className="w-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
        />
        <span className="text-xs text-gray-400 dark:text-gray-500">h（{mins}分）</span>
      </div>
    </div>
  );
}

// ─── Session form ─────────────────────────────────────────────────────────────

interface SessionFormProps {
  isEdit: boolean;
  date: string;
  hours: number;
  memo: string;
  onDateChange: (v: string) => void;
  onHoursChange: (v: number) => void;
  onMemoChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function SessionForm({
  isEdit, date, hours, memo,
  onDateChange, onHoursChange, onMemoChange,
  onSubmit, onCancel,
}: SessionFormProps) {
  const max = todayStr();

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-gray-900/60 p-3 space-y-3">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {isEdit ? '記録を編集' : '学習を記録'}
      </span>

      <div className="grid grid-cols-2 gap-3">
        {/* Date */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">日付</span>
          <input
            type="date"
            value={date}
            max={max}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        {/* Duration */}
        <DurationInput hours={hours} onChange={onHoursChange} />
      </div>

      {/* Memo */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">メモ（任意）</span>
        <input
          type="text"
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          placeholder="今日気づいたことなど…"
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      </label>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>キャンセル</Button>
        <Button size="sm" onClick={onSubmit}>
          {isEdit ? '保存' : '記録する'}
        </Button>
      </div>
    </div>
  );
}

// ─── Session list item ────────────────────────────────────────────────────────

interface SessionItemProps {
  session: StudySession;
  onEdit: () => void;
  onDelete: () => void;
}

function SessionItem({ session, onEdit, onDelete }: SessionItemProps) {
  return (
    <div className="flex items-start gap-2 bg-white/60 dark:bg-gray-900/40 rounded-lg px-3 py-2.5 border border-gray-100 dark:border-gray-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {fmtDate(session.date)}
          </span>
          <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
            {fmtHours(session.actualDurationMinutes)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            （{session.actualDurationMinutes}分）
          </span>
        </div>
        {session.memo && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{session.memo}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="text-xs text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 px-1.5 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          ✎ 編集
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          削除
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TopicSessionLogProps {
  topicId: string;
  subjectId: string;
  plannedHours: number;
}

export function TopicSessionLog({ topicId, subjectId, plannedHours }: TopicSessionLogProps) {
  const { data, updateData } = useStorageContext();

  // Sessions for this topic only, newest-first
  const sessions = data.sessions
    .filter((s) => s.topicId === topicId && s.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const totalHours = sessions.reduce((sum, s) => sum + s.actualDurationMinutes / 60, 0);

  // Form state
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [formDate, setFormDate]     = useState(todayStr);
  const [formHours, setFormHours]   = useState(1);
  const [formMemo, setFormMemo]     = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormDate(todayStr());
    setFormHours(1);
    setFormMemo('');
  };

  const commitSessions = (newSessions: StudySession[]) => {
    updateData({
      sessions: newSessions,
      subjects: syncTopicActualHours(data.subjects, subjectId, topicId, newSessions),
    });
  };

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!formDate || formHours <= 0) return;
    const minutes = Math.round(formHours * 60);
    const newSession: StudySession = {
      id: crypto.randomUUID(),
      subjectId,
      topicId,
      date: formDate,
      plannedDurationMinutes: minutes,
      actualDurationMinutes: minutes,
      status: 'completed',
      difficulty: 3,   // 内部デフォルト（UIでは非表示）
      memo: formMemo.trim(),
      createdAt: new Date().toISOString(),
    };
    commitSessions(addSession(data.sessions, newSession));
    resetForm();
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const startEdit = (session: StudySession) => {
    setEditingId(session.id);
    setFormDate(session.date);
    setFormHours(session.actualDurationMinutes / 60);
    setFormMemo(session.memo);
    setShowForm(true);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const minutes = Math.round(formHours * 60);
    commitSessions(
      updateSession(data.sessions, editingId, {
        date: formDate,
        actualDurationMinutes: minutes,
        plannedDurationMinutes: minutes,
        memo: formMemo.trim(),
      }),
    );
    resetForm();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (sessionId: string) => {
    commitSessions(deleteSession(data.sessions, sessionId));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">学習記録</span>
          <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
            累計{' '}
            <span className={cn(
              'font-semibold',
              totalHours > plannedHours
                ? 'text-amber-600 dark:text-amber-400'
                : totalHours > 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400',
            )}>
              {totalHours.toFixed(1)}h
            </span>
            {' '}／ 予定 {plannedHours}h
          </span>
          {totalHours > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              totalHours > plannedHours
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            )}>
              {totalHours > plannedHours
                ? `+${(totalHours - plannedHours).toFixed(1)}h オーバー`
                : `残り ${(plannedHours - totalHours).toFixed(1)}h`}
            </span>
          )}
        </div>
        {!showForm && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            ＋ 今日の分を記録
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <SessionForm
          isEdit={editingId !== null}
          date={formDate}
          hours={formHours}
          memo={formMemo}
          onDateChange={setFormDate}
          onHoursChange={setFormHours}
          onMemoChange={setFormMemo}
          onSubmit={editingId ? handleSaveEdit : handleAdd}
          onCancel={resetForm}
        />
      )}

      {/* Session history */}
      {sessions.length > 0 ? (
        <div className="space-y-1.5">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onEdit={() => startEdit(session)}
              onDelete={() => handleDelete(session.id)}
            />
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-2">
            まだ記録がありません。「今日の分を記録」から始めましょう。
          </p>
        )
      )}
    </div>
  );
}
