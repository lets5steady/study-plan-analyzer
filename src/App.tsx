import { useState } from 'react';
import './index.css';

import { ThemeProvider } from './context/ThemeContext';
import { StorageProvider } from './context/StorageContext';
import { useStorageContext } from './context/StorageContext';
import { useEVM } from './hooks/useEVM';

import { Header } from './components/layout/Header';
import { MetricsPanel } from './components/dashboard/MetricsPanel';
import { SubjectCard } from './components/tasks/SubjectCard';
import { AddSubjectModal } from './components/tasks/AddSubjectModal';
import { BurnupChart } from './components/charts/BurnupChart';
import { EfficiencyChart } from './components/charts/EfficiencyChart';
import { Button } from './components/ui';

import { buildSampleData } from './utils/sampleData';

type Tab = 'dashboard' | 'tasks' | 'analytics';

// ─── Inner app (needs StorageProvider in tree) ────────────────────────────────

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [addOpen, setAddOpen] = useState(false);
  const { data, setData, resetData, exportJSON, importJSON } = useStorageContext();
  const { regenerateSchedule } = useEVM();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importJSON(file);
    e.target.value = '';
  };

  const loadSample = () => {
    const sample = buildSampleData();
    setData(sample);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── ダッシュボード ─────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">ダッシュボード</h1>
              {data.subjects.length === 0 && (
                <Button size="sm" variant="secondary" onClick={loadSample}>
                  サンプルデータを読み込む
                </Button>
              )}
              {data.subjects.length > 0 && data.schedule.length === 0 && (
                <Button size="sm" variant="secondary" onClick={regenerateSchedule}>
                  スケジュール生成
                </Button>
              )}
            </div>
            <MetricsPanel
              onNavigate={setActiveTab}
              onReschedule={regenerateSchedule}
            />

            {/* Import / Export */}
            <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">データのバックアップ・復元</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={exportJSON}>
                  エクスポート
                </Button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                  インポート
                  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
              </div>
            </div>
          </section>
        )}

        {/* ── タスク管理 ──────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">タスク管理</h1>
              <div className="flex gap-2">
                {data.subjects.length === 0 && (
                  <Button size="sm" variant="ghost" onClick={loadSample}>
                    サンプルデータ
                  </Button>
                )}
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  + プロジェクトを追加
                </Button>
              </div>
            </div>

            {data.subjects.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-14 h-14 mb-4 mx-auto text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  プロジェクトを追加して学習計画を始めましょう
                </p>
                <Button onClick={() => setAddOpen(true)}>プロジェクトを追加する</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.subjects.map((s) => (
                  <SubjectCard key={s.id} subjectId={s.id} />
                ))}
              </div>
            )}

            <AddSubjectModal open={addOpen} onClose={() => setAddOpen(false)} />
          </section>
        )}

        {/* ── 詳細分析 ──────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">詳細分析</h1>
              {data.schedule.length === 0 && data.subjects.length > 0 && (
                <Button size="sm" variant="secondary" onClick={regenerateSchedule}>
                  スケジュール生成
                </Button>
              )}
            </div>

            {data.subjects.length === 0 ? (
              <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                <svg className="w-12 h-12 mb-3 mx-auto text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                <p className="text-sm">プロジェクトを追加するとグラフが表示されます</p>
              </div>
            ) : (
              <>
                {/* Burnup chart */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                      目標ペースとの比較
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      累積進捗グラフ： 計画（緑）と実績（オレンジ）の比較です。線がエリアに重なるほど計画通り、エリアより上なら予定を前倒しで進めています。
                    </p>
                  </div>
                  <BurnupChart />
                </div>

                {/* Efficiency chart */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                      日ごとの達成状況
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      デイリー実績： 1日の目標時間（点線）に対する達成度です。目標達成日は緑、未達成日はオレンジで色分けされます。
                    </p>
                  </div>
                  <EfficiencyChart />
                </div>

                {/* Reset section */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm('全データを初期化しますか？この操作は取り消せません。')) {
                        resetData();
                      }
                    }}
                  >
                    全データをリセット
                  </Button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Root with providers ──────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <StorageProvider>
        <AppContent />
      </StorageProvider>
    </ThemeProvider>
  );
}
