import { AppHeader } from '@/components/layout/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertList } from '@/components/alerts/AlertList';
import { AlertRuleList } from '@/components/alerts/AlertRuleList';
import { NotificationChannelList } from '@/components/alerts/NotificationChannelList';
import { AzureCostAlertList } from '@/components/alerts/AzureCostAlertList';
import { AzureCostAlertRuleList } from '@/components/alerts/AzureCostAlertRuleList';
import { AlertTriangle, Bell, Send, DollarSign } from 'lucide-react';

export default function Alerts() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground mt-2">
            Manage alert rules, notification channels, and view triggered alerts
          </p>
        </div>

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Triggered Alerts
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alert Rules
            </TabsTrigger>
            <TabsTrigger value="cost-alerts" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Azure Cost Alerts
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Notification Channels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <AlertList />
          </TabsContent>

          <TabsContent value="rules">
            <AlertRuleList />
          </TabsContent>

          <TabsContent value="cost-alerts">
            <div className="space-y-6">
              <AzureCostAlertList />
              <AzureCostAlertRuleList />
            </div>
          </TabsContent>

          <TabsContent value="channels">
            <NotificationChannelList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
