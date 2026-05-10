import type { AppData, WeeklyWorkPattern } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { generateSchedule } from './scheduler';

function uid() {
  return crypto.randomUUID();
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoNow() {
  return new Date().toISOString();
}

export function buildSampleData(): AppData {
  // ── IDs ────────────────────────────────────────────────────────
  const jsId     = uid();
  const reactId  = uid();

  // JS topic IDs
  const jsT0 = uid(); // 変数・データ型     completed
  const jsT1 = uid(); // 関数・スコープ     in_progress (3/5 tasks = 60%)
  const jsT2 = uid(); // 非同期処理         not_started
  const jsT3 = uid(); // DOM操作            not_started
  const jsT4 = uid(); // モジュール・ツール  not_started

  // React topic IDs
  const rtT0 = uid(); // JSX & コンポーネント completed
  const rtT1 = uid(); // useState/useEffect  in_progress (3/5 tasks = 60%)
  const rtT2 = uid(); // カスタムフック       not_started
  const rtT3 = uid(); // React Router        not_started

  // ── Topics ────────────────────────────────────────────────────
  const jsTopics = [
    {
      id: jsT0,
      name: '変数・データ型・演算子',
      plannedHours: 4,
      earnedHours: 4,
      actualHours: 3.5,
      completionPercent: 100,
      status: 'completed' as const,
      subtasks: [
        { id: uid(), name: 'let / const / var の違いを理解', completed: true,  order: 0, type: 'main' as const },
        { id: uid(), name: '型変換の演習 (10問)',             completed: true,  order: 1, type: 'sub'  as const },
      ],
      notes: 'スコープの概念をしっかり押さえた。',
      order: 0,
    },
    {
      id: jsT1,
      name: '関数・スコープ・クロージャ',
      plannedHours: 6,
      earnedHours: 3.6,
      actualHours: 5.0,
      completionPercent: 60,           // 3/5 subtasks = 60%
      status: 'in_progress' as const,
      subtasks: [
        { id: uid(), name: 'アロー関数の書き方',        completed: true,  order: 0, type: 'main' as const },
        { id: uid(), name: 'デフォルト引数・残余引数',  completed: true,  order: 1, type: 'main' as const },
        { id: uid(), name: 'スコープとホイスティング',  completed: true,  order: 2, type: 'main' as const },
        { id: uid(), name: 'クロージャのハンズオン',    completed: false, order: 3, type: 'sub'  as const },
        { id: uid(), name: '高階関数・練習問題10問',    completed: false, order: 4, type: 'sub'  as const },
      ],
      notes: '高階関数の概念を要復習。',
      order: 1,
    },
    {
      id: jsT2,
      name: '非同期処理 (Promise / async・await)',
      plannedHours: 7,
      earnedHours: 0,
      actualHours: 0,
      completionPercent: 0,
      status: 'not_started' as const,
      subtasks: [
        { id: uid(), name: 'Promiseチェーンの理解',  completed: false, order: 0 },
        { id: uid(), name: 'fetch APIを使った演習',  completed: false, order: 1 },
      ],
      notes: '',
      order: 2,
    },
    {
      id: jsT3,
      name: 'DOM操作 & イベント',
      plannedHours: 5,
      earnedHours: 0,
      actualHours: 0,
      completionPercent: 0,
      status: 'not_started' as const,
      subtasks: [],
      notes: '',
      order: 3,
    },
    {
      id: jsT4,
      name: 'モジュール・ツール (ES Modules / Vite)',
      plannedHours: 4,
      earnedHours: 0,
      actualHours: 0,
      completionPercent: 0,
      status: 'not_started' as const,
      subtasks: [],
      notes: '',
      order: 4,
    },
  ];

  const reactTopics = [
    {
      id: rtT0,
      name: 'JSX & コンポーネント基礎',
      plannedHours: 4,
      earnedHours: 4,
      actualHours: 3.5,
      completionPercent: 100,
      status: 'completed' as const,
      subtasks: [
        { id: uid(), name: 'props の受け渡し練習',         completed: true, order: 0, type: 'main' as const },
        { id: uid(), name: '関数コンポーネントで UI 作成', completed: true, order: 1, type: 'sub'  as const },
      ],
      notes: '',
      order: 0,
    },
    {
      id: rtT1,
      name: 'useState / useEffect',
      plannedHours: 6,
      earnedHours: 3.6,
      actualHours: 4.5,
      completionPercent: 60,           // 3/5 subtasks = 60%
      status: 'in_progress' as const,
      subtasks: [
        { id: uid(), name: 'カウンターアプリ作成',          completed: true,  order: 0, type: 'sub'  as const },
        { id: uid(), name: 'フォームの状態管理',            completed: true,  order: 1, type: 'main' as const },
        { id: uid(), name: 'useEffectの依存配列理解',       completed: true,  order: 2, type: 'main' as const },
        { id: uid(), name: 'APIデータのフェッチ実装',       completed: false, order: 3, type: 'sub'  as const },
        { id: uid(), name: 'クリーンアップ関数のハンズオン', completed: false, order: 4, type: 'sub'  as const },
      ],
      notes: 'クリーンアップ関数のタイミングを確認中。',
      order: 1,
    },
    {
      id: rtT2,
      name: 'カスタムフック & Context',
      plannedHours: 7,
      earnedHours: 0,
      actualHours: 0,
      completionPercent: 0,
      status: 'not_started' as const,
      subtasks: [
        { id: uid(), name: 'useFetch フックを自作',         completed: false, order: 0 },
        { id: uid(), name: 'グローバル状態管理の実装',      completed: false, order: 1 },
      ],
      notes: '',
      order: 2,
    },
    {
      id: rtT3,
      name: 'React Router & ページ遷移',
      plannedHours: 5,
      earnedHours: 0,
      actualHours: 0,
      completionPercent: 0,
      status: 'not_started' as const,
      subtasks: [],
      notes: '',
      order: 3,
    },
  ];

  // ── Subjects ──────────────────────────────────────────────────
  const subjects = [
    {
      id: jsId,
      name: 'JavaScript 基礎',
      description: 'ES2022+ モダン構文をマスター',
      color: '#56A3A1',
      examDate: isoDate(60),
      plannedStartDate: isoDate(-30),
      topics: jsTopics,
      status: 'in_progress' as const,
      targetHoursPerWeek: 10,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    },
    {
      id: reactId,
      name: 'React 入門',
      description: 'コンポーネント設計 & Hooks',
      color: '#70A1AD',
      examDate: isoDate(45),
      plannedStartDate: isoDate(-30),
      topics: reactTopics,
      status: 'in_progress' as const,
      targetHoursPerWeek: 8,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    },
  ];

  // ── Schedule (PV) ─────────────────────────────────────────────
  // Generate full schedule from 30 days ago using a flat 1 h/weekday pattern.
  // We pass "clean" topics (all not_started, completionPercent=0) so the
  // scheduler covers the entire BAC (48 h) from the start date, giving
  // a smooth PV ramp on the burnup chart.
  const schedulePattern: WeeklyWorkPattern = {
    0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0, // Mon–Fri 1h each
  };
  const scheduleStart = new Date();
  scheduleStart.setDate(scheduleStart.getDate() - 30);

  const subjectsForSchedule = subjects.map((s) => ({
    ...s,
    status: 'not_started' as const,
    plannedStartDate: isoDate(-30), // both start from day-30 so nothing is deferred
    topics: s.topics.map((t) => ({
      ...t,
      completionPercent: 0,
      status: 'not_started' as const,
      earnedHours: 0,
    })),
  }));

  const schedule = generateSchedule(subjectsForSchedule, schedulePattern, scheduleStart);

  // ── Sessions (AC) — "human-like learning wave" ──────────────
  //
  //   Days −14 to −11 : slow start   (below plan)
  //   Days −10 to  −7 : stagnation   (one day skipped, minimal effort)
  //   Days  −6 to  −3 : recovery     (back on track)
  //   Days  −2 to  −1 : surge        (well above plan, catching up)

  const sess = (
    subjectId: string,
    topicId: string,
    dayOffset: number,
    minutes: number,
  ): AppData['sessions'][number] => ({
    id: uid(),
    subjectId,
    topicId,
    date: isoDate(dayOffset),
    plannedDurationMinutes: 60,
    actualDurationMinutes: minutes,
    status: 'completed',
    difficulty: 3,
    memo: '',
    createdAt: isoNow(),
  });

  const sessions: AppData['sessions'] = [
    // ── 序盤の遅れ (days −14 to −11) ─────────────────────────────
    sess(jsId,    jsT0, -14,  45),  // slow 45 min JS
    sess(reactId, rtT0, -14,  30),  // brief React warmup
    sess(jsId,    jsT0, -13,  50),  // JS only
    sess(jsId,    jsT1, -12,  65),  // JS, bit longer
    sess(reactId, rtT0, -12,  25),  // short React
    sess(jsId,    jsT1, -11,  40),  // JS trailing off

    // ── 中盤の停滞 (days −10 to −7) ──────────────────────────────
    sess(jsId,    jsT1, -10,  20),  // barely studied
    // day −9: no session (skipped)
    sess(reactId, rtT1,  -8,  40),  // React only, short
    sess(jsId,    jsT1,  -7,  20),  // bare minimum

    // ── 終盤の追い上げ (days −6 to −3) ───────────────────────────
    sess(jsId,    jsT1,  -6,  90),
    sess(reactId, rtT1,  -6,  55),
    sess(jsId,    jsT1,  -5, 110),
    sess(jsId,    jsT2,  -4,  70),
    sess(reactId, rtT1,  -4,  60),
    sess(jsId,    jsT2,  -3,  60),
    sess(reactId, rtT1,  -3,  60),

    // ── 直近の集中学習サージ (days −2 to −1) ─────────────────────
    sess(jsId,    jsT2,  -2, 150),
    sess(reactId, rtT1,  -2, 120),
    sess(jsId,    jsT2,  -1, 180),
    sess(reactId, rtT1,  -1, 150),
  ];

  return {
    version: '1.0.0',
    settings: DEFAULT_SETTINGS,
    subjects,
    sessions,
    schedule,
  };
}
