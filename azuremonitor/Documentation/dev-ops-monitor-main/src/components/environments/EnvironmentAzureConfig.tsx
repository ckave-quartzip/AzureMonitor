import { useState, useEffect } from 'react';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Plus, X, AlertCircle } from 'lucide-react';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { useAzureResourceGroups } from '@/hooks/useAzureResources';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

interface EnvironmentAzureConfigProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export function EnvironmentAzureConfig({ control, watch, setValue }: EnvironmentAzureConfigProps) {
  const { data: tenants, isLoading: tenantsLoading } = useAzureTenants();
  
  const selectedTenantId = watch('azure_tenant_id');
  const scopeType = watch('scope_type') || 'entire_tenant';
  const tagFilters = watch('azure_tag_filter') || {};
  
  const { data: resourceGroups, isLoading: resourceGroupsLoading } = useAzureResourceGroups(selectedTenantId);
  
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  // Reset resource group when scope changes to entire tenant
  useEffect(() => {
    if (scopeType === 'entire_tenant') {
      setValue('azure_resource_group', null);
    }
  }, [scopeType, setValue]);

  // Reset all Azure fields when tenant is cleared
  useEffect(() => {
    if (!selectedTenantId) {
      setValue('azure_resource_group', null);
      setValue('azure_tag_filter', {});
      setValue('scope_type', 'entire_tenant');
    }
  }, [selectedTenantId, setValue]);

  const addTagFilter = () => {
    if (newTagKey && newTagValue) {
      setValue('azure_tag_filter', {
        ...tagFilters,
        [newTagKey]: newTagValue,
      });
      setNewTagKey('');
      setNewTagValue('');
    }
  };

  const removeTagFilter = (key: string) => {
    const { [key]: _, ...rest } = tagFilters;
    setValue('azure_tag_filter', rest);
  };

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Cloud className="h-4 w-4" />
          Azure Integration (Optional)
        </div>

        {/* Tenant Selector */}
        <FormField
          control={control}
          name="azure_tenant_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Azure Tenant</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                value={field.value || 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Azure tenant..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Azure Integration</SelectItem>
                  {tenantsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex flex-col">
                          <span>{tenant.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {tenant.subscription_id}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Link this environment to an Azure subscription
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Scope Selector - Only show when tenant is selected */}
        {selectedTenantId && (
          <>
            <FormField
              control={control}
              name="scope_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Resource Scope</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value || 'entire_tenant'}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="entire_tenant" id="entire_tenant" />
                        <Label htmlFor="entire_tenant" className="font-normal">
                          Entire Subscription
                          <span className="text-muted-foreground ml-2 text-xs">
                            All resources in the subscription
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="resource_group" id="resource_group" />
                        <Label htmlFor="resource_group" className="font-normal">
                          Specific Resource Group
                          <span className="text-muted-foreground ml-2 text-xs">
                            Filter by resource group
                          </span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resource Group Selector - Only show when scope is resource_group */}
            {scopeType === 'resource_group' && (
              <FormField
                control={control}
                name="azure_resource_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Group</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={resourceGroupsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={resourceGroupsLoading ? "Loading..." : "Select resource group..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resourceGroupsLoading ? (
                          <SelectItem value="loading" disabled>Loading resource groups...</SelectItem>
                        ) : resourceGroups?.length === 0 ? (
                          <SelectItem value="none" disabled>No resource groups found</SelectItem>
                        ) : (
                          resourceGroups?.map((rg) => (
                            <SelectItem key={rg.name} value={rg.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{rg.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">{rg.location}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tag Filters */}
            <div className="space-y-3">
              <Label>Tag Filters (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Further filter Azure resources by tags. Only resources matching all tags will be shown.
              </p>
              
              {/* Existing tag filters */}
              {Object.keys(tagFilters).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tagFilters).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="gap-1">
                      {key}={value as string}
                      <button
                        type="button"
                        onClick={() => removeTagFilter(key)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Add new tag filter */}
              <div className="flex gap-2">
                <Input
                  placeholder="Tag key"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Tag value"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTagFilter}
                  disabled={!newTagKey || !newTagValue}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Configuration Summary */}
            {selectedTenant && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Configuration Summary:</p>
                <ul className="space-y-1">
                  <li>• Tenant: {selectedTenant.name}</li>
                  <li>• Scope: {scopeType === 'entire_tenant' ? 'All resources' : `Resource group: ${watch('azure_resource_group') || '(not selected)'}`}</li>
                  <li>• Tag filters: {Object.keys(tagFilters).length > 0 ? Object.entries(tagFilters).map(([k, v]) => `${k}=${v}`).join(', ') : 'None'}</li>
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
