import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAzureSyncLogs, AzureSyncLog } from '@/hooks/useAzureSyncLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { History, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AzureSyncLogListProps {
  tenantId?: string;
  tenantIds?: string[];
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'success':
      return <Badge variant="default">Success</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'running':
      return <Badge variant="secondary">Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function AzureSyncLogList({ tenantId, tenantIds }: AzureSyncLogListProps) {
  const { data: logs, isLoading, error } = useAzureSyncLogs(tenantId, 50, tenantIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load sync logs
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Sync History
        </CardTitle>
        <CardDescription>
          Recent Azure synchronization jobs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sync history yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const duration = log.completed_at 
                    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                    : null;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.sync_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.records_processed ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.started_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {duration !== null ? `${duration}s` : '-'}
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
  );
}
