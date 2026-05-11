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
import type { StudySession, Difficulty } from '../../types';

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
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'とても簡単',
  2: '簡単',
  3: '普通',
  4: '難しい',
  5: 'とても難しい',
};

// ─── Session form ─────────────────────────────────────────────────────────────

interface SessionFormProps {
  isEdit: boolean;
  date: string;
  hours: number;
  memo: string;
  difficulty: Difficulty;
  onDateChange: (v: string) => void;
  onHoursChange: (v: number) => void;
  onMemoChange: (v: string) => void;
  onDifficultyChange: (v: Difficulty) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function SessionForm({
  isEdit, date, hours, memo, difficulty,
  onDateChange, onHoursChange, onMemoChange, onDifficultyChange,
  onSubmit, onCancel,
}: SessionFormProps) {
  const max = todayStr();

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-gray-900/60 p-3 space-y-3">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {isEdit ? '記録を編集' : '学習を記録'}
      </span>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">日付</span>
          <input
            type="date"
            value={date}
            max={max}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">学習時間 (h)</span>
          <input
            type="number"
            min={0.25} step={0.25} max={24}
            value={hours}
            onChange={(e) => onHoursChange(Math.max(0.25, Number(e.target.value)))}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
          />
        </label>
      </div>

      {/* Difficulty */}
      <div>
        <span className="text-xs text-gray-500 dark:text-gray-400">難易度</span>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDifficultyChange(d)}
              className={cn(
                'w-7 h-7 rounded text-sm font-medium transition-colors',
                difficulty >= d
                  ? 'bg-amber-400 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600',
              )}
              title={DIFFICULTY_LABELS[d]}
            >
              ★
            </button>
          ))}
          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">メモ（任意）</span>
        <input
          type="text"
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          placeholder="今日気づいたことなど…"
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
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
          {session.difficulty && (
            <span className="text-xs text-amber-400 shrink-0" title={DIFFICULTY_LABELS[session.difficulty]}>
              {'★'.repeat(session.difficulty)}
              <span className="text-gray-200 dark:text-gray-700">{'★'.repeat(5 - session.difficulty)}</span>
            </span>
          )}
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate]           = useState(todayStr);
  const [formHours, setFormHours]         = useState(1);
  const [formMemo, setFormMemo]           = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>(3);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormDate(todayStr());
    setFormHours(1);
    setFormMemo('');
    setFormDifficulty(3);
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
      difficulty: formDifficulty,
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
    setFormDifficulty(session.difficulty);
    setShowForm(true);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const minutes = Math.round(formHours * 60);
    const newSessions = updateSession(data.sessions, editingId, {
      date: formDate,
      actualDurationMinutes: minutes,
      plannedDurationMinutes: minutes,
      memo: formMemo.trim(),
      difficulty: formDifficulty,
    });
    commitSessions(newSessions);
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
        <div className="flex items-center gap-2">
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
          difficulty={formDifficulty}
          onDateChange={setFormDate}
          onHoursChange={setFormHours}
          onMemoChange={setFormMemo}
          onDifficultyChange={setFormDifficulty}
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
