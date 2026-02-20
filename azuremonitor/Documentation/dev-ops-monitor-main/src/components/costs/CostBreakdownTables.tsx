import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus, Search, Sparkles, Trash2, PiggyBank, CloudOff } from 'lucide-react';
import { CostBreakdown } from '@/hooks/useCostComparison';

interface CostBreakdownTablesProps {
  byResourceGroup: CostBreakdown[];
  byCategory: CostBreakdown[];
  byResource: CostBreakdown[];
  period1Label: string;
  period2Label: string;
}

export function CostBreakdownTables({
  byResourceGroup,
  byCategory,
  byResource,
  period1Label,
  period2Label,
}: CostBreakdownTablesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightNewItems, setHighlightNewItems] = useState(true);
  const [highlightSavings, setHighlightSavings] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceIcon = (percentChange: number) => {
    if (percentChange > 5) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (percentChange < -5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVarianceColor = (percentChange: number) => {
    if (percentChange > 5) return 'text-destructive';
    if (percentChange < -5) return 'text-green-500';
    return 'text-muted-foreground';
  };

  const filterData = (data: CostBreakdown[]) => {
    if (!searchTerm) return data;
    return data.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCounts = (data: CostBreakdown[]) => {
    const newCount = data.filter(d => d.isNew).length;
    const removedCount = data.filter(d => d.isRemoved).length;
    const savingsCount = data.filter(d => d.hasSavings || d.isRemoved).length;
    const deletedFromAzureCount = data.filter(d => d.deletedFromAzure).length;
    return { newCount, removedCount, savingsCount, deletedFromAzureCount };
  };

  const getRowClassName = (row: CostBreakdown) => {
    if (highlightSavings && (row.hasSavings || row.isRemoved)) {
      return 'bg-green-500/10 hover:bg-green-500/20';
    }
    if (highlightNewItems && row.isNew) {
      return 'bg-amber-500/10 hover:bg-amber-500/20';
    }
    return '';
  };

  const BreakdownTable = ({ data }: { data: CostBreakdown[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">{period1Label}</TableHead>
          <TableHead className="text-right">{period2Label}</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead className="text-right">% Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filterData(data).map((row) => (
          <TableRow 
            key={row.name}
            className={getRowClassName(row)}
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="break-all">
                  {row.name.length > 50 ? `${row.name.substring(0, 50)}...` : row.name}
                </span>
                {row.isNew && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs shrink-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    NEW
                  </Badge>
                )}
                {row.isRemoved && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs shrink-0">
                    <Trash2 className="h-3 w-3 mr-1" />
                    DISCONTINUED (was {formatCurrency(row.period2Cost)})
                  </Badge>
                )}
                {row.hasSavings && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs shrink-0">
                    <PiggyBank className="h-3 w-3 mr-1" />
                    SAVED {formatCurrency(row.savingsAmount)}
                  </Badge>
                )}
                {row.deletedFromAzure && (
                  <Badge variant="outline" className="bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30 text-xs shrink-0">
                    <CloudOff className="h-3 w-3 mr-1" />
                    DELETED
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(row.period1Cost)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.period2Cost)}</TableCell>
            <TableCell className="text-right">
              <span className={getVarianceColor(row.percentChange)}>
                {row.variance >= 0 ? '+' : ''}{formatCurrency(row.variance)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {getVarianceIcon(row.percentChange)}
                <span className={getVarianceColor(row.percentChange)}>
                  {row.percentChange >= 0 ? '+' : ''}{row.percentChange.toFixed(1)}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {filterData(data).length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No matching items found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const rgCounts = getCounts(byResourceGroup);
  const catCounts = getCounts(byCategory);
  const resCounts = getCounts(byResource);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Detailed comparison by category</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="highlight-savings"
                checked={highlightSavings}
                onCheckedChange={setHighlightSavings}
              />
              <Label htmlFor="highlight-savings" className="text-sm cursor-pointer">
                Highlight savings
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="highlight-new"
                checked={highlightNewItems}
                onCheckedChange={setHighlightNewItems}
              />
              <Label htmlFor="highlight-new" className="text-sm cursor-pointer">
                Highlight new
              </Label>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resource-group" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resource-group" className="flex items-center gap-1">
              By Resource Group
              <Badge variant="secondary" className="ml-1">{byResourceGroup.length}</Badge>
              {rgCounts.newCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                  +{rgCounts.newCount}
                </Badge>
              )}
              {rgCounts.savingsCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                  -{rgCounts.savingsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="category" className="flex items-center gap-1">
              By Service
              <Badge variant="secondary" className="ml-1">{byCategory.length}</Badge>
              {catCounts.newCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                  +{catCounts.newCount}
                </Badge>
              )}
              {catCounts.savingsCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                  -{catCounts.savingsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resource" className="flex items-center gap-1">
              By Resource (Top 20)
              <Badge variant="secondary" className="ml-1">{byResource.length}</Badge>
              {resCounts.newCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                  +{resCounts.newCount}
                </Badge>
              )}
              {resCounts.savingsCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                  -{resCounts.savingsCount}
                </Badge>
              )}
              {resCounts.deletedFromAzureCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30 text-xs">
                  <CloudOff className="h-3 w-3 mr-0.5" />
                  {resCounts.deletedFromAzureCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resource-group" className="mt-4">
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <BreakdownTable data={byResourceGroup} />
            </div>
          </TabsContent>

          <TabsContent value="category" className="mt-4">
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <BreakdownTable data={byCategory} />
            </div>
          </TabsContent>

          <TabsContent value="resource" className="mt-4">
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <BreakdownTable data={byResource} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}