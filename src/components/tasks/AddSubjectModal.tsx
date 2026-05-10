import { useState } from 'react';
import { useStorageContext } from '../../context/StorageContext';
import { Modal, Button, Field } from '../ui';
import { cn } from '../../utils/cn';
import { LEARNING_MODES, type LearningModeId } from '../../utils/learningModes';
import type { Subject } from '../../types';

const COLORS = [
  '#56A3A1', '#70A1AD', '#CB855D', '#D17A7A',
  '#8A82B8', '#B882A8', '#4D9E7A', '#C9A84A',
];

interface AddSubjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddSubjectModal({ open, onClose }: AddSubjectModalProps) {
  const { data, updateData } = useStorageContext();
  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [color, setColor]                 = useState(COLORS[0]);
  const [examDate, setExamDate]           = useState('');
  const [plannedStart, setPlannedStart]   = useState(new Date().toISOString().slice(0, 10));
  const [weeklyHours, setWeeklyHours]     = useState(7);
  const [selectedMode, setSelectedMode]   = useState<LearningModeId | null>('standard');

  const reset = () => {
    setName(''); setDescription(''); setColor(COLORS[0]);
    setExamDate(''); setWeeklyHours(7); setSelectedMode('standard');
    setPlannedStart(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const subject: Subject = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      color,
      examDate: examDate || null,
      plannedStartDate: plannedStart,
      topics: [],
      status: 'not_started',
      targetHoursPerWeek: weeklyHours,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData({ subjects: [...data.subjects, subject] });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="プロジェクトを追加"
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>追加する</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="プロジェクト名 *"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：React 入門 / JavaScript 基礎"
          autoFocus
        />
        <Field
          label="説明"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例：コンポーネント設計 &amp; Hooks をマスター"
        />

        {/* Color picker */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">カラー</span>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: color === c ? `3px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="学習開始日"
            type="date"
            value={plannedStart}
            onChange={(e) => setPlannedStart(e.target.value)}
          />
          <Field
            label="目標完了日（任意）"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>

        {/* Learning mode selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">学習モード</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LEARNING_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => { setSelectedMode(mode.id); setWeeklyHours(mode.weeklyHours); }}
                className={cn(
                  'text-left rounded-xl border p-2.5 transition-all',
                  selectedMode === mode.id
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 dark:border-emerald-600 ring-1 ring-emerald-400 dark:ring-emerald-600'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900',
                )}
              >
                <div className={cn(
                  'text-sm font-semibold mb-1',
                  selectedMode === mode.id
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-800 dark:text-gray-200',
                )}>
                  {mode.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                  {mode.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly hours — manual override */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            週間目標時間 (h)
          </label>
          <input
            type="number"
            min={1}
            step={0.5}
            value={weeklyHours}
            onChange={(e) => { setWeeklyHours(Number(e.target.value)); setSelectedMode(null); }}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-600">
            ※ 上のモードを選ぶと自動入力されます。手動で微調整も可能です。
          </p>
        </div>
      </div>
    </Modal>
  );
}
