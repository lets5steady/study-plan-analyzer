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

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0〜12
const MIN_OPTIONS  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
}

/** totalMinutes → "1h 20m" 形式 */
function fmtDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** 分から (時, 分) へ変換。分は 5 分刻みにスナップ */
function minsToHM(totalMinutes: number): { h: number; m: number } {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.min(55, Math.round((totalMinutes % 60) / 5) * 5);
  return { h, m };
}

// ─── Duration picker ──────────────────────────────────────────────────────────

interface DurationPickerProps {
  h: number;
  m: number;
  onHChange: (v: number) => void;
  onMChange: (v: number) => void;
}

function DurationPicker({ h, m, onHChange, onMChange }: DurationPickerProps) {
  const totalMins = h * 60 + m;

  const selectCls =
    'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ' +
    'px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 ' +
    'focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ' +
    'appearance-none text-center min-w-[72px]';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">学習時間</span>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Hours */}
        <div className="flex items-center gap-1">
          <select
            value={h}
            onChange={(e) => onHChange(Number(e.target.value))}
            className={selectCls}
            aria-label="時間"
          >
            {HOUR_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">h</span>
        </div>

        {/* Minutes */}
        <div className="flex items-center gap-1">
          <select
            value={m}
            onChange={(e) => onMChange(Number(e.target.value))}
            className={selectCls}
            aria-label="分"
          >
            {MIN_OPTIONS.map((n) => (
              <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">m</span>
        </div>

        {/* Live total */}
        {totalMins > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            合計 {totalMins} 分
          </span>
        )}
      </div>

      {/* Validation hint */}
      {totalMins === 0 && (
        <p className="text-xs text-red-400">1 分以上を入力してください</p>
      )}
    </div>
  );
}

// ─── Session form ─────────────────────────────────────────────────────────────

interface SessionFormProps {
  isEdit: boolean;
  date: string;
  h: number;
  m: number;
  memo: string;
  onDateChange: (v: string) => void;
  onHChange: (v: number) => void;
  onMChange: (v: number) => void;
  onMemoChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function SessionForm({
  isEdit, date, h, m, memo,
  onDateChange, onHChange, onMChange, onMemoChange,
  onSubmit, onCancel,
}: SessionFormProps) {
  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-gray-900/60 p-3 space-y-3">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {isEdit ? '記録を編集' : '学習を記録'}
      </span>

      {/* Date */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">日付</span>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>

      {/* Duration picker */}
      <DurationPicker h={h} m={m} onHChange={onHChange} onMChange={onMChange} />

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
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={h * 60 + m === 0}
        >
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
            {fmtDuration(session.actualDurationMinutes)}
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

  const sessions = data.sessions
    .filter((s) => s.topicId === topicId && s.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const totalMins  = sessions.reduce((sum, s) => sum + s.actualDurationMinutes, 0);
  const totalHours = totalMins / 60;

  // Form state
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate]   = useState(todayStr);
  const [formH, setFormH]         = useState(1);
  const [formM, setFormM]         = useState(0);
  const [formMemo, setFormMemo]   = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormDate(todayStr());
    setFormH(1);
    setFormM(0);
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
    const minutes = formH * 60 + formM;
    if (!formDate || minutes <= 0) return;
    const newSession: StudySession = {
      id: crypto.randomUUID(),
      subjectId,
      topicId,
      date: formDate,
      plannedDurationMinutes: minutes,
      actualDurationMinutes: minutes,
      status: 'completed',
      difficulty: 3,
      memo: formMemo.trim(),
      createdAt: new Date().toISOString(),
    };
    commitSessions(addSession(data.sessions, newSession));
    resetForm();
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const startEdit = (session: StudySession) => {
    const { h, m } = minsToHM(session.actualDurationMinutes);
    setEditingId(session.id);
    setFormDate(session.date);
    setFormH(h);
    setFormM(m);
    setFormMemo(session.memo);
    setShowForm(true);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const minutes = formH * 60 + formM;
    if (minutes <= 0) return;
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
      {/* Header */}
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
              {fmtDuration(totalMins)}
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
                ? `+${fmtDuration(Math.round((totalHours - plannedHours) * 60))} オーバー`
                : `残り ${fmtDuration(Math.round((plannedHours - totalHours) * 60))}`}
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

      {/* Form */}
      {showForm && (
        <SessionForm
          isEdit={editingId !== null}
          date={formDate}
          h={formH}
          m={formM}
          memo={formMemo}
          onDateChange={setFormDate}
          onHChange={setFormH}
          onMChange={setFormM}
          onMemoChange={setFormMemo}
          onSubmit={editingId ? handleSaveEdit : handleAdd}
          onCancel={resetForm}
        />
      )}

      {/* History */}
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
