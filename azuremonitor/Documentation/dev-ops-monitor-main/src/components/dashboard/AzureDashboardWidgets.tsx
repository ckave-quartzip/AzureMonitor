import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud, DollarSign, AlertCircle, Server, Database, Globe, HardDrive, RefreshCw } from 'lucide-react';
import { useAzureDashboardStats } from '@/hooks/useAzureDashboardStats';
import { formatDistanceToNow } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Map resource types to icons
function getTypeIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('sql') || lowerType.includes('database')) return Database;
  if (lowerType.includes('web') || lowerType.includes('site')) return Globe;
  if (lowerType.includes('storage')) return HardDrive;
  return Server;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AzureDashboardWidgets() {
  const { data: stats, isLoading, error } = useAzureDashboardStats();

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Azure Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !stats || stats.tenantCount === 0) {
    return null; // Don't show if no Azure tenants configured
  }

  // Prepare cost chart data
  const costChartData = Object.entries(stats.costByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Get top resource types
  const topTypes = Object.entries(stats.resourcesByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: stats.costCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Azure Overview
        </h2>
        {stats.lastSyncAt && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Synced {formatDistanceToNow(new Date(stats.lastSyncAt), { addSuffix: true })}
          </span>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Azure Resources Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Azure Resources</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResources}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Across {stats.tenantCount} tenant{stats.tenantCount > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topTypes.map(([type, count]) => {
                const Icon = getTypeIcon(type);
                return (
                  <Badge key={type} variant="secondary" className="gap-1 text-xs">
                    <Icon className="h-3 w-3" />
                    {type}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Azure Costs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalMonthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Current month spend
            </p>
            {costChartData.length > 0 && (
              <div className="h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={15}
                      outerRadius={28}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {costChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Azure Health Card */}
        <Card className={stats.resourcesWithIssues > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resource Health</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.resourcesWithIssues > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            {stats.resourcesWithIssues > 0 ? (
              <>
                <div className="text-2xl font-bold text-amber-500">
                  {stats.resourcesWithIssues}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Resources with high utilization (&gt;80%)
                </p>
                <Badge variant="secondary" className="text-amber-600">
                  Needs attention
                </Badge>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-500">
                  All Healthy
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  No resources with high utilization
                </p>
                <Badge variant="secondary" className="text-emerald-600">
                  All systems normal
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
