UPDATE azure_sync_progress 
SET status = 'failed', 
    completed_at = now(), 
    error_message = 'Manually stopped - sync was stuck due to CPU timeout',
    current_operation = NULL,
    current_resource_name = NULL
WHERE id = 'd8c66e15-410a-4488-81d3-488bde6df79d'