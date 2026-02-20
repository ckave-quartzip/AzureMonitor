import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAzureCostsByResource } from '@/hooks/useAzureCosts';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CostByResourceChartProps {
  tenantId?: string;
  tenantIds?: string[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(210, 80%, 50%)',
  'hsl(150, 60%, 40%)',
  'hsl(45, 90%, 50%)',
  'hsl(0, 70%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(180, 50%, 40%)',
];

export function CostByResourceChart({ tenantId, tenantIds }: CostByResourceChartProps) {
  const { data: resources, isLoading, error } = useAzureCostsByResource(tenantId, undefined, undefined, tenantIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !resources || resources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Cost by Resource
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No resource cost data available
        </CardContent>
      </Card>
    );
  }

  // Get top 8 resources by cost
  const topResources = resources.slice(0, 8);
  const otherCost = resources.slice(8).reduce((sum, r) => sum + r.total_cost, 0);
  
  const chartData = [
    ...topResources.map((r) => ({
      name: r.resource_id.split('/').pop() || r.resource_id,
      value: r.total_cost,
      fullName: r.resource_id,
    })),
    ...(otherCost > 0 ? [{ name: 'Other', value: otherCost, fullName: 'Other resources' }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Cost by Resource
        </CardTitle>
        <CardDescription>
          Top spending resources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm text-foreground">{data.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{data.fullName}</p>
                      <p className="text-sm font-bold text-foreground mt-1">${data.value.toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Legend 
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              formatter={(value) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
