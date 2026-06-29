import { AnalyticsView } from '@/components/analytics/analytics-view';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Sales performance and reporting</p>
      </div>
      <AnalyticsView />
    </div>
  );
}
