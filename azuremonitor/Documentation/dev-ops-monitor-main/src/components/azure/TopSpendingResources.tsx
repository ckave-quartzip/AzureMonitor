import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTopSpendingResources } from '@/hooks/useTopSpendingResources';
import { Database, Globe, HardDrive, Server, Cloud, ChevronRight, Trophy } from 'lucide-react';

interface TopSpendingResourcesProps {
  tenantIds?: string[];
}

function getResourceTypeIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('sql') || lowerType.includes('database')) return Database;
  if (lowerType.includes('web') || lowerType.includes('site')) return Globe;
  if (lowerType.includes('storage')) return HardDrive;
  if (lowerType.includes('virtual') || lowerType.includes('compute')) return Server;
  return Cloud;
}

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge className="bg-yellow-500 text-yellow-950">1st</Badge>;
  if (rank === 2) return <Badge className="bg-gray-400 text-gray-950">2nd</Badge>;
  if (rank === 3) return <Badge className="bg-amber-600 text-amber-50">3rd</Badge>;
  return <Badge variant="outline">{rank}th</Badge>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getShortType(type: string) {
  return type.split('/').pop() || type;
}

export function TopSpendingResources({ tenantIds }: TopSpendingResourcesProps) {
  const { data: resources, isLoading } = useTopSpendingResources(5, tenantIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Spending Resources
          </CardTitle>
          <CardDescription>Highest cost resources this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Spending Resources
          </CardTitle>
          <CardDescription>Highest cost resources this month</CardDescription>
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
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Spending Resources
        </CardTitle>
        <CardDescription>Highest cost resources this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {resources.map((resource, index) => {
            const IconComponent = getResourceTypeIcon(resource.resourceType);
            return (
              <Link
                key={resource.id}
                to={`/azure/resources/${resource.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary hover:bg-accent/50 transition-all group"
              >
                <div className="flex-shrink-0 w-10">
                  {getRankBadge(index + 1)}
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{resource.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getShortType(resource.resourceType)} • {resource.resourceGroup}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="font-bold text-sm">{formatCurrency(resource.cost)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
