import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

const INTERVAL_OPTIONS = [
  { value: '* * * * *', label: 'Every 1 minute' },
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
];

export function SchedulerSettings() {
  const [cronJob, setCronJob] = useState<CronJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('* * * * *');
  const [isEnabled, setIsEnabled] = useState(true);

  const fetchCronJob = async () => {
    setIsLoading(true);
    try {
      // Using type assertion since these functions are not in the generated types yet
      const { data, error } = await (supabase.rpc as any)('get_monitoring_cron_job');

      if (error) throw error;

      if (data && data.length > 0) {
        const job = data[0] as CronJob;
        setCronJob(job);
        setSelectedInterval(job.schedule);
        setIsEnabled(job.active);
      } else {
        setCronJob(null);
      }
    } catch (error) {
      console.error('Error fetching cron job:', error);
      toast.error('Failed to load scheduler settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCronJob();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Using type assertion since these functions are not in the generated types yet
      const { error } = await (supabase.rpc as any)('update_monitoring_cron_job', {
        new_schedule: selectedInterval,
        is_active: isEnabled
      });

      if (error) throw error;

      toast.success('Scheduler settings updated');
      fetchCronJob();
    } catch (error) {
      console.error('Error updating cron job:', error);
      toast.error('Failed to update scheduler settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getIntervalLabel = (schedule: string) => {
    const option = INTERVAL_OPTIONS.find(opt => opt.value === schedule);
    return option?.label || schedule;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monitoring Scheduler
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
              <Clock className="h-5 w-5" />
              Monitoring Scheduler
            </CardTitle>
            <CardDescription>
              Configure how often monitoring checks run automatically
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchCronJob}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {cronJob ? (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="font-medium">Scheduled Job Status</p>
                <p className="text-sm text-muted-foreground">
                  Current schedule: {getIntervalLabel(cronJob.schedule)}
                </p>
              </div>
              <Badge variant={cronJob.active ? 'default' : 'secondary'}>
                {cronJob.active ? 'Active' : 'Paused'}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled">Enable Scheduler</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, checks will only run manually
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Check Interval</Label>
                <Select value={selectedInterval} onValueChange={setSelectedInterval}>
                  <SelectTrigger id="interval">
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
                <p className="text-sm text-muted-foreground">
                  Shorter intervals provide faster detection but use more resources
                </p>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No scheduled job found</p>
            <p className="text-sm">The monitoring scheduler has not been configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
