-- Clear stale cost data with incorrect 1970-01-01 dates
DELETE FROM azure_cost_data WHERE usage_date = '1970-01-01';