import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, ExternalLink, DollarSign, MapPin, Folder, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAzureResourcesByType } from '@/hooks/useAzureResourcesByType';

interface AzureResourceTypeListProps {
  resourceType: string;
  displayName: string;
  onBack: () => void;
}

export function AzureResourceTypeList({ resourceType, displayName, onBack }: AzureResourceTypeListProps) {
  const navigate = useNavigate();
  const { data: resources, isLoading } = useAzureResourcesByType(resourceType);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'location'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const filteredAndSortedResources = useMemo(() => {
    if (!resources) return [];
    
    let result = resources.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.resource_group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'cost':
          comparison = a.monthly_cost - b.monthly_cost;
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [resources, searchQuery, sortBy, sortDir]);

  const toggleSort = (column: 'name' | 'cost' | 'location') => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const totalCost = useMemo(() => {
    return (resources || []).reduce((sum, r) => sum + r.monthly_cost, 0);
  }, [resources]);

  const handleRowClick = (resourceId: string) => {
    navigate(`/azure/resources/${resourceId}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {displayName}
              <Badge variant="secondary">{resources?.length || 0} resources</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Total monthly spend: {formatCurrency(totalCost)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredAndSortedResources.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? 'No resources match your search' : 'No resources found'}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('name')}
                  >
                    Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Resource Group</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('location')}
                  >
                    Location {sortBy === 'location' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('cost')}
                  >
                    Monthly Cost {sortBy === 'cost' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Last Sync</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedResources.map((resource) => (
                  <TableRow 
                    key={resource.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(resource.id)}
                  >
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Folder className="h-3 w-3" />
                        {resource.resource_group}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {resource.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{resource.tenant_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {formatCurrency(resource.monthly_cost)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(resource.synced_at), { addSuffix: true })}
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
      </CardContent>
    </Card>
  );
}
