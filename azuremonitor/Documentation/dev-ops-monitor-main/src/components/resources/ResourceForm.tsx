import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Resource } from '@/hooks/useResources';

const resourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  resource_type: z.string().min(1, 'Resource type is required'),
  description: z.string().optional(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

const RESOURCE_TYPES = [
  { value: 'server', label: 'Server' },
  { value: 'database', label: 'Database' },
  { value: 'website', label: 'Website' },
  { value: 'api', label: 'API' },
  { value: 'storage', label: 'Storage' },
  { value: 'container', label: 'Container' },
  { value: 'load_balancer', label: 'Load Balancer' },
  { value: 'cdn', label: 'CDN' },
  { value: 'dns', label: 'DNS' },
  { value: 'other', label: 'Other' },
];

interface ResourceFormProps {
  resource?: Resource;
  onSubmit: (data: ResourceFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ResourceForm({ resource, onSubmit, onCancel, isLoading }: ResourceFormProps) {
  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: resource?.name || '',
      resource_type: resource?.resource_type || '',
      description: resource?.description || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Production Web Server" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resource_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Resource description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : resource ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
