import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useStorageContext } from '../../context/StorageContext';
import { useEVM } from '../../hooks/useEVM';
import { buildBurnupData } from '../../utils/chartData';
import { useMemo } from 'react';

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

export function BurnupChart() {
  const { data } = useStorageContext();
  const { totalMetrics } = useEVM();

  const chartData = useMemo(
    () => buildBurnupData(data.schedule, data.sessions),
    [data.schedule, data.sessions],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
        スケジュールを生成するとグラフが表示されます
      </div>
    );
  }

  const bac = totalMetrics.bac;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={280}>
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

        {/* BAC reference */}
        {bac > 0 && (
          <ReferenceLine
            y={bac}
            stroke="#70A1AD"
            strokeDasharray="5 3"
            label={{ value: `目標 ${bac.toFixed(0)}h`, position: 'insideTopRight', fontSize: 11, fill: '#70A1AD' }}
          />
        )}

        {/* Today reference */}
        <ReferenceLine
          x={todayStr}
          stroke="#D1D9D8"
          strokeDasharray="3 3"
          label={{ value: '今日', position: 'insideTopLeft', fontSize: 11, fill: '#9AABAA' }}
        />

        {/* Planned value (shaded area) */}
        <Area
          type="monotone"
          dataKey="pv"
          name="理想の進み方（計画）"
          stroke="#79BABA"
          fill="#D8ECEA"
          fillOpacity={0.6}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />

        {/* Actual cost line */}
        <Line
          type="monotone"
          dataKey="ac"
          name="あなたの実績"
          stroke="#CB855D"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
