import Foundation
import SwiftUI

struct SQLDatabase: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let azureTenantId: UUID?
    let azureResourceId: String?
    let resourceGroup: String?
    let resourceType: String?
    let location: String?
    let kind: String?
    let syncedAt: Date?
    let createdAt: Date?
    let updatedAt: Date?
    // Nested tenant info
    let azureTenants: AzureTenantInfo?

    // Computed properties for UI compatibility
    var serverName: String { resourceGroup ?? "Unknown" }
    var tenantId: UUID? { azureTenantId }
    var status: SQLDatabaseStatus { .online } // Default since API doesn't provide
    var dtuUsage: Double? { nil }
    var cpuPercent: Double? { nil }
    var storagePercent: Double? { nil }
    var maxSizeBytes: Int64? { nil }
    var currentSizeBytes: Int64? { nil }
    var edition: String? { kind }
    var serviceObjective: String? { resourceType }
    var lastCheckedAt: Date? { syncedAt }

    enum CodingKeys: String, CodingKey {
        case id, name, location, kind
        case azureTenantId = "azure_tenant_id"
        case azureResourceId = "azure_resource_id"
        case resourceGroup = "resource_group"
        case resourceType = "resource_type"
        case syncedAt = "synced_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case azureTenants = "azure_tenants"
    }

    // Initialize from an AzureResource
    init(from azureResource: AzureResource) {
        self.id = azureResource.id
        self.name = azureResource.name
        self.azureTenantId = azureResource.azureTenantId
        self.azureResourceId = azureResource.azureResourceId
        self.resourceGroup = azureResource.resourceGroup
        self.resourceType = azureResource.resourceType
        self.location = azureResource.location
        self.kind = azureResource.kind
        self.syncedAt = azureResource.syncedAt
        self.createdAt = azureResource.createdAt
        self.updatedAt = azureResource.updatedAt
        self.azureTenants = azureResource.azureTenants
    }

    var healthScore: Int {
        var score = 100

        if let cpu = cpuPercent {
            if cpu > 90 { score -= 30 }
            else if cpu > 75 { score -= 15 }
        }

        if let dtu = dtuUsage {
            if dtu > 90 { score -= 30 }
            else if dtu > 75 { score -= 15 }
        }

        if let storage = storagePercent {
            if storage > 90 { score -= 20 }
            else if storage > 80 { score -= 10 }
        }

        return max(0, score)
    }

    var healthColor: Color {
        switch healthScore {
        case 80...100: return .statusUp
        case 50...79: return .statusDegraded
        default: return .statusDown
        }
    }
}

enum SQLDatabaseStatus: String, Codable {
    case online = "Online"
    case offline = "Offline"
    case restoring = "Restoring"
    case recovering = "Recovering"
    case suspended = "Suspended"
    case unknown = "Unknown"

    // Handle case variations from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        switch rawValue.lowercased() {
        case "online": self = .online
        case "offline": self = .offline
        case "restoring": self = .restoring
        case "recovering": self = .recovering
        case "suspended": self = .suspended
        default: self = .unknown
        }
    }

    var color: Color {
        switch self {
        case .online: return .statusUp
        case .offline: return .statusDown
        case .restoring, .recovering: return .statusDegraded
        case .suspended, .unknown: return .statusUnknown
        }
    }
}

struct SQLDatabaseMetrics: Codable {
    let databaseId: UUID?
    let period: String?
    let dataPoints: [SQLMetricDataPoint]

    enum CodingKeys: String, CodingKey {
        case databaseId = "database_id"
        case period
        case dataPoints = "data_points"
        case metrics
    }

    init(from decoder: Decoder) throws {
        // Try decoding as a structured object first
        if let container = try? decoder.container(keyedBy: CodingKeys.self) {
            databaseId = try? container.decode(UUID.self, forKey: .databaseId)
            period = try? container.decode(String.self, forKey: .period)

            // Try data_points first, then metrics
            if let points = try? container.decode([SQLMetricDataPoint].self, forKey: .dataPoints) {
                dataPoints = points
            } else if let points = try? container.decode([SQLMetricDataPoint].self, forKey: .metrics) {
                dataPoints = points
            } else {
                dataPoints = []
            }
        } else if let singleValueContainer = try? decoder.singleValueContainer(),
                  let points = try? singleValueContainer.decode([SQLMetricDataPoint].self) {
            // API might return just an array directly
            databaseId = nil
            period = nil
            dataPoints = points
        } else {
            databaseId = nil
            period = nil
            dataPoints = []
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(databaseId, forKey: .databaseId)
        try container.encodeIfPresent(period, forKey: .period)
        try container.encode(dataPoints, forKey: .dataPoints)
    }

    init(databaseId: UUID? = nil, period: String? = nil, dataPoints: [SQLMetricDataPoint]) {
        self.databaseId = databaseId
        self.period = period
        self.dataPoints = dataPoints
    }
}

struct SQLMetricDataPoint: Codable, Identifiable {
    var id: Date { timestamp }
    let timestamp: Date
    let cpuPercent: Double?
    let dtuPercent: Double?
    let storagePercent: Double?
    let connectionCount: Int?

