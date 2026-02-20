import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Cloud, Layers, MapPin } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
}

interface ResourceSummary {
  name: string;
  type: string;
  location: string;
  resource_group: string;
}

interface TestConnectionResult {
  success: boolean;
  message?: string;
  subscriptions?: Subscription[];
  error?: string;
}

interface TestResourcesResult {
  success: boolean;
  total_resources?: number;
  resource_groups?: Array<{ name: string; location: string }>;
  by_type?: Record<string, number>;
  by_resource_group?: Record<string, number>;
  sample_resources?: ResourceSummary[];
  error?: string;
}

interface AzureTenantTestResultsProps {
  connectionResult: TestConnectionResult | null;
  resourcesResult: TestResourcesResult | null;
}

export function AzureTenantTestResults({ connectionResult, resourcesResult }: AzureTenantTestResultsProps) {
  if (!connectionResult && !resourcesResult) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connection Result */}
      {connectionResult && (
        <Card className={connectionResult.success ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {connectionResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              Connection Test {connectionResult.success ? 'Passed' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionResult.success && connectionResult.subscriptions && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Found {connectionResult.subscriptions.length} accessible subscription(s):
                </p>
                <div className="flex flex-wrap gap-2">
                  {connectionResult.subscriptions.map((sub) => (
                    <Badge key={sub.id} variant="secondary">
                      <Cloud className="h-3 w-3 mr-1" />
                      {sub.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {connectionResult.error && (
              <p className="text-sm text-red-500">{connectionResult.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resources Result */}
      {resourcesResult && (
        <Card className={resourcesResult.success ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {resourcesResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              Resource Fetch Test {resourcesResult.success ? 'Passed' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resourcesResult.success ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{resourcesResult.total_resources}</p>
                    <p className="text-xs text-muted-foreground">Total Resources</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{resourcesResult.resource_groups?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Resource Groups</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{Object.keys(resourcesResult.by_type || {}).length}</p>
                    <p className="text-xs text-muted-foreground">Resource Types</p>
                  </div>
                </div>

                {/* Resource Groups */}
                {resourcesResult.resource_groups && resourcesResult.resource_groups.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Resource Groups
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {resourcesResult.resource_groups.slice(0, 10).map((rg) => (
                        <Badge key={rg.name} variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          {rg.name} ({rg.location})
                        </Badge>
                      ))}
                      {resourcesResult.resource_groups.length > 10 && (
                        <Badge variant="secondary">
                          +{resourcesResult.resource_groups.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Resources by Type */}
                {resourcesResult.by_type && Object.keys(resourcesResult.by_type).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Resources by Type</h4>
                    <ScrollArea className="h-32">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(resourcesResult.by_type)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 15)
                          .map(([type, count]) => (
                            <Badge key={type} variant="secondary">
                              {type.split('/').pop()} ({count})
                            </Badge>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Sample Resources Table */}
                {resourcesResult.sample_resources && resourcesResult.sample_resources.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sample Resources (first 20)</h4>
                    <ScrollArea className="h-48 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Resource Group</TableHead>
                            <TableHead>Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resourcesResult.sample_resources.map((resource, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{resource.name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {resource.type.split('/').pop()}
                              </TableCell>
                              <TableCell>{resource.resource_group}</TableCell>
                              <TableCell>{resource.location}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-500">{resourcesResult.error}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
