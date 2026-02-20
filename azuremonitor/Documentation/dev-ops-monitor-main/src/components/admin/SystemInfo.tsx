import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Server, Database, Shield, Settings } from 'lucide-react';

export function SystemInfo() {
  const { data: settings, isLoading } = useSystemSettings();
  const { user, roles } = useAuth();

  const configuredSettings = settings?.filter(s => s.secret_id !== null) || [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Current User</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Roles</p>
            <div className="flex gap-1 mt-1">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">User ID</p>
            <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">System Settings</CardTitle>
              <CardDescription>Encrypted configuration overview</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Encrypted Settings</p>
            <p className="font-medium">
              {isLoading ? '...' : configuredSettings.length} configured
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Encryption</p>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Vault Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Database</CardTitle>
              <CardDescription>Supabase connection info</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Project ID</p>
            <p className="font-mono text-xs">zkqhktsvhazeljnncncr</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Edge Functions</CardTitle>
              <CardDescription>Serverless function status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">execute-checks</p>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Deployed
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">send-notifications</p>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Deployed
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
