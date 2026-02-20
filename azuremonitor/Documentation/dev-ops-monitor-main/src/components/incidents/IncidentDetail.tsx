import { format } from 'date-fns';
import { AlertTriangle, Clock, Link2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Incident, useIncidentAlerts, useUnlinkAlertFromIncident } from '@/hooks/useIncidents';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
};

const SEVERITY_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

interface IncidentDetailProps {
  incident: Incident;
}

export function IncidentDetail({ incident }: IncidentDetailProps) {
  const { isEditor } = useAuth();
  const { data: linkedAlerts, isLoading } = useIncidentAlerts(incident.id);
  const unlinkAlert = useUnlinkAlertFromIncident();

  return (
    <div className="space-y-6">
      {/* Incident Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <Badge variant="outline" className="mt-1">
            {STATUS_LABELS[incident.status] || incident.status}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Severity</p>
          <Badge variant="outline" className="mt-1">
            {SEVERITY_LABELS[incident.severity] || incident.severity}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Started At</p>
          <p className="text-sm mt-1">{format(new Date(incident.started_at), 'PPpp')}</p>
        </div>
        {incident.resolved_at && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Resolved At</p>
            <p className="text-sm mt-1">{format(new Date(incident.resolved_at), 'PPpp')}</p>
          </div>
        )}
      </div>

      {incident.description && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
          <p className="text-sm bg-muted p-3 rounded-md">{incident.description}</p>
        </div>
      )}

      {incident.root_cause && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Root Cause</p>
          <p className="text-sm bg-muted p-3 rounded-md">{incident.root_cause}</p>
        </div>
      )}

      {incident.resolution_notes && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Resolution Notes</p>
          <p className="text-sm bg-muted p-3 rounded-md">{incident.resolution_notes}</p>
        </div>
      )}

      <Separator />

      {/* Linked Alerts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Linked Alerts
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !linkedAlerts || linkedAlerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No alerts linked to this incident</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {linkedAlerts.map((link) => {
              const alert = link.alerts as any;
              const resource = alert?.resources;

              return (
                <Card key={link.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="text-sm font-medium">
                          {resource?.name || 'Unknown Resource'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {alert?.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Triggered: {format(new Date(alert?.triggered_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    {isEditor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkAlert.mutate(link.id)}
                        disabled={unlinkAlert.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <div>
              <p className="text-sm font-medium">Incident Created</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(incident.created_at), 'PPpp')}
              </p>
            </div>
          </div>
          {incident.resolved_at && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="text-sm font-medium">Incident Resolved</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(incident.resolved_at), 'PPpp')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
