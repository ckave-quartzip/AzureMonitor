import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CostReportFilters } from '@/components/costs/CostReportFilters';
import { CostComparisonSummary } from '@/components/costs/CostComparisonSummary';
import { CostComparisonChart } from '@/components/costs/CostComparisonChart';
import { CostBreakdownTables } from '@/components/costs/CostBreakdownTables';
import { CostSpikeAnalysis } from '@/components/costs/CostSpikeAnalysis';
import { CostExportButton } from '@/components/costs/CostExportButton';
import { useCostComparison, CostComparisonParams } from '@/hooks/useCostComparison';
import { useCostSpikes } from '@/hooks/useCostSpikes';

export default function AzureCostReport() {
  const [filterParams, setFilterParams] = useState<CostComparisonParams | null>(null);
  
  const { data, isLoading, error, refetch } = useCostComparison(filterParams);
  const spikes = useCostSpikes(data?.period1.dailyCosts);

  const handleFiltersChange = useCallback((params: CostComparisonParams | null) => {
    setFilterParams(params);
  }, []);

  const period1Label = filterParams 
    ? `${format(new Date(filterParams.period1Start), 'MMM d')} - ${format(new Date(filterParams.period1End), 'MMM d, yyyy')}`
    : 'Period 1';
  
  const period2Label = filterParams
    ? `${format(new Date(filterParams.period2Start), 'MMM d')} - ${format(new Date(filterParams.period2End), 'MMM d, yyyy')}`
    : 'Period 2';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/azure">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                Cost Reporting
              </h1>
              <p className="text-muted-foreground mt-1">
                Detailed cost analysis with timeframe comparisons and resource group exclusions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {data && (
              <CostExportButton 
                data={data} 
                period1Label={period1Label} 
                period2Label={period2Label} 
              />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <CostReportFilters onFiltersChange={handleFiltersChange} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8">
            <p className="text-destructive font-medium">Error loading cost data</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[300px]" />
          </div>
        )}

        {/* Data Display */}
        {data && !isLoading && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <CostComparisonSummary 
              data={data} 
              period1Label={period1Label} 
              period2Label={period2Label} 
            />

            {/* Comparison Chart */}
            <CostComparisonChart 
              data={data} 
              period1Label={period1Label} 
              period2Label={period2Label} 
            />

            {/* Spike Analysis */}
            <CostSpikeAnalysis 
              spikes={spikes} 
              period1Label={period1Label}
              tenantId={filterParams?.tenantId}
            />

            {/* Breakdown Tables */}
            <CostBreakdownTables
              byResourceGroup={data.period1.byResourceGroup}
              byCategory={data.period1.byCategory}
              byResource={data.period1.byResource}
              period1Label={period1Label}
              period2Label={period2Label}
            />
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !error && !data && filterParams && (
          <div className="text-center py-16 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cost data available for the selected filters</p>
            <p className="text-sm">Try adjusting your date range or filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
