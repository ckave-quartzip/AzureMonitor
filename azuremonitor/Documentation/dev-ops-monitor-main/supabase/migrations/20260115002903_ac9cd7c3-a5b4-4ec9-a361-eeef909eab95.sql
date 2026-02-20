-- Add granular progress tracking columns to azure_sync_progress
ALTER TABLE azure_sync_progress 
  ADD COLUMN IF NOT EXISTS current_operation TEXT,
  ADD COLUMN IF NOT EXISTS current_resource_name TEXT,
  ADD COLUMN IF NOT EXISTS failed_chunks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chunk_details JSONB DEFAULT '[]'::jsonb;