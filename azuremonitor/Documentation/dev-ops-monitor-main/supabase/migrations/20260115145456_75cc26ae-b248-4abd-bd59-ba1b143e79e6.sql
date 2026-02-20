UPDATE azure_sync_progress 
SET status = 'failed', 
    completed_at = NOW(), 
    error_message = 'Manual cleanup: Function timeout during processing'
WHERE id = '62624e31-2862-45fa-9d98-a0778974d902';