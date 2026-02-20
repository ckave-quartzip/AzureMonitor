import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MoreHorizontal, Pencil, Trash2, DollarSign, Building2, FolderOpen, Box } from 'lucide-react';
import {
  useAzureCostAlertRules,
  useUpdateAzureCostAlertRule,
  useDeleteAzureCostAlertRule,
  AzureCostAlertRule,
} from '@/hooks/useAzureCostAlertRules';
import { AzureCostAlertRuleForm } from './AzureCostAlertRuleForm';

const operatorLabels: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
};

const periodLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export function AzureCostAlertRuleList() {
  const { data: rules, isLoading } = useAzureCostAlertRules();
  const updateRule = useUpdateAzureCostAlertRule();
  const deleteRule = useDeleteAzureCostAlertRule();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AzureCostAlertRule | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AzureCostAlertRule | null>(null);

  const handleEdit = (rule: AzureCostAlertRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleDelete = (rule: AzureCostAlertRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (ruleToDelete) {
      await deleteRule.mutateAsync(ruleToDelete.id);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const toggleEnabled = async (rule: AzureCostAlertRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      updates: { is_enabled: !rule.is_enabled },
    });
  };

  const getScopeIcon = (rule: AzureCostAlertRule) => {
    if (rule.azure_resource_id) return <Box className="h-4 w-4" />;
    if (rule.resource_group) return <FolderOpen className="h-4 w-4" />;
    return <Building2 className="h-4 w-4" />;
  };

  const getScopeLabel = (rule: AzureCostAlertRule) => {
    if (rule.azure_resource?.name) return rule.azure_resource.name;
    if (rule.resource_group) return rule.resource_group;
    return 'Entire Tenant';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Alert Rules
            </CardTitle>
            <CardDescription>
              Configure alerts when Azure costs exceed thresholds
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingRule(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.azure_tenant?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getScopeIcon(rule)}
                        <span className="text-sm">{getScopeLabel(rule)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {operatorLabels[rule.comparison_operator]} ${rule.threshold_amount.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>{periodLabels[rule.threshold_period]}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={() => toggleEnabled(rule)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(rule)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(rule)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No cost alert rules configured</p>
              <p className="text-sm">Create a rule to get notified when costs exceed thresholds</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AzureCostAlertRuleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editingRule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Alert Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{ruleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
