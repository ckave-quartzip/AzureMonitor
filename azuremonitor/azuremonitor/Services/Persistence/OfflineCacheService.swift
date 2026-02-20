import CoreData
import Foundation
import Combine

@MainActor
class OfflineCacheService: ObservableObject {
    static let shared = OfflineCacheService()

    @Published var isOffline = false
    @Published var lastSyncDate: Date?

    private let persistenceController = PersistenceController.shared
    private let userDefaults = UserDefaults.standard

    private let lastSyncKey = "lastOfflineSyncDate"
    private let cacheExpirationMinutes: Double = 30

    init() {
        lastSyncDate = userDefaults.object(forKey: lastSyncKey) as? Date
    }

    // MARK: - Cache Status

    var isCacheStale: Bool {
        guard let lastSync = lastSyncDate else { return true }
        return Date().timeIntervalSince(lastSync) > (cacheExpirationMinutes * 60)
    }

    // MARK: - Resource Caching

    func cacheResources(_ resources: [Resource]) {
        persistenceController.performBackgroundTask { context in
            // Clear existing cached resources
            let fetchRequest: NSFetchRequest<NSFetchRequestResult> = NSFetchRequest(entityName: "CachedResource")
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            try? context.execute(deleteRequest)

            // Insert new resources
            for resource in resources {
                let cached = NSEntityDescription.insertNewObject(forEntityName: "CachedResource", into: context)
                cached.setValue(resource.id, forKey: "id")
                cached.setValue(resource.name, forKey: "name")
                cached.setValue(resource.resourceType.rawValue, forKey: "resourceType")
                cached.setValue(resource.status.rawValue, forKey: "status")
                cached.setValue(resource.clientId, forKey: "clientId")
                cached.setValue(resource.lastCheckedAt, forKey: "lastCheckedAt")
                cached.setValue(Date(), forKey: "cachedAt")
            }

            try? context.save()
            DispatchQueue.main.async {
                self.updateLastSyncDate()
            }
        }
    }

    func getCachedResources() -> [Resource] {
        let context = persistenceController.viewContext
        let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: "CachedResource")

