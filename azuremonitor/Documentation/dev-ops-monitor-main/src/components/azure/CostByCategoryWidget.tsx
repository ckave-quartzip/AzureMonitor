import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostByCategory } from '@/hooks/useCostByCategory';
import { Layers, Cloud } from 'lucide-react';

interface CostByCategoryWidgetProps {
  tenantIds?: string[];
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-gray-400',
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CostByCategoryWidget({ tenantIds }: CostByCategoryWidgetProps) {
  const { data: categories, isLoading } = useCostByCategory(5, tenantIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Cost by Service
          </CardTitle>
          <CardDescription>Spending breakdown by Azure service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Cost by Service
          </CardTitle>
          <CardDescription>Spending breakdown by Azure service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Cloud className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No cost data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Cost by Service
        </CardTitle>
        <CardDescription>Spending breakdown by Azure service</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category, index) => (
            <div key={category.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[150px]">{category.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{category.percentage.toFixed(0)}%</span>
                  <span className="font-bold">{formatCurrency(category.cost)}</span>
                </div>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
