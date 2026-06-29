import { AnalyticsSummary } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

interface Props {
  data: AnalyticsSummary | undefined;
  isLoading: boolean;
}

const CARDS: { key: keyof AnalyticsSummary; label: string; money: boolean }[] = [
  { key: 'orderCount', label: 'Orders', money: false },
  { key: 'grossSales', label: 'Gross Sales', money: true },
  { key: 'discounts', label: 'Discounts', money: true },
  { key: 'netSales', label: 'Net Sales', money: true },
  { key: 'tax', label: 'Tax (GST)', money: true },
  { key: 'revenue', label: 'Revenue', money: true },
];

export function SummaryCards({ data, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map(({ key, label, money }) => (
        <Card key={key}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            {isLoading || !data ? (
              <Skeleton className="h-7 w-3/4" />
            ) : (
              <p className="text-2xl font-bold">
                {money
                  ? formatMoney(data[key] as number)
                  : String(data[key])}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
