export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_notification_channels: {
        Row: {
          alert_rule_id: string
          created_at: string
          id: string
          notification_channel_id: string
        }
        Insert: {
          alert_rule_id: string
          created_at?: string
          id?: string
          notification_channel_id: string
        }
        Update: {
          alert_rule_id?: string
          created_at?: string
          id?: string
          notification_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notification_channels_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notification_channels_notification_channel_id_fkey"
            columns: ["notification_channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rule_exclusions: {
        Row: {
          alert_rule_id: string
          created_at: string | null
          id: string
          resource_id: string
        }
        Insert: {
          alert_rule_id: string
          created_at?: string | null
          id?: string
          resource_id: string
        }
        Update: {
          alert_rule_id?: string
          created_at?: string | null
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rule_exclusions_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rule_exclusions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          aggregation_type: string | null
          azure_resource_id: string | null
          azure_resource_type: string | null
          azure_tenant_id: string | null
          comparison_operator: string
          created_at: string
          id: string
          is_enabled: boolean
          is_template: boolean | null
          name: string | null
          quiet_hours_days: string[] | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          resource_id: string | null
          resource_type: string | null
          rule_type: Database["public"]["Enums"]["alert_rule_type"]
          threshold_value: number
          timeframe_minutes: number | null
          updated_at: string
        }
        Insert: {
          aggregation_type?: string | null
          azure_resource_id?: string | null
          azure_resource_type?: string | null
          azure_tenant_id?: string | null
          comparison_operator?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_template?: boolean | null
          name?: string | null
          quiet_hours_days?: string[] | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          resource_id?: string | null
          resource_type?: string | null
          rule_type: Database["public"]["Enums"]["alert_rule_type"]
          threshold_value: number
          timeframe_minutes?: number | null
          updated_at?: string
        }
        Update: {
          aggregation_type?: string | null
          azure_resource_id?: string | null
          azure_resource_type?: string | null
          azure_tenant_id?: string | null
          comparison_operator?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_template?: boolean | null
          name?: string | null
          quiet_hours_days?: string[] | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          resource_id?: string | null
          resource_type?: string | null
          rule_type?: Database["public"]["Enums"]["alert_rule_type"]
          threshold_value?: number
          timeframe_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_rule_id: string | null
          id: string
          message: string
          notification_suppressed: boolean | null
          resolved_at: string | null
          resource_id: string
          severity: Database["public"]["Enums"]["alert_severity"]
          suppression_reason: string | null
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_rule_id?: string | null
          id?: string
          message: string
          notification_suppressed?: boolean | null
          resolved_at?: string | null
          resource_id: string
          severity: Database["public"]["Enums"]["alert_severity"]
          suppression_reason?: string | null
          triggered_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_rule_id?: string | null
          id?: string
          message?: string
          notification_suppressed?: boolean | null
          resolved_at?: string | null
          resource_id?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          suppression_reason?: string | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_enabled: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          request_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          request_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          request_count?: number | null
        }
        Relationships: []
      }
      azure_cost_alert_rules: {
        Row: {
          azure_resource_id: string | null
          azure_tenant_id: string | null
          comparison_operator: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          name: string
          quiet_hours_days: string[] | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          resource_group: string | null
          threshold_amount: number
          threshold_period: string
          updated_at: string | null
        }
        Insert: {
          azure_resource_id?: string | null
          azure_tenant_id?: string | null
          comparison_operator?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          quiet_hours_days?: string[] | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          resource_group?: string | null
          threshold_amount: number
          threshold_period?: string
          updated_at?: string | null
        }
        Update: {
          azure_resource_id?: string | null
          azure_tenant_id?: string | null
          comparison_operator?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          quiet_hours_days?: string[] | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          resource_group?: string | null
          threshold_amount?: number
          threshold_period?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_cost_alert_rules_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_cost_alert_rules_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_cost_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          azure_tenant_id: string | null
          current_cost: number
          id: string
          message: string
          notification_suppressed: boolean | null
          resolved_at: string | null
          rule_id: string | null
          severity: string
          suppression_reason: string | null
          threshold_amount: number
          triggered_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          azure_tenant_id?: string | null
          current_cost: number
          id?: string
          message: string
          notification_suppressed?: boolean | null
          resolved_at?: string | null
          rule_id?: string | null
          severity?: string
          suppression_reason?: string | null
          threshold_amount: number
          triggered_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          azure_tenant_id?: string | null
          current_cost?: number
          id?: string
          message?: string
          notification_suppressed?: boolean | null
          resolved_at?: string | null
          rule_id?: string | null
          severity?: string
          suppression_reason?: string | null
          threshold_amount?: number
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_cost_alerts_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_cost_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "azure_cost_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_cost_anomalies: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_cost: number
          anomaly_date: string
          anomaly_type: string
          azure_resource_id: string | null
          azure_tenant_id: string
          created_at: string
          deviation_percent: number
          expected_cost: number
          id: string
          is_acknowledged: boolean | null
          notes: string | null
          resource_group: string | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_cost: number
          anomaly_date: string
          anomaly_type: string
          azure_resource_id?: string | null
          azure_tenant_id: string
          created_at?: string
          deviation_percent: number
          expected_cost: number
          id?: string
          is_acknowledged?: boolean | null
          notes?: string | null
          resource_group?: string | null
          severity?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_cost?: number
          anomaly_date?: string
          anomaly_type?: string
          azure_resource_id?: string | null
          azure_tenant_id?: string
          created_at?: string
          deviation_percent?: number
          expected_cost?: number
          id?: string
          is_acknowledged?: boolean | null
          notes?: string | null
          resource_group?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_cost_anomalies_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_cost_anomalies_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_cost_data: {
        Row: {
          azure_resource_id: string | null
          azure_tenant_id: string
          billing_period: string | null
          cost_amount: number
          created_at: string
          currency: string
          id: string
          meter_category: string | null
          meter_name: string | null
          meter_subcategory: string | null
          resource_group: string | null
          usage_date: string
          usage_quantity: number | null
          usage_unit: string | null
        }
        Insert: {
          azure_resource_id?: string | null
          azure_tenant_id: string
          billing_period?: string | null
          cost_amount: number
          created_at?: string
          currency?: string
          id?: string
          meter_category?: string | null
          meter_name?: string | null
          meter_subcategory?: string | null
          resource_group?: string | null
          usage_date: string
          usage_quantity?: number | null
          usage_unit?: string | null
        }
        Update: {
          azure_resource_id?: string | null
          azure_tenant_id?: string
          billing_period?: string | null
          cost_amount?: number
          created_at?: string
          currency?: string
          id?: string
          meter_category?: string | null
          meter_name?: string | null
          meter_subcategory?: string | null
          resource_group?: string | null
          usage_date?: string
          usage_quantity?: number | null
          usage_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_cost_data_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_credentials: {
        Row: {
          azure_client_id: string
          azure_client_secret: string
          client_id: string
          created_at: string
          id: string
          subscription_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          azure_client_id: string
          azure_client_secret: string
          client_id: string
          created_at?: string
          id?: string
          subscription_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          azure_client_id?: string
          azure_client_secret?: string
          client_id?: string
          created_at?: string
          id?: string
          subscription_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_idle_resources: {
        Row: {
          azure_resource_id: string
          azure_tenant_id: string
          created_at: string
          detection_date: string
          id: string
          idle_days: number
          idle_reason: string
          ignored_at: string | null
          ignored_by: string | null
          ignored_reason: string | null
          metrics_summary: Json | null
          monthly_cost: number
          status: string
          updated_at: string
        }
        Insert: {
          azure_resource_id: string
          azure_tenant_id: string
          created_at?: string
          detection_date?: string
          id?: string
          idle_days: number
          idle_reason: string
          ignored_at?: string | null
          ignored_by?: string | null
          ignored_reason?: string | null
          metrics_summary?: Json | null
          monthly_cost: number
          status?: string
          updated_at?: string
        }
        Update: {
          azure_resource_id?: string
          azure_tenant_id?: string
          created_at?: string
          detection_date?: string
          id?: string
          idle_days?: number
          idle_reason?: string
          ignored_at?: string | null
          ignored_by?: string | null
          ignored_reason?: string | null
          metrics_summary?: Json | null
          monthly_cost?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_idle_resources_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_idle_resources_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_metrics: {
        Row: {
          average: number | null
          azure_resource_id: string
          count: number | null
          created_at: string
          id: string
          maximum: number | null
          metric_name: string
          metric_namespace: string
          minimum: number | null
          timestamp_utc: string
          total: number | null
          unit: string | null
        }
        Insert: {
          average?: number | null
          azure_resource_id: string
          count?: number | null
          created_at?: string
          id?: string
          maximum?: number | null
          metric_name: string
          metric_namespace: string
          minimum?: number | null
          timestamp_utc: string
          total?: number | null
          unit?: string | null
        }
        Update: {
          average?: number | null
          azure_resource_id?: string
          count?: number | null
          created_at?: string
          id?: string
          maximum?: number | null
          metric_name?: string
          metric_namespace?: string
          minimum?: number | null
          timestamp_utc?: string
          total?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_metrics_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_resources: {
        Row: {
          azure_resource_id: string
          azure_tenant_id: string
          created_at: string
          id: string
          kind: string | null
          location: string
          name: string
          optimization_score: number | null
          properties: Json | null
          resource_group: string
          resource_type: string
          score_breakdown: Json | null
          score_updated_at: string | null
          sku: Json | null
          synced_at: string
          tags: Json | null
          updated_at: string
        }
        Insert: {
          azure_resource_id: string
          azure_tenant_id: string
          created_at?: string
          id?: string
          kind?: string | null
          location: string
          name: string
          optimization_score?: number | null
          properties?: Json | null
          resource_group: string
          resource_type: string
          score_breakdown?: Json | null
          score_updated_at?: string | null
          sku?: Json | null
          synced_at?: string
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          azure_resource_id?: string
          azure_tenant_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          location?: string
          name?: string
          optimization_score?: number | null
          properties?: Json | null
          resource_group?: string
          resource_type?: string
          score_breakdown?: Json | null
          score_updated_at?: string | null
          sku?: Json | null
          synced_at?: string
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_resources_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sql_insights: {
        Row: {
          avg_cpu_time_ms: number
          avg_duration_ms: number
          avg_logical_reads: number
          avg_logical_writes: number
          azure_resource_id: string
          created_at: string
          execution_count: number
          id: string
          last_execution_time: string | null
          plan_count: number | null
          query_hash: string
          query_text: string | null
          synced_at: string
          total_cpu_time_ms: number
          total_duration_ms: number
          total_logical_reads: number
          total_logical_writes: number
          updated_at: string
        }
        Insert: {
          avg_cpu_time_ms?: number
          avg_duration_ms?: number
          avg_logical_reads?: number
          avg_logical_writes?: number
          azure_resource_id: string
          created_at?: string
          execution_count?: number
          id?: string
          last_execution_time?: string | null
          plan_count?: number | null
          query_hash: string
          query_text?: string | null
          synced_at?: string
          total_cpu_time_ms?: number
          total_duration_ms?: number
          total_logical_reads?: number
          total_logical_writes?: number
          updated_at?: string
        }
        Update: {
          avg_cpu_time_ms?: number
          avg_duration_ms?: number
          avg_logical_reads?: number
          avg_logical_writes?: number
          azure_resource_id?: string
          created_at?: string
          execution_count?: number
          id?: string
          last_execution_time?: string | null
          plan_count?: number | null
          query_hash?: string
          query_text?: string | null
          synced_at?: string
          total_cpu_time_ms?: number
          total_duration_ms?: number
          total_logical_reads?: number
          total_logical_writes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_sql_insights_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sql_performance_stats: {
        Row: {
          azure_resource_id: string | null
          blocked_count: number | null
          connection_count: number | null
          cpu_percent: number | null
          data_space_allocated_bytes: number | null
          data_space_used_bytes: number | null
          deadlock_count: number | null
          dtu_percent: number | null
          id: string
          log_space_used_bytes: number | null
          log_space_used_percent: number | null
          max_size_bytes: number | null
          storage_percent: number | null
          synced_at: string | null
          timestamp_utc: string
        }
        Insert: {
          azure_resource_id?: string | null
          blocked_count?: number | null
          connection_count?: number | null
          cpu_percent?: number | null
          data_space_allocated_bytes?: number | null
          data_space_used_bytes?: number | null
          deadlock_count?: number | null
          dtu_percent?: number | null
          id?: string
          log_space_used_bytes?: number | null
          log_space_used_percent?: number | null
          max_size_bytes?: number | null
          storage_percent?: number | null
          synced_at?: string | null
          timestamp_utc: string
        }
        Update: {
          azure_resource_id?: string | null
          blocked_count?: number | null
          connection_count?: number | null
          cpu_percent?: number | null
          data_space_allocated_bytes?: number | null
          data_space_used_bytes?: number | null
          deadlock_count?: number | null
          dtu_percent?: number | null
          id?: string
          log_space_used_bytes?: number | null
          log_space_used_percent?: number | null
          max_size_bytes?: number | null
          storage_percent?: number | null
          synced_at?: string | null
          timestamp_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_sql_performance_stats_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sql_recommendations: {
        Row: {
          azure_resource_id: string | null
          category: string | null
          created_at: string | null
          first_seen_at: string | null
          id: string
          impact: string | null
          impacted_field: string | null
          impacted_value: string | null
          is_resolved: boolean | null
          last_seen_at: string | null
          name: string
          problem: string | null
          recommendation_id: string
          solution: string | null
        }
        Insert: {
          azure_resource_id?: string | null
          category?: string | null
          created_at?: string | null
          first_seen_at?: string | null
          id?: string
          impact?: string | null
          impacted_field?: string | null
          impacted_value?: string | null
          is_resolved?: boolean | null
          last_seen_at?: string | null
          name: string
          problem?: string | null
          recommendation_id: string
          solution?: string | null
        }
        Update: {
          azure_resource_id?: string | null
          category?: string | null
          created_at?: string | null
          first_seen_at?: string | null
          id?: string
          impact?: string | null
          impacted_field?: string | null
          impacted_value?: string | null
          is_resolved?: boolean | null
          last_seen_at?: string | null
          name?: string
          problem?: string | null
          recommendation_id?: string
          solution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_sql_recommendations_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sql_replication_lag_history: {
        Row: {
          id: string
          lag_seconds: number | null
          recorded_at: string | null
          replication_link_id: string
          replication_state: string | null
        }
        Insert: {
          id?: string
          lag_seconds?: number | null
          recorded_at?: string | null
          replication_link_id: string
          replication_state?: string | null
        }
        Update: {
          id?: string
          lag_seconds?: number | null
          recorded_at?: string | null
          replication_link_id?: string
          replication_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_sql_replication_lag_history_replication_link_id_fkey"
            columns: ["replication_link_id"]
            isOneToOne: false
            referencedRelation: "azure_sql_replication_links"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sql_replication_links: {
        Row: {
          azure_resource_id: string
          created_at: string | null
          id: string
          is_termination_allowed: boolean | null
          last_replicated_time: string | null
          link_id: string
          partner_database: string
          partner_location: string | null
          partner_server: string
          percent_complete: number | null
          replication_lag_seconds: number | null
          replication_mode: string | null
          replication_state: string | null
          role: string | null
          synced_at: string | null
        }
        Insert: {
          azure_resource_id: string
          created_at?: string | null
          id?: string
          is_termination_allowed?: boolean | null
          last_replicated_time?: string | null
          link_id: string
          partner_database: string
          partner_location?: string | null
          partner_server: string
          percent_complete?: number | null
          replication_lag_seconds?: number | null
          replication_mode?: string | null
          replication_state?: string | null
          role?: string | null
          synced_at?: string | null
        }
        Update: {
          azure_resource_id?: string
          created_at?: string | null
          id?: string
          is_termination_allowed?: boolean | null
          last_replicated_time?: string | null
          link_id?: string
          partner_database?: string
          partner_location?: string | null
          partner_server?: string
          percent_complete?: number | null
          replication_lag_seconds?: number | null
          replication_mode?: string | null
          replication_state?: string | null
          role?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_sql_replication_links_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sql_wait_stats: {
        Row: {
          avg_wait_time_ms: number | null
          azure_resource_id: string | null
          collected_at: string | null
          id: string
          max_wait_time_ms: number | null
          synced_at: string | null
          wait_count: number | null
          wait_time_ms: number | null
          wait_type: string
        }
        Insert: {
          avg_wait_time_ms?: number | null
          azure_resource_id?: string | null
          collected_at?: string | null
          id?: string
          max_wait_time_ms?: number | null
          synced_at?: string | null
          wait_count?: number | null
          wait_time_ms?: number | null
          wait_type: string
        }
        Update: {
          avg_wait_time_ms?: number | null
          azure_resource_id?: string | null
          collected_at?: string | null
          id?: string
          max_wait_time_ms?: number | null
          synced_at?: string | null
          wait_count?: number | null
          wait_time_ms?: number | null
          wait_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_sql_wait_stats_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sync_logs: {
        Row: {
          azure_tenant_id: string
          completed_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          records_processed: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          azure_tenant_id: string
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          azure_tenant_id?: string
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "azure_sync_logs_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sync_progress: {
        Row: {
          chunk_details: Json | null
          completed_at: string | null
          completed_chunks: number | null
          created_at: string | null
          created_by: string | null
          current_operation: string | null
          current_resource_name: string | null
          end_date: string | null
          error_message: string | null
          estimated_completion_at: string | null
          failed_chunks: number | null
          id: string
          processing_rate: number | null
          records_synced: number | null
          start_date: string | null
          started_at: string | null
          status: string
          sync_type: string
          tenant_id: string
          total_chunks: number | null
        }
        Insert: {
          chunk_details?: Json | null
          completed_at?: string | null
          completed_chunks?: number | null
          created_at?: string | null
          created_by?: string | null
          current_operation?: string | null
          current_resource_name?: string | null
          end_date?: string | null
          error_message?: string | null
          estimated_completion_at?: string | null
          failed_chunks?: number | null
          id?: string
          processing_rate?: number | null
          records_synced?: number | null
          start_date?: string | null
          started_at?: string | null
          status?: string
          sync_type: string
          tenant_id: string
          total_chunks?: number | null
        }
        Update: {
          chunk_details?: Json | null
          completed_at?: string | null
          completed_chunks?: number | null
          created_at?: string | null
          created_by?: string | null
          current_operation?: string | null
          current_resource_name?: string | null
          end_date?: string | null
          error_message?: string | null
          estimated_completion_at?: string | null
          failed_chunks?: number | null
          id?: string
          processing_rate?: number | null
          records_synced?: number | null
          start_date?: string | null
          started_at?: string | null
          status?: string
          sync_type?: string
          tenant_id?: string
          total_chunks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_sync_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_tenants: {
        Row: {
          client_id: string
          client_secret_id: string | null
          created_at: string
          id: string
          is_enabled: boolean
          last_sync_at: string | null
          name: string
          subscription_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          name: string
          subscription_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          name?: string
          subscription_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      check_results: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          monitoring_check_id: string
          response_time_ms: number | null
          ssl_days_remaining: number | null
          ssl_expiry_date: string | null
          status: Database["public"]["Enums"]["check_result_status"]
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          monitoring_check_id: string
          response_time_ms?: number | null
          ssl_days_remaining?: number | null
          ssl_expiry_date?: string | null
          status: Database["public"]["Enums"]["check_result_status"]
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          monitoring_check_id?: string
          response_time_ms?: number | null
          ssl_days_remaining?: number | null
          ssl_expiry_date?: string | null
          status?: Database["public"]["Enums"]["check_result_status"]
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_monitoring_check_id_fkey"
            columns: ["monitoring_check_id"]
            isOneToOne: false
            referencedRelation: "monitoring_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          yearly_hosting_fee: number | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          yearly_hosting_fee?: number | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          yearly_hosting_fee?: number | null
        }
        Relationships: []
      }
      environments: {
        Row: {
          azure_resource_group: string | null
          azure_tag_filter: Json | null
          azure_tenant_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          azure_resource_group?: string | null
          azure_tag_filter?: Json | null
          azure_tenant_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          azure_resource_group?: string | null
          azure_tag_filter?: Json | null
          azure_tenant_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "environments_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_alerts: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          incident_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          incident_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_alerts_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          started_at: string
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      log_analytics_workspaces: {
        Row: {
          azure_tenant_id: string | null
          created_at: string | null
          id: string
          resource_id: string
          updated_at: string | null
          workspace_id: string
          workspace_name: string
        }
        Insert: {
          azure_tenant_id?: string | null
          created_at?: string | null
          id?: string
          resource_id: string
          updated_at?: string | null
          workspace_id: string
          workspace_name: string
        }
        Update: {
          azure_tenant_id?: string | null
          created_at?: string | null
          id?: string
          resource_id?: string
          updated_at?: string | null
          workspace_id?: string
          workspace_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_analytics_workspaces_azure_tenant_id_fkey"
            columns: ["azure_tenant_id"]
            isOneToOne: false
            referencedRelation: "azure_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_windows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          is_recurring: boolean | null
          recurrence_pattern: string | null
          resource_id: string
          starts_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          resource_id: string
          starts_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          resource_id?: string
          starts_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_windows_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_checks: {
        Row: {
          aggregation_type: string | null
          azure_metric_name: string | null
          azure_metric_namespace: string | null
          check_interval_seconds: number
          check_type: Database["public"]["Enums"]["check_type"]
          confirmation_delay_ms: number | null
          created_at: string
          current_failure_count: number | null
          custom_headers: Json | null
          expected_status_code: number | null
          failure_threshold: number | null
          heartbeat_interval_seconds: number | null
          heartbeat_token: string | null
          http_auth_credentials: Json | null
          http_auth_type: string | null
          http_method: string | null
          id: string
          ip_address: string | null
          is_enabled: boolean
          keyword_type: string | null
          keyword_value: string | null
          last_heartbeat_at: string | null
          metric_comparison_operator: string | null
          metric_threshold_value: number | null
          port: number | null
          resource_id: string
          retry_count: number | null
          retry_delay_ms: number | null
          timeframe_minutes: number | null
          timeout_seconds: number
          updated_at: string
          url: string | null
        }
        Insert: {
          aggregation_type?: string | null
          azure_metric_name?: string | null
          azure_metric_namespace?: string | null
          check_interval_seconds?: number
          check_type: Database["public"]["Enums"]["check_type"]
          confirmation_delay_ms?: number | null
          created_at?: string
          current_failure_count?: number | null
          custom_headers?: Json | null
          expected_status_code?: number | null
          failure_threshold?: number | null
          heartbeat_interval_seconds?: number | null
          heartbeat_token?: string | null
          http_auth_credentials?: Json | null
          http_auth_type?: string | null
          http_method?: string | null
          id?: string
          ip_address?: string | null
          is_enabled?: boolean
          keyword_type?: string | null
          keyword_value?: string | null
          last_heartbeat_at?: string | null
          metric_comparison_operator?: string | null
          metric_threshold_value?: number | null
          port?: number | null
          resource_id: string
          retry_count?: number | null
          retry_delay_ms?: number | null
          timeframe_minutes?: number | null
          timeout_seconds?: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          aggregation_type?: string | null
          azure_metric_name?: string | null
          azure_metric_namespace?: string | null
          check_interval_seconds?: number
          check_type?: Database["public"]["Enums"]["check_type"]
          confirmation_delay_ms?: number | null
          created_at?: string
          current_failure_count?: number | null
          custom_headers?: Json | null
          expected_status_code?: number | null
          failure_threshold?: number | null
          heartbeat_interval_seconds?: number | null
          heartbeat_token?: string | null
          http_auth_credentials?: Json | null
          http_auth_type?: string | null
          http_method?: string | null
          id?: string
          ip_address?: string | null
          is_enabled?: boolean
          keyword_type?: string | null
          keyword_value?: string | null
          last_heartbeat_at?: string | null
          metric_comparison_operator?: string | null
          metric_threshold_value?: number | null
          port?: number | null
          resource_id?: string
          retry_count?: number | null
          retry_delay_ms?: number | null
          timeframe_minutes?: number | null
          timeout_seconds?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_checks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          channel_type: Database["public"]["Enums"]["notification_channel_type"]
          configuration: Json
          created_at: string
          id: string
          is_enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["notification_channel_type"]
          configuration?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["notification_channel_type"]
          configuration?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          azure_resource_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          environment_id: string | null
          id: string
          is_standalone: boolean
          last_checked_at: string | null
          name: string
          resource_type: string
          status: Database["public"]["Enums"]["resource_status"]
          updated_at: string
        }
        Insert: {
          azure_resource_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          environment_id?: string | null
          id?: string
          is_standalone?: boolean
          last_checked_at?: string | null
          name: string
          resource_type: string
          status?: Database["public"]["Enums"]["resource_status"]
          updated_at?: string
        }
        Update: {
          azure_resource_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          environment_id?: string | null
          id?: string
          is_standalone?: boolean
          last_checked_at?: string | null
          name?: string
          resource_type?: string
          status?: Database["public"]["Enums"]["resource_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_azure_resource_id_fkey"
            columns: ["azure_resource_id"]
            isOneToOne: false
            referencedRelation: "azure_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          secret_id: string | null
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          secret_id?: string | null
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          secret_id?: string | null
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stuck_sync_jobs: { Args: never; Returns: number }
      delete_encrypted_setting: {
        Args: { p_setting_key: string }
        Returns: boolean
      }
      get_azure_sync_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_decrypted_setting: {
        Args: { p_setting_key: string }
        Returns: string
      }
      get_monitoring_cron_job: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_rolling_cost_stats:
        | {
            Args: { p_days_back?: number }
            Returns: {
              current_period_end: string
              current_period_start: string
              current_period_total: number
              previous_period_total: number
            }[]
          }
        | {
            Args: { p_days_back?: number; p_tenant_ids?: string[] }
            Returns: {
              current_period_end: string
              current_period_start: string
              current_period_total: number
              previous_period_total: number
            }[]
          }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setting_exists: { Args: { p_setting_key: string }; Returns: boolean }
      update_api_key_usage: { Args: { p_key_id: string }; Returns: undefined }
      update_monitoring_cron_job: {
        Args: { is_active: boolean; new_schedule: string }
        Returns: undefined
      }
      upsert_azure_sync_cron_job: {
        Args: { p_is_active: boolean; p_job_name: string; p_schedule: string }
        Returns: undefined
      }
      upsert_encrypted_setting: {
        Args: { p_description?: string; p_setting_key: string; p_value: string }
        Returns: string
      }
      validate_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          is_valid: boolean
          key_id: string
          key_name: string
        }[]
      }
    }
    Enums: {
      alert_rule_type:
        | "downtime"
        | "ssl_expiry"
        | "response_time"
        | "consecutive_failures"
        | "azure_cost_threshold"
        | "azure_cost_anomaly"
        | "azure_cpu_usage"
        | "azure_memory_usage"
        | "azure_dtu_usage"
        | "azure_storage_usage"
        | "azure_network_in"
        | "azure_network_out"
        | "azure_http_errors"
        | "azure_response_time"
        | "azure_requests"
        | "azure_disk_read"
        | "azure_disk_write"
        | "azure_transactions"
        | "azure_availability"
      alert_severity: "critical" | "warning" | "info"
      app_role: "admin" | "editor" | "viewer"
      check_result_status: "success" | "failure" | "timeout"
      check_type:
        | "http"
        | "ping"
        | "port"
        | "ssl"
        | "keyword"
        | "heartbeat"
        | "azure_metric"
        | "azure_health"
      incident_status: "open" | "investigating" | "resolved"
      notification_channel_type: "email" | "slack" | "teams" | "webhook"
      resource_status: "up" | "down" | "degraded" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_rule_type: [
        "downtime",
        "ssl_expiry",
        "response_time",
        "consecutive_failures",
        "azure_cost_threshold",
        "azure_cost_anomaly",
        "azure_cpu_usage",
        "azure_memory_usage",
        "azure_dtu_usage",
        "azure_storage_usage",
        "azure_network_in",
        "azure_network_out",
        "azure_http_errors",
        "azure_response_time",
        "azure_requests",
        "azure_disk_read",
        "azure_disk_write",
        "azure_transactions",
        "azure_availability",
      ],
      alert_severity: ["critical", "warning", "info"],
      app_role: ["admin", "editor", "viewer"],
      check_result_status: ["success", "failure", "timeout"],
      check_type: [
        "http",
        "ping",
        "port",
        "ssl",
        "keyword",
        "heartbeat",
        "azure_metric",
        "azure_health",
      ],
      incident_status: ["open", "investigating", "resolved"],
      notification_channel_type: ["email", "slack", "teams", "webhook"],
      resource_status: ["up", "down", "degraded", "unknown"],
    },
  },
} as const
