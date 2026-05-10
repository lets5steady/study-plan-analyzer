export const LEARNING_MODES = [
  {
    id: 'short' as const,
    label: '短期集中',
    weeklyHours: 17.5,
    description: '週15〜20時間。試験直前や転職活動など、最優先で進めたい時に。',
  },
  {
    id: 'standard' as const,
    label: '標準・着実',
    weeklyHours: 7.0,
    description: '週7〜10時間。仕事と両立しながら、毎日1時間程度の習慣化に。',
  },
  {
    id: 'relaxed' as const,
    label: 'ゆったり',
    weeklyHours: 3.5,
    description: '週3〜5時間。無理のない範囲で、趣味や隙間時間で進めたい時に。',
  },
] as const;

export type LearningModeId = typeof LEARNING_MODES[number]['id'];

export const VOLUME_OPTIONS = [
  { id: 'light'    as const, labelText: 'サクッと完了',    coefficient: 0.7 },
  { id: 'standard' as const, labelText: '標準的な学習',    coefficient: 1.5 },
  { id: 'heavy'    as const, labelText: 'じっくり取り組む', coefficient: 3.0 },
] as const;

export type VolumeId = typeof VOLUME_OPTIONS[number]['id'];

export function calcVolumeHours(weeklyHours: number, coefficient: number): number {
  return (weeklyHours / 7) * coefficient;
}

export function formatVolumeTime(hours: number): string {
  if (hours < 1) {
    return `約${Math.round(hours * 60)}分`;
  }
  const rounded = Math.round(hours * 2) / 2;
  const display = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  return `約${display}時間`;
}