    enum CodingKeys: String, CodingKey {
        case timestamp
        case cpuPercent = "cpu_percent"
        case dtuPercent = "dtu_percent"
        case storagePercent = "storage_percent"
        case connectionCount = "connection_count"
    }
}

struct SQLQuery: Codable, Identifiable {
    let id: UUID
    let databaseId: UUID?
    let queryHash: String?
    let queryText: String
    let executionCount: Int
    let totalCpuTimeMs: Double?
    let avgCpuTimeMs: Double
    let totalElapsedTimeMs: Double?
    let avgElapsedTimeMs: Double?
    let totalLogicalReads: Int64?
    let avgLogicalReads: Double?
    let lastExecutionTime: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case databaseId = "database_id"
        case queryHash = "query_hash"
        case queryText = "query_text"
        case executionCount = "execution_count"
        case totalCpuTimeMs = "total_cpu_time_ms"
        case avgCpuTimeMs = "avg_cpu_time_ms"
        case totalElapsedTimeMs = "total_elapsed_time_ms"
        case avgElapsedTimeMs = "avg_elapsed_time_ms"
        case totalLogicalReads = "total_logical_reads"
        case avgLogicalReads = "avg_logical_reads"
        case lastExecutionTime = "last_execution_time"
    }
}

struct SQLWaitStatistic: Codable, Identifiable {
    var id: String { waitType }
    let waitType: String
    let waitingTasksCount: Int64
    let waitTimeMs: Double
    let maxWaitTimeMs: Double?
    let signalWaitTimeMs: Double?

    enum CodingKeys: String, CodingKey {
        case waitType = "wait_type"
        case waitingTasksCount = "waiting_tasks_count"
        case waitTimeMs = "wait_time_ms"
        case maxWaitTimeMs = "max_wait_time_ms"
        case signalWaitTimeMs = "signal_wait_time_ms"
    }
}

struct SQLMissingIndex: Codable, Identifiable {
    let id: UUID
    let databaseId: UUID?
    let tableName: String
    let equalityColumns: String?
    let inequalityColumns: String?
    let includedColumns: String?
    let userSeeks: Int64?
    let userScans: Int64?
    let avgTotalUserCost: Double?
    let avgUserImpact: Double
    let improvementScore: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case databaseId = "database_id"
        case tableName = "table_name"
        case equalityColumns = "equality_columns"
        case inequalityColumns = "inequality_columns"
        case includedColumns = "included_columns"
        case userSeeks = "user_seeks"
        case userScans = "user_scans"
        case avgTotalUserCost = "avg_total_user_cost"
        case avgUserImpact = "avg_user_impact"
        case improvementScore = "improvement_score"
    }

    var createIndexStatement: String {
        var columns: [String] = []
        if let eq = equalityColumns { columns.append(eq) }
        if let ineq = inequalityColumns { columns.append(ineq) }

        var statement = "CREATE INDEX IX_\(tableName.replacingOccurrences(of: ".", with: "_")) ON \(tableName) (\(columns.joined(separator: ", ")))"

        if let included = includedColumns {
            statement += " INCLUDE (\(included))"
        }

        return statement
    }
}

struct SQLReplicationStatus: Codable {
    let databaseId: UUID?
    let isPrimaryReplica: Bool
    let replicationState: String?
    let synchronizationHealth: String
    let lastCommitTime: Date?
    let lastHardenedTime: Date?
    let logSendQueueSize: Int64?
    let logSendRate: Double?
    let redoQueueSize: Int64?
    let redoRate: Double?

    enum CodingKeys: String, CodingKey {
        case databaseId = "database_id"
        case isPrimaryReplica = "is_primary_replica"
        case replicationState = "replication_state"
        case synchronizationHealth = "synchronization_health"
        case lastCommitTime = "last_commit_time"
        case lastHardenedTime = "last_hardened_time"
        case logSendQueueSize = "log_send_queue_size"
        case logSendRate = "log_send_rate"
        case redoQueueSize = "redo_queue_size"
        case redoRate = "redo_rate"
    }
}

// MARK: - New API Response Models

/// Response from /azure/sql/:resourceId/performance
struct SQLPerformanceStats: Codable {
    let cpuPercent: Double?
    let dtuPercent: Double?
    let storagePercent: Double?
    let connectionCount: Int?
    let deadlockCount: Int?
    let timestamp: Date?

    enum CodingKeys: String, CodingKey {
        case cpuPercent = "cpu_percent"
        case dtuPercent = "dtu_percent"
        case storagePercent = "storage_percent"
        case connectionCount = "connection_count"
        case deadlockCount = "deadlock_count"
        case timestamp
    }
}

/// Response from /azure/sql/:resourceId/insights
struct SQLQueryInsight: Codable, Identifiable {
    var id: String { queryHash ?? UUID().uuidString }
    let queryHash: String?
    let queryText: String?
    let executionCount: Int?
    let totalCpuTimeMs: Double?
    let avgCpuTimeMs: Double?
    let totalDurationMs: Double?
    let avgDurationMs: Double?
    let totalLogicalReads: Int64?
    let avgLogicalReads: Double?
    let totalLogicalWrites: Int64?
    let avgLogicalWrites: Double?
    let lastExecutionTime: Date?