        do {
            let cachedResources = try context.fetch(fetchRequest)
            return cachedResources.compactMap { cached -> Resource? in
                guard let id = cached.value(forKey: "id") as? UUID,
                      let name = cached.value(forKey: "name") as? String,
                      let typeString = cached.value(forKey: "resourceType") as? String,
                      let statusString = cached.value(forKey: "status") as? String,
                      let type = ResourceType(rawValue: typeString),
                      let status = ResourceStatus(rawValue: statusString) else {
                    return nil
                }

                return Resource(
                    id: id,
                    name: name,
                    resourceType: type,
                    status: status,
                    lastCheckedAt: cached.value(forKey: "lastCheckedAt") as? Date,
                    clientId: cached.value(forKey: "clientId") as? UUID,
                    environmentId: nil,
                    url: nil,
                    description: nil,
                    createdAt: nil,
                    updatedAt: nil,
                    isStandalone: nil,
                    azureResourceId: nil,
                    environments: nil
                )
            }
        } catch {
            print("Failed to fetch cached resources: \(error)")
            return []
        }
    }

    // MARK: - Alert Caching

    func cacheAlerts(_ alerts: [Alert]) {
        persistenceController.performBackgroundTask { context in
            // Clear existing cached alerts
            let fetchRequest: NSFetchRequest<NSFetchRequestResult> = NSFetchRequest(entityName: "CachedAlert")
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            try? context.execute(deleteRequest)

            // Insert new alerts
            for alert in alerts {
                let cached = NSEntityDescription.insertNewObject(forEntityName: "CachedAlert", into: context)
                cached.setValue(alert.id, forKey: "id")
                cached.setValue(alert.title, forKey: "title")
                cached.setValue(alert.message, forKey: "message")
                cached.setValue(alert.severity.rawValue, forKey: "severity")
                cached.setValue(alert.status.rawValue, forKey: "status")
                cached.setValue(alert.resourceId, forKey: "resourceId")
                cached.setValue(alert.triggeredAt, forKey: "triggeredAt")
                cached.setValue(Date(), forKey: "cachedAt")
            }

            try? context.save()
        }
    }

    func getCachedAlerts() -> [Alert] {
        let context = persistenceController.viewContext
        let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: "CachedAlert")
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "triggeredAt", ascending: false)]

        do {
            let cachedAlerts = try context.fetch(fetchRequest)
            return cachedAlerts.compactMap { cached -> Alert? in
                guard let id = cached.value(forKey: "id") as? UUID,
                      let message = cached.value(forKey: "message") as? String,
                      let severityString = cached.value(forKey: "severity") as? String,
                      let triggeredAt = cached.value(forKey: "triggeredAt") as? Date,
                      let severity = AlertSeverity(rawValue: severityString) else {
                    return nil
                }

                let resourceName = cached.value(forKey: "title") as? String
                let statusString = cached.value(forKey: "status") as? String
                let status = statusString.flatMap { AlertStatus(rawValue: $0) } ?? .active

                return Alert(
                    id: id,
                    message: message,
                    severity: severity,
                    resourceId: cached.value(forKey: "resourceId") as? UUID,
                    triggeredAt: triggeredAt,
                    acknowledgedAt: status == .acknowledged ? Date() : nil,
                    resolvedAt: status == .resolved ? Date() : nil,
                    resourceName: resourceName,
                    isActive: status == .active,
                    isAcknowledged: status == .acknowledged
                )
            }
        } catch {
            print("Failed to fetch cached alerts: \(error)")
            return []
        }
    }

    // MARK: - Client Caching

    func cacheClients(_ clients: [Client]) {
        persistenceController.performBackgroundTask { context in
            // Clear existing cached clients
            let fetchRequest: NSFetchRequest<NSFetchRequestResult> = NSFetchRequest(entityName: "CachedClient")
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            try? context.execute(deleteRequest)

            // Insert new clients
            for client in clients {
                let cached = NSEntityDescription.insertNewObject(forEntityName: "CachedClient", into: context)
                cached.setValue(client.id, forKey: "id")
                cached.setValue(client.name, forKey: "name")
                cached.setValue(client.status.rawValue, forKey: "status")
                cached.setValue(Date(), forKey: "cachedAt")
            }

            try? context.save()
        }
    }

    func getCachedClients() -> [Client] {
        let context = persistenceController.viewContext
        let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: "CachedClient")

        do {
            let cachedClients = try context.fetch(fetchRequest)
            return cachedClients.compactMap { cached -> Client? in
                guard let id = cached.value(forKey: "id") as? UUID,
                      let name = cached.value(forKey: "name") as? String,
                      let statusString = cached.value(forKey: "status") as? String,
                      let status = ClientStatus(rawValue: statusString) else {
                    return nil
                }

                return Client(
                    id: id,
                    name: name,
                    status: status,
                    contactEmail: nil,
                    description: nil,
                    monthlyHostingFee: nil,
                    createdAt: nil,
                    updatedAt: nil,
                    environments: nil
                )
            }
        } catch {
            print("Failed to fetch cached clients: \(error)")
            return []
        }
    }

    // MARK: - Dashboard Summary Caching

    func cacheDashboardSummary(_ summary: DashboardSummary) {
        persistenceController.performBackgroundTask { context in
            // Clear existing cached dashboard
            let fetchRequest: NSFetchRequest<NSFetchRequestResult> = NSFetchRequest(entityName: "CachedDashboardSummary")
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            try? context.execute(deleteRequest)

            // Insert new dashboard summary
            let cached = NSEntityDescription.insertNewObject(forEntityName: "CachedDashboardSummary", into: context)
            cached.setValue("dashboard", forKey: "id")
            cached.setValue(Int32(summary.resourcesCount), forKey: "totalResources")
            cached.setValue(Int32(summary.resourceStatus.up), forKey: "healthyResources")
            cached.setValue(Int32(summary.resourceStatus.degraded ?? 0), forKey: "warningResources")
            cached.setValue(Int32(summary.resourceStatus.down ?? 0), forKey: "criticalResources")
            cached.setValue(Int32(summary.activeAlertsCount), forKey: "activeAlerts")
            cached.setValue(Int32(summary.clientsCount), forKey: "clientsCount")
            cached.setValue(Int32(summary.openIncidentsCount), forKey: "openIncidents")
            cached.setValue(Date(), forKey: "cachedAt")

            try? context.save()
        }
    }

    func getCachedDashboardSummary() -> DashboardSummary? {
        let context = persistenceController.viewContext
        let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: "CachedDashboardSummary")
        fetchRequest.fetchLimit = 1

        do {
            let results = try context.fetch(fetchRequest)
            guard let cached = results.first else { return nil }

            let up = Int(cached.value(forKey: "healthyResources") as? Int32 ?? 0)
            let down = Int(cached.value(forKey: "criticalResources") as? Int32 ?? 0)
            let degraded = Int(cached.value(forKey: "warningResources") as? Int32 ?? 0)
            let activeAlerts = Int(cached.value(forKey: "activeAlerts") as? Int32 ?? 0)
            let clientsCount = Int(cached.value(forKey: "clientsCount") as? Int32 ?? 0)
            let totalResources = Int(cached.value(forKey: "totalResources") as? Int32 ?? 0)
            let openIncidents = Int(cached.value(forKey: "openIncidents") as? Int32 ?? 0)

            return DashboardSummary(
                clientsCount: clientsCount,
                resourcesCount: totalResources,
                activeAlertsCount: activeAlerts,
                openIncidentsCount: openIncidents,
                resourceStatus: ResourceStatusCounts(up: up, down: down, degraded: degraded, unknown: nil)
            )
        } catch {
            print("Failed to fetch cached dashboard summary: \(error)")
            return nil
        }
    }

    // MARK: - Sync Management

    private func updateLastSyncDate() {
        lastSyncDate = Date()
        userDefaults.set(lastSyncDate, forKey: lastSyncKey)
    }

    func clearCache() {
        persistenceController.performBackgroundTask { context in
            let entityNames = ["CachedResource", "CachedAlert", "CachedClient", "CachedDashboardSummary"]

            for entityName in entityNames {
                let fetchRequest: NSFetchRequest<NSFetchRequestResult> = NSFetchRequest(entityName: entityName)
                let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
                try? context.execute(deleteRequest)
            }

            try? context.save()

            DispatchQueue.main.async {
                self.lastSyncDate = nil
                self.userDefaults.removeObject(forKey: self.lastSyncKey)
            }
        }
    }

    // MARK: - Full Sync

    func performFullSync() async {
        do {
            let apiClient = APIClient.shared

            // Fetch and cache resources
            let resources: [Resource] = try await apiClient.request(.resources())
            cacheResources(resources)

            // Fetch and cache alerts
            let alerts: [Alert] = try await apiClient.request(.alerts())
            cacheAlerts(alerts)

            // Fetch and cache clients
            let clients: [Client] = try await apiClient.request(.clients())
            cacheClients(clients)

            // Fetch and cache dashboard summary
            let summary: DashboardSummary = try await apiClient.request(.dashboardSummary)
            cacheDashboardSummary(summary)

            isOffline = false
        } catch {
            print("Failed to sync data: \(error)")
            isOffline = true
        }
    }
}
