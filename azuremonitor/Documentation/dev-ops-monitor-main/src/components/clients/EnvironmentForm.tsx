import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Environment } from '@/hooks/useEnvironments';
import { EnvironmentAzureConfig } from '@/components/environments/EnvironmentAzureConfig';

const environmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  azure_tenant_id: z.string().uuid().nullable().optional(),
  azure_resource_group: z.string().nullable().optional(),
  azure_tag_filter: z.record(z.string(), z.string()).optional(),
  scope_type: z.enum(['entire_tenant', 'resource_group']).optional(),
});

type EnvironmentFormData = z.infer<typeof environmentSchema>;

export interface EnvironmentFormSubmitData {
  name: string;
  description?: string | null;
  azure_tenant_id?: string | null;
  azure_resource_group?: string | null;
  azure_tag_filter?: Record<string, string> | null;
}

interface EnvironmentFormProps {
  environment?: Environment;
  onSubmit: (data: EnvironmentFormSubmitData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EnvironmentForm({ environment, onSubmit, onCancel, isLoading }: EnvironmentFormProps) {
  // Determine initial scope type based on whether resource_group is set
  const initialScopeType = environment?.azure_resource_group ? 'resource_group' : 'entire_tenant';
  
  const form = useForm<EnvironmentFormData>({
    resolver: zodResolver(environmentSchema),
    defaultValues: {
      name: environment?.name || '',
      description: environment?.description || '',
      azure_tenant_id: environment?.azure_tenant_id || null,
      azure_resource_group: environment?.azure_resource_group || null,
      azure_tag_filter: (environment?.azure_tag_filter as Record<string, string>) || {},
      scope_type: initialScopeType,
    },
  });

  const handleSubmit = (data: EnvironmentFormData) => {
    // Transform data for API submission
    const submitData: EnvironmentFormSubmitData = {
      name: data.name,
      description: data.description || null,
      azure_tenant_id: data.azure_tenant_id || null,
      azure_resource_group: data.scope_type === 'resource_group' ? data.azure_resource_group : null,
      azure_tag_filter: data.azure_tag_filter && Object.keys(data.azure_tag_filter).length > 0 
        ? data.azure_tag_filter 
        : null,
    };
    
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Production, Staging, Development" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Azure Configuration */}
        <EnvironmentAzureConfig
          control={form.control}
          watch={form.watch}
          setValue={form.setValue}
        />

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : environment ? 'Update Environment' : 'Create Environment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
