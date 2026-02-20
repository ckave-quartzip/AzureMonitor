import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostByResourceGroup } from '@/hooks/useCostByResourceGroup';
import { FolderKanban, Cloud, Server } from 'lucide-react';

interface CostByResourceGroupWidgetProps {
  tenantIds?: string[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CostByResourceGroupWidget({ tenantIds }: CostByResourceGroupWidgetProps) {
  const { data: groups, isLoading } = useCostByResourceGroup(5, tenantIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Cost by Resource Group
          </CardTitle>
          <CardDescription>Spending by Azure resource group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Cost by Resource Group
          </CardTitle>
          <CardDescription>Spending by Azure resource group</CardDescription>
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
          <FolderKanban className="h-5 w-5 text-primary" />
          Cost by Resource Group
        </CardTitle>
        <CardDescription>Spending by Azure resource group</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.resourceGroup}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{group.resourceGroup}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Server className="h-3 w-3" />
                  <span>{group.resourceCount} resources</span>
                  <span>•</span>
                  <span>{group.percentage.toFixed(0)}% of total</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm">{formatCurrency(group.cost)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
