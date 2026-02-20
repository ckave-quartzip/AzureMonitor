import { useState, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, subQuarters, startOfQuarter, endOfQuarter, subYears, startOfYear, endOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResourceGroupList, useMeterCategoryList } from '@/hooks/useResourceGroupList';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { CostComparisonParams } from '@/hooks/useCostComparison';

interface DateRange {
  from: Date;
  to: Date;
}

export type PresetOption = 
  | 'this-month-vs-last'
  | 'last-30-vs-previous-30'
  | 'this-quarter-vs-last'
  | 'this-year-vs-last'
  | 'custom';

interface CostReportFiltersProps {
  onFiltersChange: (params: CostComparisonParams | null) => void;
}

export function CostReportFilters({ onFiltersChange }: CostReportFiltersProps) {
  const [preset, setPreset] = useState<PresetOption>('last-30-vs-previous-30');
  const [period1, setPeriod1] = useState<DateRange>(() => {
    const today = new Date();
    return { from: subDays(today, 30), to: today };
  });
  const [period2, setPeriod2] = useState<DateRange>(() => {
    const today = new Date();
    return { from: subDays(today, 60), to: subDays(today, 31) };
  });
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [excludedResourceGroups, setExcludedResourceGroups] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: tenants } = useAzureTenants();
  const { data: resourceGroups } = useResourceGroupList(selectedTenantId === 'all' ? undefined : selectedTenantId);
  const { data: meterCategories } = useMeterCategoryList(selectedTenantId === 'all' ? undefined : selectedTenantId);

  // Apply preset
  useEffect(() => {
    const today = new Date();
    
    switch (preset) {
      case 'this-month-vs-last': {
        const thisMonthStart = startOfMonth(today);
        const thisMonthEnd = endOfMonth(today);
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        setPeriod1({ from: thisMonthStart, to: thisMonthEnd });
        setPeriod2({ from: lastMonthStart, to: lastMonthEnd });
        break;
      }
      case 'last-30-vs-previous-30': {
        // Exactly 30 days: subDays(today, 29) to today is 30 days inclusive
        setPeriod1({ from: subDays(today, 29), to: today });
        setPeriod2({ from: subDays(today, 59), to: subDays(today, 30) });
        break;
      }
      case 'this-quarter-vs-last': {
        const thisQuarterStart = startOfQuarter(today);
        const thisQuarterEnd = endOfQuarter(today);
        const lastQuarterStart = startOfQuarter(subQuarters(today, 1));
        const lastQuarterEnd = endOfQuarter(subQuarters(today, 1));
        setPeriod1({ from: thisQuarterStart, to: thisQuarterEnd });
        setPeriod2({ from: lastQuarterStart, to: lastQuarterEnd });
        break;
      }
      case 'this-year-vs-last': {
        const thisYearStart = startOfYear(today);
        const thisYearEnd = endOfYear(today);
        const lastYearStart = startOfYear(subYears(today, 1));
        const lastYearEnd = endOfYear(subYears(today, 1));
        setPeriod1({ from: thisYearStart, to: thisYearEnd });
        setPeriod2({ from: lastYearStart, to: lastYearEnd });
        break;
      }
      case 'custom':
        // Don't change dates
        break;
    }
  }, [preset]);

  // Emit changes
  useEffect(() => {
    const params: CostComparisonParams = {
      period1Start: format(period1.from, 'yyyy-MM-dd'),
      period1End: format(period1.to, 'yyyy-MM-dd'),
      period2Start: format(period2.from, 'yyyy-MM-dd'),
      period2End: format(period2.to, 'yyyy-MM-dd'),
      excludeResourceGroups: excludedResourceGroups,
      tenantId: selectedTenantId === 'all' ? undefined : selectedTenantId,
      meterCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
    };
    onFiltersChange(params);
  }, [period1, period2, excludedResourceGroups, selectedTenantId, selectedCategories, onFiltersChange]);

  const toggleResourceGroup = (rg: string) => {
    setExcludedResourceGroups(prev => 
      prev.includes(rg) ? prev.filter(g => g !== rg) : [...prev, rg]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Top Row: Preset & Tenant */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Preset</label>
            <Select value={preset} onValueChange={(v) => setPreset(v as PresetOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month-vs-last">This Month vs Last Month</SelectItem>
                <SelectItem value="last-30-vs-previous-30">Last 30 Days vs Previous 30</SelectItem>
                <SelectItem value="this-quarter-vs-last">This Quarter vs Last Quarter</SelectItem>
                <SelectItem value="this-year-vs-last">This Year vs Last Year</SelectItem>
                <SelectItem value="custom">Custom Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Tenant</label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Pickers */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Primary Period</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal flex-1")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(period1.from, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={period1.from}
                    onSelect={(date) => date && setPeriod1(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="flex items-center text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal flex-1")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(period1.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={period1.to}
                    onSelect={(date) => date && setPeriod1(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Comparison Period</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal flex-1")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(period2.from, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={period2.from}
                    onSelect={(date) => date && setPeriod2(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="flex items-center text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal flex-1")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(period2.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={period2.to}
                    onSelect={(date) => date && setPeriod2(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Resource Group Exclusions */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Exclude Resource Groups (for apples-to-apples comparison)
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {resourceGroups?.map((rg) => (
              <Badge
                key={rg}
                variant={excludedResourceGroups.includes(rg) ? "destructive" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleResourceGroup(rg)}
              >
                {rg}
                {excludedResourceGroups.includes(rg) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
            {(!resourceGroups || resourceGroups.length === 0) && (
              <span className="text-sm text-muted-foreground">No resource groups found</span>
            )}
          </div>
          {excludedResourceGroups.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {excludedResourceGroups.length} resource group(s) excluded from comparison
            </p>
          )}
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Service Category (optional)</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {meterCategories?.slice(0, 15).map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategories.includes(cat) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
            {(!meterCategories || meterCategories.length === 0) && (
              <span className="text-sm text-muted-foreground">No categories found</span>
            )}
          </div>
          {selectedCategories.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2"
              onClick={() => setSelectedCategories([])}
            >
              Clear category filter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
