import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useResourceHealthStats } from '@/hooks/useCheckResults';
import { supabase } from '@/integrations/supabase/client';

const STATUS_CONFIG = {
  up: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500', label: 'Down' },
  unknown: { icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted-foreground', label: 'Unknown' },
};

export function ResourceHealthOverview() {
  const { data: stats, isLoading, refetch } = useResourceHealthStats();

  // Subscribe to real-time resource updates
  useEffect(() => {
    const channel = supabase
      .channel('resources_health_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resources',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Resource Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const resources = stats?.resources || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Resource Health
          </CardTitle>
          <div className="flex gap-1">
            {stats && stats.healthy > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                {stats.healthy} healthy
              </Badge>
            )}
            {stats && stats.down > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                {stats.down} down
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6">
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Server className="h-8 w-8 mb-2" />
              <p className="text-sm">No resources configured</p>
              <Link to="/clients" className="text-xs text-primary hover:underline mt-1">
                Add resources to start monitoring
              </Link>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {resources.map((resource) => {
                const config = STATUS_CONFIG[resource.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${config.bg}/10`}>
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{resource.name}</p>
                        <p className="text-xs text-muted-foreground">{resource.resource_type}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
