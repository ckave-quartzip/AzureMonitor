import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, AlertTriangle, Zap, Search, 
  CheckCircle2, Clock, Copy
} from 'lucide-react';
import { useSqlDatabasesOverview, useTopProblematicQueries } from '@/hooks/useAzureSqlOverview';
import { SqlMissingIndexList } from './SqlMissingIndexList';
import { SqlHealthScoreWidget } from './SqlHealthScoreWidget';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function SqlOverviewDashboard() {
  const navigate = useNavigate();
  const { data: overview, isLoading: loadingOverview } = useSqlDatabasesOverview();
  const { data: topQueries, isLoading: loadingQueries } = useTopProblematicQueries(10);

  const isLoading = loadingOverview || loadingQueries;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score + Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Widget */}
        <SqlHealthScoreWidget />
        
        {/* Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SQL Databases</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalDatabases || 0}</div>
            <p className="text-xs text-muted-foreground">Monitored instances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High DTU Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(overview?.highDtuCount || 0) > 0 ? 'text-destructive' : ''}`}>
              {overview?.highDtuCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Databases &gt;80% DTU</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(overview?.totalRecommendations || 0) > 0 ? 'text-yellow-500' : ''}`}>
              {overview?.totalRecommendations || 0}
            </div>
            <p className="text-xs text-muted-foreground">Index & tuning suggestions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deadlocks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(overview?.deadlockCount || 0) > 0 ? 'text-destructive' : ''}`}>
              {overview?.deadlockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Recent 24h</p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Problematic Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Top Problematic Queries
            </CardTitle>
            <CardDescription>
              Highest CPU-consuming queries across all databases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!topQueries || topQueries.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p className="text-muted-foreground">No query insights available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sync SQL insights to see query performance data
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Database</TableHead>
                      <TableHead>Query</TableHead>
                      <TableHead>Avg CPU</TableHead>
                      <TableHead className="w-[40px]">QPI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topQueries.map((query) => {
                      const qpiUrl = query.azure_portal_resource_id 
                        ? `https://portal.azure.com/#@/resource${query.azure_portal_resource_id}/queryPerformanceInsight`
                        : null;
                      
                      return (
                        <TableRow 
                          key={query.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/azure/queries/${query.id}`)}
                        >
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {query.database_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px]">
                            <div className="truncate" title={query.query_text || query.query_hash}>
                              {query.query_text?.substring(0, 50) || query.query_hash.substring(0, 20)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={query.avg_cpu_time_ms > 1000 ? 'destructive' : 'secondary'}>
                              {formatDuration(query.avg_cpu_time_ms)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {qpiUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(qpiUrl);
                                  toast.success('Query Performance Insight URL copied');
                                }}
                                title="Copy Query Performance Insight URL"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Missing Indexes */}
        <SqlMissingIndexList showDatabaseColumn={true} />
      </div>

      {/* Databases Needing Attention */}
      {overview?.databases && overview.databases.some(db => 
        (db.latestStats?.dtu_percent && db.latestStats.dtu_percent > 80) ||
        (db.latestStats?.deadlock_count && db.latestStats.deadlock_count > 0) ||
        db.recommendationCount > 0
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Databases Needing Attention
            </CardTitle>
            <CardDescription>
              Databases with high utilization, issues, or pending recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.databases
                .filter(db => 
                  (db.latestStats?.dtu_percent && db.latestStats.dtu_percent > 80) ||
                  (db.latestStats?.deadlock_count && db.latestStats.deadlock_count > 0) ||
                  db.recommendationCount > 0
                )
                .map(db => (
                  <Link 
                    key={db.id} 
                    to={`/resources?azureId=${db.id}`}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{db.name}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {db.latestStats?.dtu_percent && db.latestStats.dtu_percent > 80 && (
                          <Badge variant="destructive" className="text-xs">
                            DTU: {db.latestStats.dtu_percent.toFixed(0)}%
                          </Badge>
                        )}
                        {db.latestStats?.deadlock_count && db.latestStats.deadlock_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {db.latestStats.deadlock_count} deadlocks
                          </Badge>
                        )}
                        {db.recommendationCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {db.recommendationCount} recommendations
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
