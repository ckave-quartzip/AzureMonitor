import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Cloud, Loader2, RefreshCw, Clock, Database, DollarSign, Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

interface SyncLog {
  id: string;
  azure_tenant_id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_processed: number | null;
  error_message: string | null;
}

interface SyncJobConfig {
  name: string;
  jobName: string;
  icon: React.ReactNode;
  description: string;
  syncType: string;
}

const SYNC_JOBS: SyncJobConfig[] = [
  {
    name: 'Resource Sync',
    jobName: 'azure-sync-resources',
    icon: <Database className="h-4 w-4" />,
    description: 'Discovers and syncs Azure resources',
    syncType: 'resources',
  },
  {
    name: 'Cost Sync',
    jobName: 'azure-sync-costs',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Syncs Azure cost and billing data',
    syncType: 'costs',
  },
  {
    name: 'Metrics Sync',
    jobName: 'azure-sync-metrics',
    icon: <Activity className="h-4 w-4" />,
    description: 'Syncs Azure resource metrics',
    syncType: 'metrics',
  },
  {
    name: 'SQL Insights Sync',
    jobName: 'azure-sync-sql-insights',
    icon: <Database className="h-4 w-4" />,
    description: 'Syncs SQL performance stats, recommendations, and wait stats',
    syncType: 'sql-insights',
  },
];

