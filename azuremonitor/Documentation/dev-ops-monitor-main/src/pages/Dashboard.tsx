import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, AlertTriangle, CheckCircle, XCircle, Building2, Activity, Bell, Play, Loader2, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useResourceHealthStats } from '@/hooks/useCheckResults';
import { useUnresolvedAlerts } from '@/hooks/useAlerts';
import { useRunMonitoringCheck } from '@/hooks/useMonitoringChecks';
import { RecentCheckResults } from '@/components/dashboard/RecentCheckResults';
import { ResourceHealthOverview } from '@/components/dashboard/ResourceHealthOverview';
import { UptimeMetricsRow } from '@/components/dashboard/UptimeMetrics';
import { ResponseTimeTrendChart, UptimeTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { AzureDashboardWidgets } from '@/components/dashboard/AzureDashboardWidgets';
import { CriticalAzureAlerts } from '@/components/dashboard/CriticalAzureAlerts';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { isAdmin, isEditor } = useAuth();
  const { data: clients } = useClients();
  const { data: healthStats, refetch: refetchHealth } = useResourceHealthStats();
  const { data: unresolvedAlerts, refetch: refetchAlerts } = useUnresolvedAlerts();
  const { runCheck, isRunning } = useRunMonitoringCheck();
  const canCreate = isAdmin || isEditor;

  // Subscribe to real-time updates for stats
  useEffect(() => {
    const resourceChannel = supabase
      .channel('dashboard_resources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        refetchHealth();
      })
      .subscribe();

    const alertChannel = supabase
      .channel('dashboard_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        refetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(resourceChannel);
      supabase.removeChannel(alertChannel);
    };
  }, [refetchHealth, refetchAlerts]);

  const handleRunAllChecks = () => {
    runCheck();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time infrastructure monitoring overview
            </p>
          </div>
          <Button onClick={handleRunAllChecks} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run All Checks
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Client organizations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Monitored resources</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Healthy</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">{healthStats?.healthy || 0}</span>
                {healthStats && healthStats.down > 0 && (
                  <span className="text-sm text-red-500 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {healthStats.down} down
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Resources online</p>
            </CardContent>
          </Card>
          
          <Card className={unresolvedAlerts && unresolvedAlerts.length > 0 ? 'border-amber-500/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className={`h-4 w-4 ${unresolvedAlerts && unresolvedAlerts.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {unresolvedAlerts?.length || 0}
              </div>
              <Link to="/alerts" className="text-xs text-primary hover:underline">
                View all alerts →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Critical Azure Alerts */}
        <CriticalAzureAlerts />

        {/* Azure Overview */}
        <AzureDashboardWidgets />

        {/* Uptime Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Uptime Metrics
          </h2>
          <UptimeMetricsRow />
        </div>

        {/* Performance Trend Charts */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Trends
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ResponseTimeTrendChart />
            <UptimeTrendChart />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ResourceHealthOverview />
          <RecentCheckResults />
        </div>

        {/* Empty State */}
        {(!healthStats || healthStats.total === 0) && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No resources to monitor</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                Start by adding clients and resources, then configure monitoring checks to see real-time health data here.
              </p>
              {canCreate && (
                <Button className="mt-4" asChild>
                  <Link to="/clients">Get Started</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
