import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllMissingIndexes, MissingIndex } from '@/hooks/useAzureSqlOverview';
import { useSqlRecommendations } from '@/hooks/useAzureSqlPerformance';
import { Copy, CheckCircle2, Database, AlertTriangle, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface SqlMissingIndexListProps {
  resourceId?: string; // Optional - if provided, shows only for this resource
  showDatabaseColumn?: boolean;
}

function getImpactBadge(impact: string | null) {
  switch (impact?.toLowerCase()) {
    case 'high':
      return <Badge variant="destructive">High</Badge>;
    case 'medium':
      return <Badge variant="default">Medium</Badge>;
    default:
      return <Badge variant="secondary">Low</Badge>;
  }
}

function IndexRow({ index, showDatabase }: { index: MissingIndex; showDatabase: boolean }) {
  const handleCopy = () => {
    if (index.solution) {
      navigator.clipboard.writeText(index.solution);
      toast({
        title: 'Copied!',
        description: 'CREATE INDEX statement copied to clipboard',
      });
    }
  };

  return (
    <TableRow>
      {showDatabase && (
        <TableCell>
          <Link 
            to={`/resources?azureId=${index.azure_resource_id}`}
            className="flex items-center gap-1 hover:text-primary"
          >
            <Database className="h-3 w-3" />
            {index.database_name}
          </Link>
        </TableCell>
      )}
      <TableCell className="font-medium max-w-[300px]">
        <div className="truncate" title={index.name}>
          {index.name}
        </div>
      </TableCell>
      <TableCell>
        {getImpactBadge(index.impact)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
        <div className="truncate" title={index.impacted_value || ''}>
          {index.impacted_value || 'N/A'}
        </div>
      </TableCell>
      <TableCell>
        {index.solution && (
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function SqlMissingIndexList({ resourceId, showDatabaseColumn = true }: SqlMissingIndexListProps) {
  // Use resource-specific or global recommendations based on props
  const { data: allIndexes, isLoading: loadingAll } = useAllMissingIndexes();
  const { data: resourceRecs, isLoading: loadingResource } = useSqlRecommendations(resourceId);

  const isLoading = resourceId ? loadingResource : loadingAll;
  
  // If resourceId is provided, convert resource recommendations to MissingIndex format
  const indexes: MissingIndex[] = resourceId 
    ? (resourceRecs?.map(rec => ({
        id: rec.id,
        azure_resource_id: rec.azure_resource_id,
        database_name: '',
        recommendation_id: rec.recommendation_id,
        name: rec.name,
        impact: rec.impact,
        impacted_value: rec.impacted_value,
        solution: rec.solution,
      })) || [])
    : (allIndexes || []);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Missing Indexes
          {indexes.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {indexes.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Index recommendations to improve query performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {indexes.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <p className="text-muted-foreground">No missing indexes detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your database indexes are optimized!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {showDatabaseColumn && <TableHead>Database</TableHead>}
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Affected</TableHead>
                  <TableHead>Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indexes.map((index) => (
                  <IndexRow 
                    key={index.id} 
                    index={index} 
                    showDatabase={showDatabaseColumn && !resourceId}
                  />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