const INTERVAL_OPTIONS = [
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours' },
  { value: '0 */4 * * *', label: 'Every 4 hours' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 */12 * * *', label: 'Every 12 hours' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
];

export function AzureSyncScheduler() {
  const [cronJobs, setCronJobs] = useState<Record<string, CronJob | null>>({});
  const [syncLogs, setSyncLogs] = useState<Record<string, SyncLog | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingJob, setSavingJob] = useState<string | null>(null);
  const [intervals, setIntervals] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  const fetchCronJobs = async () => {
    setIsLoading(true);
    try {
      // Fetch all Azure sync cron jobs
      const { data: jobsData, error: jobsError } = await supabase.rpc('get_azure_sync_cron_jobs' as any);
      
      if (jobsError) {
        // If the function doesn't exist yet, just set empty state
        console.log('Cron jobs function not available:', jobsError);
        const emptyJobs: Record<string, CronJob | null> = {};
        const defaultIntervals: Record<string, string> = {};
        const defaultEnabled: Record<string, boolean> = {};
        
        SYNC_JOBS.forEach(job => {
          emptyJobs[job.jobName] = null;
          defaultIntervals[job.jobName] = '0 * * * *'; // Default to hourly
          defaultEnabled[job.jobName] = false;
        });
        
        setCronJobs(emptyJobs);
        setIntervals(defaultIntervals);
        setEnabled(defaultEnabled);
      } else if (jobsData) {
        const jobs: Record<string, CronJob | null> = {};
        const newIntervals: Record<string, string> = {};
        const newEnabled: Record<string, boolean> = {};
        
        SYNC_JOBS.forEach(job => {
          const matchedJob = (jobsData as CronJob[]).find(j => j.jobname === job.jobName);
          jobs[job.jobName] = matchedJob || null;
          newIntervals[job.jobName] = matchedJob?.schedule || '0 * * * *';
          newEnabled[job.jobName] = matchedJob?.active ?? false;
        });
        
        setCronJobs(jobs);
        setIntervals(newIntervals);
        setEnabled(newEnabled);
      }

      // Fetch latest sync logs for each type
      const { data: logsData, error: logsError } = await supabase
        .from('azure_sync_logs')
        .select('*')
        .in('sync_type', SYNC_JOBS.map(j => j.syncType))
        .order('started_at', { ascending: false });

      if (!logsError && logsData) {
        const latestLogs: Record<string, SyncLog | null> = {};
        SYNC_JOBS.forEach(job => {
          const log = logsData.find(l => l.sync_type === job.syncType);
          latestLogs[job.syncType] = log || null;
        });
        setSyncLogs(latestLogs);
      }
    } catch (error) {
      console.error('Error fetching cron jobs:', error);
      toast.error('Failed to load Azure sync settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCronJobs();
  }, []);

  const handleSave = async (jobName: string, syncType: string) => {
    setSavingJob(jobName);
    try {
      const { error } = await supabase.rpc('upsert_azure_sync_cron_job' as any, {
        p_job_name: jobName,
        p_schedule: intervals[jobName],
        p_is_active: enabled[jobName]
      });

      if (error) throw error;

      toast.success(`${getSyncJobConfig(jobName)?.name} schedule updated`);
      fetchCronJobs();
    } catch (error) {
      console.error('Error updating cron job:', error);
      toast.error('Failed to update sync schedule. Database function may need to be created.');
    } finally {
      setSavingJob(null);
    }
  };

  const handleManualSync = async (syncType: string) => {
    const jobConfig = SYNC_JOBS.find(j => j.syncType === syncType);
    if (!jobConfig) return;

    toast.info(`Starting ${jobConfig.name.toLowerCase()}...`);
    
    try {
      const { error } = await supabase.functions.invoke(`azure-sync-${syncType}`);
      
      if (error) throw error;
      
      toast.success(`${jobConfig.name} completed`);
      fetchCronJobs(); // Refresh to get new log
    } catch (error) {
      console.error('Error running manual sync:', error);
      toast.error(`Failed to run ${jobConfig.name.toLowerCase()}`);
    }
  };

  const getSyncJobConfig = (jobName: string) => {
    return SYNC_JOBS.find(j => j.jobName === jobName);
  };

  const getIntervalLabel = (schedule: string) => {
    const option = INTERVAL_OPTIONS.find(opt => opt.value === schedule);
    return option?.label || schedule;
  };

  const getStatusBadge = (log: SyncLog | null) => {
    if (!log) {
      return <Badge variant="secondary">Never run</Badge>;
    }
    
    switch (log.status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {log.status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Azure Sync Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Azure Sync Scheduler
            </CardTitle>
            <CardDescription>
              Configure automated syncing of Azure resources, costs, and metrics
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchCronJobs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {SYNC_JOBS.map((job, index) => {
          const cronJob = cronJobs[job.jobName];
          const log = syncLogs[job.syncType];
          
          return (
            <div key={job.jobName}>
              {index > 0 && <Separator className="my-6" />}
              
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {job.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{job.name}</h4>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(log)}
                </div>

                {/* Last Run Info */}
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last run:</span>
                    {log ? (
                      <span>
                        {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                        <span className="text-muted-foreground ml-2">
                          ({format(new Date(log.started_at), 'MMM d, yyyy HH:mm')})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Never</span>
                    )}
                  </div>
                  {log?.records_processed !== null && log?.records_processed !== undefined && (
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Records processed: {log.records_processed}
                    </p>
                  )}
                  {log?.error_message && (
                    <p className="text-sm text-destructive mt-1 ml-6">
                      Error: {log.error_message}
                    </p>
                  )}
                </div>

                {/* Schedule Controls */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Select 
                      value={intervals[job.jobName]} 
                      onValueChange={(value) => setIntervals(prev => ({ ...prev, [job.jobName]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVAL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center h-10 gap-3">
                        <Switch
                          checked={enabled[job.jobName] ?? false}
                          onCheckedChange={(checked) => setEnabled(prev => ({ ...prev, [job.jobName]: checked }))}
                        />
                        <span className="text-sm">
                          {enabled[job.jobName] ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSave(job.jobName, job.syncType)} 
                    disabled={savingJob === job.jobName}
                    size="sm"
                  >
                    {savingJob === job.jobName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Schedule
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleManualSync(job.syncType)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Now
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        <Separator className="my-6" />
        
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Note</h4>
          <p className="text-sm text-muted-foreground">
            Cron jobs require database functions to be set up. If you see errors when saving, 
            the required database functions may need to be created first via a migration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
