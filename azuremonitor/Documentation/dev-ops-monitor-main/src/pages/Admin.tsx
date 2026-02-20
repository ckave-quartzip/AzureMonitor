import { AppHeader } from '@/components/layout/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Office365SettingsForm } from '@/components/admin/Office365SettingsForm';
import { GeneralSettings } from '@/components/admin/GeneralSettings';
import { SystemInfo } from '@/components/admin/SystemInfo';
import { SchedulerSettings } from '@/components/admin/SchedulerSettings';
import { UserManagement } from '@/components/admin/UserManagement';
import { AzureTenantSettings } from '@/components/admin/AzureTenantSettings';
import { AzureSyncScheduler } from '@/components/admin/AzureSyncScheduler';
import { LogAnalyticsSettings } from '@/components/admin/LogAnalyticsSettings';
import { AzureHistoricalSync } from '@/components/admin/AzureHistoricalSync';
import { ApiKeyManagement } from '@/components/admin/ApiKeyManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Settings, Mail, Info, Clock, Users, Globe, Cloud, Key } from 'lucide-react';

export default function Admin() {
  const { isAdmin, isLoading } = useAuth();

  // Redirect non-admins
  if (!isLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Settings</h1>
              <p className="text-muted-foreground">
                Manage system configuration and integrations
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="gap-2">
              <Clock className="h-4 w-4" />
              Scheduler
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Settings
            </TabsTrigger>
            <TabsTrigger value="azure" className="gap-2">
              <Cloud className="h-4 w-4" />
              Azure
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Info className="h-4 w-4" />
              System Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4">
            <ApiKeyManagement />
          </TabsContent>

          <TabsContent value="scheduler" className="space-y-4">
            <SchedulerSettings />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Office365SettingsForm />
          </TabsContent>

          <TabsContent value="azure" className="space-y-6">
            <AzureTenantSettings />
            <AzureSyncScheduler />
            <AzureHistoricalSync />
            <LogAnalyticsSettings />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <SystemInfo />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
