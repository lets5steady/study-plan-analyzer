import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { useStorageContext } from '../../context/StorageContext';
import { buildEfficiencyData } from '../../utils/chartData';
import { useMemo } from 'react';

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

export function EfficiencyChart() {
  const { data } = useStorageContext();

  const chartData = useMemo(
    () => buildEfficiencyData(data.schedule, data.sessions),
    [data.schedule, data.sessions],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
        学習セッションを記録するとグラフが表示されます
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit="h"
          width={36}
        />
        <Tooltip
          formatter={(v) => [`${(v as number).toFixed(1)}h`]}
          labelFormatter={(l) => fmtDate(l as string)}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />

        {/* Planned hours reference line per day */}
        <Line
          type="monotone"
          dataKey="planned"
          name="その日の目標時間"
          stroke="#D1D9D8"
          strokeDasharray="4 2"
          strokeWidth={1.5}
          dot={false}
        />

        {/* Actual hours bars — teal if met/exceeded plan, terra cotta if below */}
        <Bar dataKey="actual" name="実際に勉強した時間" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.actual >= entry.planned ? '#56A3A1' : '#CB855D'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
