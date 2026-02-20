import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, ChevronRight, X, ArrowLeft, ExternalLink } from 'lucide-react';
import { CostSpike } from '@/hooks/useCostSpikes';
import { useSpikeDayDetail } from '@/hooks/useSpikeDayDetail';
import { format } from 'date-fns';

interface CostSpikeAnalysisProps {
  spikes: CostSpike[];
  period1Label: string;
  tenantId?: string;
}

export function CostSpikeAnalysis({ spikes, period1Label, tenantId }: CostSpikeAnalysisProps) {
  const [selectedSpike, setSelectedSpike] = useState<CostSpike | null>(null);
  const { data: spikeDetail, isLoading: detailLoading } = useSpikeDayDetail(
    selectedSpike?.date || null,
    tenantId
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityBadge = (percentAbove: number) => {
    if (percentAbove >= 200) return <Badge variant="destructive">Critical</Badge>;
    if (percentAbove >= 100) return <Badge className="bg-orange-500">High</Badge>;
    return <Badge variant="secondary">Moderate</Badge>;
  };

  const truncateResourceId = (id: string) => {
    if (id.length <= 60) return id;
    const parts = id.split('/');
    if (parts.length > 2) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return `${id.substring(0, 30)}...${id.substring(id.length - 25)}`;
  };

  // Drill-down view
  if (selectedSpike) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedSpike(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Spike Details: {format(new Date(selectedSpike.date), 'MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>
                  Total cost: {formatCurrency(selectedSpike.cost)} • {selectedSpike.percentAboveAverage.toFixed(0)}% above average
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedSpike(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : spikeDetail ? (
            <>
              {/* Category breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-3">Cost by Service Category</h4>
                <div className="space-y-2">
                  {spikeDetail.byCategory.map((cat) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="w-32 text-sm truncate" title={cat.category}>
                        {cat.category}
                      </div>
                      <div className="flex-1">
                        <Progress value={cat.percent} className="h-2" />
                      </div>
                      <div className="w-20 text-right text-sm font-medium">
                        {formatCurrency(cat.cost)}
                      </div>
                      <div className="w-12 text-right text-xs text-muted-foreground">
                        {cat.percent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top resources */}
              <div>
                <h4 className="text-sm font-medium mb-3">Top Contributing Resources</h4>
                <div className="rounded-md border overflow-auto max-h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Resource Group</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spikeDetail.topResources.map((resource, idx) => (
                        <TableRow key={resource.resourceId} className={resource.internalId ? 'hover:bg-muted/50' : ''}>
                          <TableCell className="font-mono text-xs" title={resource.resourceId}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                #{idx + 1}
                              </Badge>
                              {resource.internalId ? (
                                <Link 
                                  to={`/azure/resources/${resource.internalId}`}
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  {resource.resourceName || truncateResourceId(resource.resourceId)}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span>{truncateResourceId(resource.resourceId)}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{resource.resourceGroup}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {resource.meterCategory}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(resource.cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={resource.percentOfTotal} className="w-16 h-2" />
                              <span className="text-xs w-12 text-right">
                                {resource.percentOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No detailed data available for this date
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Main list view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <CardTitle>Cost Spikes Detected</CardTitle>
            <CardDescription>
              Days where cost exceeded 2x the daily average in {period1Label}. Click a row to see contributing resources.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {spikes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No significant cost spikes detected</p>
            <p className="text-sm">All daily costs are within normal range</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Daily Cost</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">% Above Avg</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spikes.map((spike) => (
                  <TableRow 
                    key={spike.date} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSpike(spike)}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(spike.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      {formatCurrency(spike.cost)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(spike.dailyAverage)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-destructive font-medium">
                        +{spike.percentAboveAverage.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {getSeverityBadge(spike.percentAboveAverage)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {spikes.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            {spikes.length} spike{spikes.length === 1 ? '' : 's'} detected. Click any row to see the top contributing resources.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
