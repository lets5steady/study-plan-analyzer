import { useTheme } from '../../context/ThemeContext';
import { useStorageContext } from '../../context/StorageContext';
import { Button } from '../ui';
import { cn } from '../../utils/cn';

type Tab = 'dashboard' | 'tasks' | 'analytics';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード', icon: '◎' },
  { id: 'tasks',     label: 'タスク管理',     icon: '☑' },
  { id: 'analytics', label: '詳細分析',       icon: '▲' },
];

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { exportJSON, importJSON } = useStorageContext();

  const toggleTheme = () =>
    setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');

  const themeLabel = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importJSON(file);
    e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm select-none">
            S
          </span>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 hidden sm:block">
            Study Plan Analyzer
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex gap-0.5 flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === t.id
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60',
              )}
            >
              <span className="text-xs">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={toggleTheme} title="テーマ切替">
            {themeLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={exportJSON} title="JSONエクスポート">
            <span className="hidden sm:inline">↑ Export</span>
            <span className="sm:hidden">↑</span>
          </Button>
          <label title="JSONインポート" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="hidden sm:inline">↓ Import</span>
            <span className="sm:hidden">↓</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>
    </header>
  );
}
