import { useEffect, useRef } from 'react';
import type {} from '@voidable/ui/types/react';
import type { VoidBarChart } from '@voidable/ui';

const stats = [
  { label: 'Revenue', value: '$48,200', delta: '+12% vs last month', trend: 'up' },
  { label: 'Active users', value: '1,284', delta: '+4%', trend: 'up' },
  { label: 'Churn', value: '2.1%', delta: '-0.3%', trend: 'down' },
  { label: 'Open tickets', value: '37', delta: '+5', trend: 'up' },
] as const;

export default function App() {
  const chart = useRef<VoidBarChart>(null);
  useEffect(() => {
    if (chart.current) {
      chart.current.data = {
        labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        series: [{ name: 'Signups', values: [120, 150, 180, 170, 210, 260] }],
      };
    }
  }, []);

  return (
    <main style={{ padding: 'var(--void-space-4)', display: 'grid', gap: 'var(--void-space-6)', gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <h1>Dashboard</h1>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: 'var(--void-space-4)' }}>
        {stats.map((s) => (
          <void-card key={s.label}>
            <void-stat label={s.label} value={s.value} delta={s.delta} trend={s.trend}></void-stat>
          </void-card>
        ))}
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: 'var(--void-space-4)' }}>
        <void-card heading="Monthly signups">
          <void-bar-chart ref={chart} aria-label="Monthly signups"></void-bar-chart>
        </void-card>
        <void-card heading="Recent activity">
          <void-list dividers>
            <void-list-item>Ada upgraded to Pro</void-list-item>
            <void-list-item>Grace invited 3 teammates</void-list-item>
            <void-list-item>Alan exported a report</void-list-item>
          </void-list>
        </void-card>
      </section>
    </main>
  );
}
