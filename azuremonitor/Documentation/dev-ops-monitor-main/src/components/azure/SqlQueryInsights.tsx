import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAzureSqlTopQueries, useAzureSqlLongRunningQueries, SqlQueryInsight } from '@/hooks/useAzureSqlInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Cpu, Clock, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SqlQueryInsightsProps {
  resourceId: string;
}

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

function QueryTable({ queries, sortBy, azureResourceId }: { queries: SqlQueryInsight[]; sortBy: 'cpu' | 'duration'; azureResourceId?: string }) {
  const navigate = useNavigate();
  
  // Fetch the azure_resource_id from azure_resources to build the QPI URL
  const { data: azureResource } = useQuery({
    queryKey: ['azure-resource-portal-id', azureResourceId],
    queryFn: async () => {
      if (!azureResourceId) return null;
      const { data, error } = await supabase
        .from('azure_resources')
        .select('azure_resource_id')
        .eq('id', azureResourceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!azureResourceId,
  });

  const getQpiUrl = () => {
    if (!azureResource?.azure_resource_id) return null;
    return `https://portal.azure.com/#@/resource${azureResource.azure_resource_id}/queryPerformanceInsight`;
  };

  const copyQpiUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getQpiUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('Query Performance Insight URL copied');
    }
  };
  
  if (!queries || queries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No query insights available
      </div>
    );
  }

  const qpiUrl = getQpiUrl();

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Query</TableHead>
            <TableHead>Executions</TableHead>
            <TableHead>{sortBy === 'cpu' ? 'Avg CPU' : 'Avg Duration'}</TableHead>
            <TableHead>Avg Reads</TableHead>
            <TableHead>Last Run</TableHead>
            {qpiUrl && <TableHead className="w-[40px]">QPI</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries.map((query) => (
            <TableRow 
              key={query.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/azure/queries/${query.id}`)}
            >
              <TableCell className="font-mono text-xs">
                <div className="max-w-[280px] truncate" title={query.query_text || query.query_hash}>
                  {query.query_text?.substring(0, 100) || query.query_hash}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{formatNumber(query.execution_count)}</Badge>
              </TableCell>
              <TableCell>
                {sortBy === 'cpu' 
                  ? formatDuration(query.avg_cpu_time_ms)
                  : formatDuration(query.avg_duration_ms)
                }
              </TableCell>
              <TableCell>{formatNumber(query.avg_logical_reads)}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {query.last_execution_time 
                  ? new Date(query.last_execution_time).toLocaleString()
                  : 'N/A'
                }
              </TableCell>
              {qpiUrl && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={copyQpiUrl}
                    title="Copy Query Performance Insight URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export function SqlQueryInsights({ resourceId }: SqlQueryInsightsProps) {
  const { data: topQueries, isLoading: loadingTop } = useAzureSqlTopQueries(resourceId);
  const { data: longRunning, isLoading: loadingLong } = useAzureSqlLongRunningQueries(resourceId);

  if (loadingTop || loadingLong) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          SQL Query Insights
        </CardTitle>
        <CardDescription>
          Query performance analysis from Azure SQL
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cpu">
          <TabsList>
            <TabsTrigger value="cpu" className="gap-2">
              <Cpu className="h-4 w-4" />
              Top CPU Queries
            </TabsTrigger>
            <TabsTrigger value="duration" className="gap-2">
              <Clock className="h-4 w-4" />
              Long Running
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cpu" className="mt-4">
            <QueryTable queries={topQueries || []} sortBy="cpu" azureResourceId={resourceId} />
          </TabsContent>
          
          <TabsContent value="duration" className="mt-4">
            <QueryTable queries={longRunning || []} sortBy="duration" azureResourceId={resourceId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
