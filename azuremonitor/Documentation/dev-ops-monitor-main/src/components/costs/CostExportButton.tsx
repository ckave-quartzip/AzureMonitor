import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { CostComparisonResult } from '@/hooks/useCostComparison';

interface CostExportButtonProps {
  data: CostComparisonResult;
  period1Label: string;
  period2Label: string;
}

export function CostExportButton({ data, period1Label, period2Label }: CostExportButtonProps) {
  const handleExport = () => {
    // Prepare CSV content
    const rows: string[][] = [];

    // Summary section
    rows.push(['Cost Comparison Report']);
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Metric', period1Label, period2Label, 'Variance', '% Change']);
    rows.push([
      'Total Cost',
      data.period1.totalCost.toFixed(2),
      data.period2.totalCost.toFixed(2),
      data.variance.absoluteDiff.toFixed(2),
      `${data.variance.percentChange.toFixed(1)}%`,
    ]);
    rows.push([
      'Daily Average',
      data.period1.dailyAverage.toFixed(2),
      data.period2.dailyAverage.toFixed(2),
      '',
      '',
    ]);
    rows.push([
      'Days in Period',
      data.period1.daysInPeriod.toString(),
      data.period2.daysInPeriod.toString(),
      '',
      '',
    ]);
    rows.push([
      'Excluded Cost',
      data.excludedCost.period1.toFixed(2),
      data.excludedCost.period2.toFixed(2),
      '',
      '',
    ]);
    rows.push([]);

    // By Resource Group
    rows.push(['By Resource Group']);
    rows.push(['Resource Group', period1Label, period2Label, 'Variance', '% Change']);
    data.period1.byResourceGroup.forEach((rg) => {
      rows.push([
        rg.name,
        rg.period1Cost.toFixed(2),
        rg.period2Cost.toFixed(2),
        rg.variance.toFixed(2),
        `${rg.percentChange.toFixed(1)}%`,
      ]);
    });
    rows.push([]);

    // By Category
    rows.push(['By Service Category']);
    rows.push(['Category', period1Label, period2Label, 'Variance', '% Change']);
    data.period1.byCategory.forEach((cat) => {
      rows.push([
        cat.name,
        cat.period1Cost.toFixed(2),
        cat.period2Cost.toFixed(2),
        cat.variance.toFixed(2),
        `${cat.percentChange.toFixed(1)}%`,
      ]);
    });
    rows.push([]);

    // By Resource (Top 20)
    rows.push(['By Resource (Top 20)']);
    rows.push(['Resource ID', period1Label, period2Label, 'Variance', '% Change']);
    data.period1.byResource.forEach((res) => {
      rows.push([
        res.name,
        res.period1Cost.toFixed(2),
        res.period2Cost.toFixed(2),
        res.variance.toFixed(2),
        `${res.percentChange.toFixed(1)}%`,
      ]);
    });

    // Convert to CSV string
    const csvContent = rows
      .map((row) =>
        row.map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          if (cell.includes(',') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
      .join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cost-comparison-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
