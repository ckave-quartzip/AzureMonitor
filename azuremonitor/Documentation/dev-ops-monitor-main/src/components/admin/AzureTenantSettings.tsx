import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAzureTenants, useCreateAzureTenant, useUpdateAzureTenant, AzureTenant } from '@/hooks/useAzureTenants';
import { AzureTenantList } from './AzureTenantList';
import { AzureTenantForm } from './AzureTenantForm';

export function AzureTenantSettings() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<AzureTenant | undefined>(undefined);

  const { data: tenants = [], isLoading } = useAzureTenants();
  const createTenant = useCreateAzureTenant();
  const updateTenant = useUpdateAzureTenant();

  const handleCreate = () => {
    setEditingTenant(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (tenant: AzureTenant) => {
    setEditingTenant(tenant);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingTenant(undefined);
  };

  const handleSubmit = async (data: {
    name: string;
    tenant_id: string;
    client_id: string;
    subscription_id: string;
    client_secret: string;
    is_enabled: boolean;
  }) => {
    if (editingTenant) {
      // Only include client_secret if it was provided (non-empty)
      const updates = {
        name: data.name,
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        subscription_id: data.subscription_id,
        is_enabled: data.is_enabled,
        ...(data.client_secret ? { client_secret: data.client_secret } : {}),
      };

      await updateTenant.mutateAsync({ id: editingTenant.id, updates });
    } else {
      await createTenant.mutateAsync(data);
    }
    
    handleCancel();
  };

  if (isFormOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {editingTenant ? 'Edit Azure Tenant' : 'Add Azure Tenant'}
          </h2>
        </div>
        <AzureTenantForm
          tenant={editingTenant}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createTenant.isPending || updateTenant.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Azure Tenants</h2>
          <p className="text-sm text-muted-foreground">
            Configure Azure AD app registrations to discover and monitor your Azure resources.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Azure Tenant
        </Button>
      </div>

      <AzureTenantList
        tenants={tenants}
        onEdit={handleEdit}
        isLoading={isLoading}
      />
    </div>
  );
}
