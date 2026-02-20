import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryDetail } from '@/hooks/useQueryDetail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  Database, 
  Clock, 
  Cpu, 
  HardDrive,
  Activity,
  RefreshCw,
  AlertCircle,
  Save,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon 
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function QueryDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: query, isLoading, error, refetch } = useQueryDetail(id);
  const [manualQueryText, setManualQueryText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveQueryText = async () => {
    if (!id || !manualQueryText.trim()) {
      toast.error('Please enter the query text first');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('azure_sql_insights')
        .update({ query_text: manualQueryText.trim() })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('Query text saved successfully');
      setManualQueryText('');
      refetch();
    } catch (err) {
      console.error('Failed to save query text:', err);
      toast.error('Failed to save query text');
    } finally {
      setIsSaving(false);
    }
  };

  const copyQueryText = () => {
    if (query?.query_text) {
      navigator.clipboard.writeText(query.query_text);
      toast.success('Query copied to clipboard');
    } else if (query?.query_hash) {
      navigator.clipboard.writeText(query.query_hash);
      toast.success('Query hash copied to clipboard');
    }
  };

  const getAzurePortalUrl = () => {
    if (!query?.azure_portal_resource_id) return null;
    return `https://portal.azure.com/#@/resource${query.azure_portal_resource_id}`;
  };

  const getQueryPerformanceInsightUrl = () => {
    if (!query?.azure_portal_resource_id) return null;
    return `https://portal.azure.com/#@/resource${query.azure_portal_resource_id}/queryPerformanceInsight`;
  };

  const copyQpiUrl = () => {
    const url = getQueryPerformanceInsightUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('Query Performance Insight URL copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !query) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Query Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The query you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/azure">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Azure Overview
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const azurePortalUrl = getAzurePortalUrl();
  const queryPerformanceInsightUrl = getQueryPerformanceInsightUrl();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/azure" className="hover:text-foreground">Azure</Link>
        <span>/</span>
        <Link to="/azure" className="hover:text-foreground">SQL Overview</Link>
        <span>/</span>
        <span className="text-foreground">Query Detail</span>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Query Analysis
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline">{query.database_name}</Badge>
                <span className="text-xs font-mono">{query.query_hash}</span>
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/azure/resources/${query.azure_resource_id}`}>
                  <Database className="h-4 w-4 mr-2" />
                  View Database
                </Link>
              </Button>
              {azurePortalUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={azurePortalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Azure Portal
                  </a>
                </Button>
              )}
              {queryPerformanceInsightUrl && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <a href={queryPerformanceInsightUrl} target="_blank" rel="noopener noreferrer">
                      <Activity className="h-4 w-4 mr-2" />
                      Query Performance Insight
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={copyQpiUrl} title="Copy URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* SQL Query Text */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">SQL Query Text</CardTitle>
            <Button variant="outline" size="sm" onClick={copyQueryText}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {query.query_text ? (
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {query.query_text}
            </pre>
          ) : (
            <div className="bg-muted/50 p-4 rounded-lg border border-dashed space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="font-medium">Query text not available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Query text was not captured via Log Analytics diagnostics. You can retrieve it manually using Azure Query Editor.
                    </p>
                  </div>
                  
                  <div className="bg-background rounded-md border">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">Run in Azure Query Editor or SSMS</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2"
                        onClick={() => {
                          const sql = `-- Get query text from Query Store using query_hash
SELECT 
    q.query_id,
    qt.query_sql_text,
    q.query_hash,
    rs.count_executions,
    rs.avg_duration / 1000.0 AS avg_duration_ms,
    rs.avg_cpu_time / 1000.0 AS avg_cpu_time_ms,
    rs.avg_logical_io_reads
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt 
    ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p 
    ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs 
    ON p.plan_id = rs.plan_id
WHERE q.query_hash = ${query.query_hash}
ORDER BY rs.last_execution_time DESC;`;
                          navigator.clipboard.writeText(sql);
                          toast.success('SQL query copied to clipboard');
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="p-3 text-xs font-mono overflow-x-auto text-muted-foreground">
{`SELECT qt.query_sql_text
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt 
    ON q.query_text_id = qt.query_text_id
WHERE q.query_hash = ${query.query_hash};`}
                    </pre>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>To run this query:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-2">
                      <li>Open Azure Portal → your SQL Database</li>
                      <li>Click <strong>Query editor (preview)</strong> in the left menu</li>
                      <li>Login and paste the SQL query above</li>
                    </ol>
                    {queryPerformanceInsightUrl && (
                      <div className="mt-3 pt-2 border-t">
                        <p>Or use <strong>Query Performance Insight</strong> to find this query by hash:</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{query.query_hash}</code>
                          <a 
                            href={queryPerformanceInsightUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline hover:no-underline"
                          >
                            Open QPI
                          </a>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 px-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyQpiUrl();
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Manual query text input */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Save Query Text</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste the query text you retrieved from Azure Query Editor below to save it with this record.
                </p>
                <Textarea
                  placeholder="Paste your SQL query text here..."
                  value={manualQueryText}
                  onChange={(e) => setManualQueryText(e.target.value)}
                  className="font-mono text-sm min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={saveQueryText} 
                    disabled={isSaving || !manualQueryText.trim()}
                    size="sm"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Query Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CPU Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          CPU Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total CPU Time"
            value={formatDuration(query.total_cpu_time_ms)}
            subtitle={`${formatNumber(query.total_cpu_time_ms)}ms total`}
            icon={Cpu}
          />
          <StatCard
            title="Avg CPU Time"
            value={formatDuration(query.avg_cpu_time_ms)}
            subtitle="per execution"
            icon={Cpu}
          />
          <StatCard
            title="Total Duration"
            value={formatDuration(query.total_duration_ms)}
            subtitle={`${formatNumber(query.total_duration_ms)}ms total`}
            icon={Clock}
          />
          <StatCard
            title="Avg Duration"
            value={formatDuration(query.avg_duration_ms)}
            subtitle="per execution"
            icon={Clock}
          />
        </div>
      </div>

      {/* I/O Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          I/O Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Logical Reads"
            value={formatNumber(query.total_logical_reads)}
            subtitle="pages read from cache"
            icon={HardDrive}
          />
          <StatCard
            title="Avg Logical Reads"
            value={formatNumber(query.avg_logical_reads)}
            subtitle="per execution"
            icon={HardDrive}
          />
          <StatCard
            title="Total Logical Writes"
            value={formatNumber(query.total_logical_writes)}
            subtitle="pages written"
            icon={HardDrive}
          />
          <StatCard
            title="Avg Logical Writes"
            value={formatNumber(query.avg_logical_writes)}
            subtitle="per execution"
            icon={HardDrive}
          />
        </div>
      </div>

      {/* Execution Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Execution Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Execution Count</p>
              <p className="text-2xl font-bold">{formatNumber(query.execution_count)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Execution</p>
              <p className="text-lg font-semibold">
                {query.last_execution_time 
                  ? format(new Date(query.last_execution_time), 'MMM d, yyyy h:mm a')
                  : 'Unknown'}
              </p>
              {query.last_execution_time && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(query.last_execution_time), { addSuffix: true })}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plan Count</p>
              <p className="text-lg font-semibold">
                {query.plan_count ?? 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">execution plans</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Last Synced
              </p>
              <p className="text-lg font-semibold">
                {formatDistanceToNow(new Date(query.synced_at), { addSuffix: true })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(query.synced_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" asChild>
          <Link to="/azure">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SQL Overview
          </Link>
        </Button>
      </div>
    </div>
  );
}
