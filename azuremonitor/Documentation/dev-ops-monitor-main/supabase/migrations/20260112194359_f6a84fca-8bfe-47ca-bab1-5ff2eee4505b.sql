-- Delete metric names that were incorrectly inserted as query hashes
-- These are performance metric names, not actual SQL query hashes
DELETE FROM azure_sql_insights 
WHERE query_hash IN (
  'cpu_percent', 
  'dtu_consumption_percent', 
  'storage_percent', 
  'deadlock', 
  'blocked_by_firewall',
  'connection_successful',
  'connection_failed',
  'workers_percent',
  'sessions_percent',
  'physical_data_read_percent',
  'log_write_percent'
);