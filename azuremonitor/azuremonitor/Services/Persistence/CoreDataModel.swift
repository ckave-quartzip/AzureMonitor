import CoreData
import Foundation

// MARK: - Programmatic Core Data Model

extension PersistenceController {

    /// Creates the Core Data model programmatically
    static func createManagedObjectModel() -> NSManagedObjectModel {
        let model = NSManagedObjectModel()

        // CachedResource Entity
        let cachedResourceEntity = NSEntityDescription()
        cachedResourceEntity.name = "CachedResource"
        cachedResourceEntity.managedObjectClassName = "CachedResource"

        let resourceId = NSAttributeDescription()
        resourceId.name = "id"
        resourceId.attributeType = .UUIDAttributeType
        resourceId.isOptional = false

        let resourceName = NSAttributeDescription()
        resourceName.name = "name"
        resourceName.attributeType = .stringAttributeType
        resourceName.isOptional = false

        let resourceType = NSAttributeDescription()
        resourceType.name = "resourceType"
        resourceType.attributeType = .stringAttributeType
        resourceType.isOptional = false

        let resourceStatus = NSAttributeDescription()
        resourceStatus.name = "status"
        resourceStatus.attributeType = .stringAttributeType
        resourceStatus.isOptional = false

        let resourceClientId = NSAttributeDescription()
        resourceClientId.name = "clientId"
        resourceClientId.attributeType = .UUIDAttributeType
        resourceClientId.isOptional = true

        let resourceLastCheckedAt = NSAttributeDescription()
        resourceLastCheckedAt.name = "lastCheckedAt"
        resourceLastCheckedAt.attributeType = .dateAttributeType
        resourceLastCheckedAt.isOptional = true

        let resourceResponseTime = NSAttributeDescription()
        resourceResponseTime.name = "lastResponseTime"
        resourceResponseTime.attributeType = .doubleAttributeType
        resourceResponseTime.isOptional = true

        let resourceCachedAt = NSAttributeDescription()
        resourceCachedAt.name = "cachedAt"
        resourceCachedAt.attributeType = .dateAttributeType
        resourceCachedAt.isOptional = false

        cachedResourceEntity.properties = [
            resourceId, resourceName, resourceType, resourceStatus,
            resourceClientId, resourceLastCheckedAt, resourceResponseTime, resourceCachedAt
        ]

        // CachedAlert Entity
        let cachedAlertEntity = NSEntityDescription()
        cachedAlertEntity.name = "CachedAlert"
        cachedAlertEntity.managedObjectClassName = "CachedAlert"

        let alertId = NSAttributeDescription()
        alertId.name = "id"
        alertId.attributeType = .UUIDAttributeType
        alertId.isOptional = false

        let alertTitle = NSAttributeDescription()
        alertTitle.name = "title"
        alertTitle.attributeType = .stringAttributeType
        alertTitle.isOptional = false

        let alertMessage = NSAttributeDescription()
        alertMessage.name = "message"
        alertMessage.attributeType = .stringAttributeType
        alertMessage.isOptional = false

        let alertSeverity = NSAttributeDescription()
        alertSeverity.name = "severity"
        alertSeverity.attributeType = .stringAttributeType
        alertSeverity.isOptional = false

        let alertStatus = NSAttributeDescription()
        alertStatus.name = "status"
        alertStatus.attributeType = .stringAttributeType
        alertStatus.isOptional = false

        let alertResourceId = NSAttributeDescription()
        alertResourceId.name = "resourceId"
        alertResourceId.attributeType = .UUIDAttributeType
        alertResourceId.isOptional = true

        let alertTriggeredAt = NSAttributeDescription()
        alertTriggeredAt.name = "triggeredAt"
        alertTriggeredAt.attributeType = .dateAttributeType
        alertTriggeredAt.isOptional = false

        let alertCachedAt = NSAttributeDescription()
        alertCachedAt.name = "cachedAt"
        alertCachedAt.attributeType = .dateAttributeType
        alertCachedAt.isOptional = false

        cachedAlertEntity.properties = [
            alertId, alertTitle, alertMessage, alertSeverity,
            alertStatus, alertResourceId, alertTriggeredAt, alertCachedAt
        ]

        // CachedClient Entity
        let cachedClientEntity = NSEntityDescription()
        cachedClientEntity.name = "CachedClient"
        cachedClientEntity.managedObjectClassName = "CachedClient"

        let clientId = NSAttributeDescription()
        clientId.name = "id"
        clientId.attributeType = .UUIDAttributeType
        clientId.isOptional = false

        let clientName = NSAttributeDescription()
        clientName.name = "name"
        clientName.attributeType = .stringAttributeType
        clientName.isOptional = false

        let clientSlug = NSAttributeDescription()
        clientSlug.name = "slug"
        clientSlug.attributeType = .stringAttributeType
        clientSlug.isOptional = true

        let clientResourceCount = NSAttributeDescription()
        clientResourceCount.name = "resourceCount"
        clientResourceCount.attributeType = .integer32AttributeType
        clientResourceCount.isOptional = true

        let clientCachedAt = NSAttributeDescription()
        clientCachedAt.name = "cachedAt"
        clientCachedAt.attributeType = .dateAttributeType
        clientCachedAt.isOptional = false

        cachedClientEntity.properties = [
            clientId, clientName, clientSlug, clientResourceCount, clientCachedAt
        ]

        // CachedDashboardSummary Entity
        let cachedDashboardEntity = NSEntityDescription()
        cachedDashboardEntity.name = "CachedDashboardSummary"
        cachedDashboardEntity.managedObjectClassName = "CachedDashboardSummary"

        let dashboardId = NSAttributeDescription()
        dashboardId.name = "id"
        dashboardId.attributeType = .stringAttributeType
        dashboardId.isOptional = false
        dashboardId.defaultValue = "dashboard"

        let totalResources = NSAttributeDescription()
        totalResources.name = "totalResources"
        totalResources.attributeType = .integer32AttributeType
        totalResources.isOptional = false

        let healthyResources = NSAttributeDescription()
        healthyResources.name = "healthyResources"
        healthyResources.attributeType = .integer32AttributeType
        healthyResources.isOptional = false

        let warningResources = NSAttributeDescription()
        warningResources.name = "warningResources"
        warningResources.attributeType = .integer32AttributeType
        warningResources.isOptional = false

        let criticalResources = NSAttributeDescription()
        criticalResources.name = "criticalResources"
        criticalResources.attributeType = .integer32AttributeType
        criticalResources.isOptional = false

        let activeAlerts = NSAttributeDescription()
        activeAlerts.name = "activeAlerts"
        activeAlerts.attributeType = .integer32AttributeType
        activeAlerts.isOptional = false

        let dashboardCachedAt = NSAttributeDescription()
        dashboardCachedAt.name = "cachedAt"
        dashboardCachedAt.attributeType = .dateAttributeType
        dashboardCachedAt.isOptional = false

        cachedDashboardEntity.properties = [
            dashboardId, totalResources, healthyResources, warningResources,
            criticalResources, activeAlerts, dashboardCachedAt
        ]

        model.entities = [cachedResourceEntity, cachedAlertEntity, cachedClientEntity, cachedDashboardEntity]
        return model
    }
}

// MARK: - Extended Persistence Controller with Programmatic Model

extension PersistenceController {

    /// Creates a persistence controller with a programmatic model
    static func createWithProgrammaticModel(inMemory: Bool = false) -> PersistenceController {
        let controller = PersistenceController(model: createManagedObjectModel(), inMemory: inMemory)
        return controller
    }

    convenience init(model: NSManagedObjectModel, inMemory: Bool = false) {
        self.init(inMemory: inMemory)
    }
}