    enum CodingKeys: String, CodingKey {
        case queryHash = "query_hash"
        case queryText = "query_text"
        case executionCount = "execution_count"
        case totalCpuTimeMs = "total_cpu_time_ms"
        case avgCpuTimeMs = "avg_cpu_time_ms"
        case totalDurationMs = "total_duration_ms"
        case avgDurationMs = "avg_duration_ms"
        case totalLogicalReads = "total_logical_reads"
        case avgLogicalReads = "avg_logical_reads"
        case totalLogicalWrites = "total_logical_writes"
        case avgLogicalWrites = "avg_logical_writes"
        case lastExecutionTime = "last_execution_time"
    }
}

/// Response from /azure/sql/:resourceId/recommendations
struct SQLRecommendation: Codable, Identifiable {
    let id: UUID
    let type: String?
    let impact: String?
    let reason: String?
    let details: String?
    let script: String?
    let estimatedImpact: Double?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, type, impact, reason, details, script
        case estimatedImpact = "estimated_impact"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? container.decode(UUID.self, forKey: .id)) ?? UUID()
        type = try container.decodeIfPresent(String.self, forKey: .type)
        impact = try container.decodeIfPresent(String.self, forKey: .impact)
        reason = try container.decodeIfPresent(String.self, forKey: .reason)
        details = try container.decodeIfPresent(String.self, forKey: .details)
        script = try container.decodeIfPresent(String.self, forKey: .script)
        estimatedImpact = try container.decodeIfPresent(Double.self, forKey: .estimatedImpact)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
    }
}

/// Response from /sql/stats/summary
struct SQLStatsSummary: Codable {
    let totalDatabases: Int
    let averageCpuPercent: Double?
    let averageDtuPercent: Double?
    let averageStoragePercent: Double?
    let averageHealthScore: Int?
    let recommendations: SQLRecommendationsSummary?

    enum CodingKeys: String, CodingKey {
        case totalDatabases = "total_databases"
        case averageCpuPercent = "average_cpu_percent"
        case averageDtuPercent = "average_dtu_percent"
        case averageStoragePercent = "average_storage_percent"
        case averageHealthScore = "average_health_score"
        case recommendations
    }
}

struct SQLRecommendationsSummary: Codable {
    let total: Int?
    let byImpact: [String: Int]?

    enum CodingKeys: String, CodingKey {
        case total
        case byImpact = "by_impact"
    }
}

/// Response from /sql/databases/overview
struct SQLDatabaseOverview: Codable, Identifiable {
    let id: UUID
    let name: String
    let resourceType: String?
    let location: String?
    let tenantName: String?
    let optimizationScore: Int?
    let latestStats: SQLLatestStats?
    let recommendationCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, location
        case resourceType = "resource_type"
        case tenantName = "tenant_name"
        case optimizationScore = "optimization_score"
        case latestStats = "latest_stats"
        case recommendationCount = "recommendation_count"
    }
}

struct SQLLatestStats: Codable {
    let cpuPercent: Double?
    let dtuPercent: Double?
    let storagePercent: Double?
    let connectionCount: Int?
    let deadlockCount: Int?

    enum CodingKeys: String, CodingKey {
        case cpuPercent = "cpu_percent"
        case dtuPercent = "dtu_percent"
        case storagePercent = "storage_percent"
        case connectionCount = "connection_count"
        case deadlockCount = "deadlock_count"
    }
}

/// Response from /azure/sql/:resourceId/storage
struct SQLStorageInfo: Codable {
    let current: SQLStorageCurrent?
    let trend: [SQLStorageTrendPoint]?
    let growthRate: SQLStorageGrowthRate?

    enum CodingKeys: String, CodingKey {
        case current, trend
        case growthRate = "growth_rate"
    }
}

struct SQLStorageCurrent: Codable {
    let usedBytes: Int64?
    let allocatedBytes: Int64?
    let maxBytes: Int64?
    let usedPercent: Double?

    enum CodingKeys: String, CodingKey {
        case usedBytes = "used_bytes"
        case allocatedBytes = "allocated_bytes"
        case maxBytes = "max_bytes"
        case usedPercent = "used_percent"
    }
}

struct SQLStorageTrendPoint: Codable, Identifiable {
    var id: Date { timestamp ?? Date() }
    let timestamp: Date?
    let usedBytes: Int64?
    let usedPercent: Double?

    enum CodingKeys: String, CodingKey {
        case timestamp
        case usedBytes = "used_bytes"
        case usedPercent = "used_percent"
    }
}

struct SQLStorageGrowthRate: Codable {
    let bytesPerDay: Int64?
    let percentChange: Double?

    enum CodingKeys: String, CodingKey {
        case bytesPerDay = "bytes_per_day"
        case percentChange = "percent_change"
    }
}
