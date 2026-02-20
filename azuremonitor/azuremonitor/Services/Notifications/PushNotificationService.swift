import Foundation
import Combine
import UserNotifications
import UIKit

@MainActor
class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()

    @Published var deviceToken: String?
    @Published var isRegistered: Bool = false
    @Published var authorizationStatus: UNAuthorizationStatus = .notDetermined

    // Notification preferences
    @Published var criticalAlertsEnabled: Bool = true
    @Published var warningAlertsEnabled: Bool = true
    @Published var incidentUpdatesEnabled: Bool = true
    @Published var resourceStatusEnabled: Bool = true
    @Published var costAnomaliesEnabled: Bool = true

    private let userDefaults = UserDefaults.standard
    private let apiClient = APIClient.shared

    private enum UserDefaultsKeys {
        static let criticalAlerts = "notification_critical_alerts"
        static let warningAlerts = "notification_warning_alerts"
        static let incidentUpdates = "notification_incident_updates"
        static let resourceStatus = "notification_resource_status"
        static let costAnomalies = "notification_cost_anomalies"
    }

    override init() {
        super.init()
        loadPreferences()
    }

    // MARK: - Registration

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound, .criticalAlert])

            if granted {
                await registerForRemoteNotifications()
            }

            await updateAuthorizationStatus()
            return granted
        } catch {
            print("Failed to request notification authorization: \(error)")
            return false
        }
    }

    func registerForRemoteNotifications() async {
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func updateAuthorizationStatus() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        authorizationStatus = settings.authorizationStatus
        isRegistered = settings.authorizationStatus == .authorized
    }

    // MARK: - Device Token Management

    func handleDeviceToken(_ deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString

        print("📱 Received device token: \(tokenString.prefix(20))...")

        Task {
            await registerDeviceWithServer(token: tokenString)
        }
    }

    func handleRegistrationError(_ error: Error) {
        print("Failed to register for remote notifications: \(error)")
        isRegistered = false
    }

    private func registerDeviceWithServer(token: String) async {
        // Get device name for identification
        let deviceName = await MainActor.run {
            UIDevice.current.name
        }

        print("📱 Registering device with server...")
        print("   Token: \(token.prefix(20))...")
        print("   Platform: ios")
        print("   Device Name: \(deviceName)")

        // Register device token with backend
        do {
            try await apiClient.requestVoid(.registerDevice(token: token, platform: "ios", deviceName: deviceName))
            print("✅ Device registered successfully with server")
        } catch {
            print("❌ Failed to register device with server: \(error)")
        }
    }

    func unregisterDevice() async {
        guard let token = deviceToken else { return }

        do {
            try await apiClient.requestVoid(.unregisterDevice(token: token))
            deviceToken = nil
            isRegistered = false
        } catch {
            print("Failed to unregister device: \(error)")
        }
    }

    // MARK: - Notification Handling

    func handleNotification(_ userInfo: [AnyHashable: Any], completion: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Determine notification type and handle accordingly
        guard let type = userInfo["type"] as? String else {
            completion([.banner, .sound, .badge])
            return
        }

        var options: UNNotificationPresentationOptions = []

        switch type {
        case "critical_alert":
            if criticalAlertsEnabled {
                options = [.banner, .sound, .badge]
            }
        case "warning_alert":
            if warningAlertsEnabled {
                options = [.banner, .sound, .badge]
            }
        case "incident_update":
            if incidentUpdatesEnabled {
                options = [.banner, .sound]
            }
        case "resource_status":
            if resourceStatusEnabled {
                options = [.banner, .sound]
            }
        case "cost_anomaly":
            if costAnomaliesEnabled {
                options = [.banner, .sound]
            }
        default:
            options = [.banner, .sound]
        }

        completion(options)
    }

    func handleNotificationTap(_ userInfo: [AnyHashable: Any]) -> DeepLinkHandler.DeepLink? {
        guard let type = userInfo["type"] as? String else { return nil }

        switch type {
        case "critical_alert", "warning_alert":
            if let idString = userInfo["alert_id"] as? String,
               let id = UUID(uuidString: idString) {
                return .alert(id: id)
            }
        case "incident_update":
            if let idString = userInfo["incident_id"] as? String,
               let id = UUID(uuidString: idString) {
                return .incident(id: id)
            }
        case "resource_status":
            if let idString = userInfo["resource_id"] as? String,
               let id = UUID(uuidString: idString) {
                return .resource(id: id)
            }
        default:
            break
        }

        return nil
    }

    // MARK: - Badge Management

    func updateBadgeCount() async {
        do {
            let alerts: [Alert] = try await apiClient.request(.alerts(severity: nil, status: "active"))
            let criticalCount = alerts.filter { $0.severity == .critical }.count

            await MainActor.run {
                UNUserNotificationCenter.current().setBadgeCount(criticalCount)
            }
        } catch {
            print("Failed to update badge count: \(error)")
        }
    }

    func clearBadge() {
        UNUserNotificationCenter.current().setBadgeCount(0)
    }

    // MARK: - Preferences

    private func loadPreferences() {
        // Load from local storage first for immediate availability
        criticalAlertsEnabled = userDefaults.object(forKey: UserDefaultsKeys.criticalAlerts) as? Bool ?? true
        warningAlertsEnabled = userDefaults.object(forKey: UserDefaultsKeys.warningAlerts) as? Bool ?? true
        incidentUpdatesEnabled = userDefaults.object(forKey: UserDefaultsKeys.incidentUpdates) as? Bool ?? true
        resourceStatusEnabled = userDefaults.object(forKey: UserDefaultsKeys.resourceStatus) as? Bool ?? true
        costAnomaliesEnabled = userDefaults.object(forKey: UserDefaultsKeys.costAnomalies) as? Bool ?? true

        // Then sync from server in background
        Task {
            await loadPreferencesFromServer()
        }
    }

    func loadPreferencesFromServer() async {
        do {
            let preferences: NotificationPreferences = try await apiClient.request(.getNotificationPreferences)

            // Update local state with server values
            criticalAlertsEnabled = preferences.criticalAlerts
            warningAlertsEnabled = preferences.warningAlerts
            incidentUpdatesEnabled = preferences.incidentUpdates
            resourceStatusEnabled = preferences.resourceStatus
            costAnomaliesEnabled = preferences.costAnomalies

            // Persist to local storage
            userDefaults.set(criticalAlertsEnabled, forKey: UserDefaultsKeys.criticalAlerts)
            userDefaults.set(warningAlertsEnabled, forKey: UserDefaultsKeys.warningAlerts)
            userDefaults.set(incidentUpdatesEnabled, forKey: UserDefaultsKeys.incidentUpdates)
            userDefaults.set(resourceStatusEnabled, forKey: UserDefaultsKeys.resourceStatus)
            userDefaults.set(costAnomaliesEnabled, forKey: UserDefaultsKeys.costAnomalies)

            print("Loaded notification preferences from server")
        } catch {
            print("Failed to load notification preferences from server: \(error)")
            // Keep using local values - they may be defaults or previously synced values
        }
    }

    func savePreferences() {
        userDefaults.set(criticalAlertsEnabled, forKey: UserDefaultsKeys.criticalAlerts)
        userDefaults.set(warningAlertsEnabled, forKey: UserDefaultsKeys.warningAlerts)
        userDefaults.set(incidentUpdatesEnabled, forKey: UserDefaultsKeys.incidentUpdates)
        userDefaults.set(resourceStatusEnabled, forKey: UserDefaultsKeys.resourceStatus)
        userDefaults.set(costAnomaliesEnabled, forKey: UserDefaultsKeys.costAnomalies)

        // Sync preferences with server
        Task {
            await syncPreferencesWithServer()
        }
    }

    private func syncPreferencesWithServer() async {
        let preferences = NotificationPreferences(
            criticalAlerts: criticalAlertsEnabled,
            warningAlerts: warningAlertsEnabled,
            incidentUpdates: incidentUpdatesEnabled,
            resourceStatus: resourceStatusEnabled,
            costAnomalies: costAnomaliesEnabled
        )

        do {
            try await apiClient.requestVoid(.updateNotificationPreferences(preferences: preferences))
        } catch {
            print("Failed to sync notification preferences: \(error)")
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        Task { @MainActor in
            handleNotification(userInfo, completion: completionHandler)
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        Task { @MainActor in
            if let deepLink = handleNotificationTap(userInfo) {
                // Post notification for deep link handling
                NotificationCenter.default.post(
                    name: .handleDeepLink,
                    object: nil,
                    userInfo: ["deepLink": deepLink]
                )
            }
        }
        completionHandler()
    }
}

// MARK: - Notification Preferences Model

struct NotificationPreferences: Codable {
    let criticalAlerts: Bool
    let warningAlerts: Bool
    let incidentUpdates: Bool
    let resourceStatus: Bool
    let costAnomalies: Bool

    enum CodingKeys: String, CodingKey {
        case criticalAlerts = "critical_alerts"
        case warningAlerts = "warning_alerts"
        case incidentUpdates = "incident_updates"
        case resourceStatus = "resource_status"
        case costAnomalies = "cost_anomalies"
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let handleDeepLink = Notification.Name("handleDeepLink")
}
