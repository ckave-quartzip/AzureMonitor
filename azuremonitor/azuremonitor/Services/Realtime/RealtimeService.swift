import Foundation
import Combine

@MainActor
class RealtimeService: ObservableObject {
    static let shared = RealtimeService()

    @Published var isConnected: Bool = false
    @Published var lastAlertUpdate: Date?
    @Published var lastResourceUpdate: Date?

    private var pollingTask: Task<Void, Never>?
    private let pollingInterval: TimeInterval = 30 // Poll every 30 seconds

    private init() {}

    func connect() {
        guard pollingTask == nil else { return }

        isConnected = true

        pollingTask = Task {
            while !Task.isCancelled {
                await pollForUpdates()
                try? await Task.sleep(nanoseconds: UInt64(pollingInterval * 1_000_000_000))
            }
        }
    }

    func disconnect() {
        pollingTask?.cancel()
        pollingTask = nil
        isConnected = false
    }

    private func pollForUpdates() async {
        // Check for alert updates
        do {
            let _: [Alert] = try await APIClient.shared.request(.alerts())
            let now = Date()
            if lastAlertUpdate != now {
                lastAlertUpdate = now
                NotificationCenter.default.post(name: .alertsUpdated, object: nil)
            }
        } catch {
            // Silently handle polling errors
        }

        // Check for resource updates
        do {
            let _: [Resource] = try await APIClient.shared.request(.resources())
            let now = Date()
            if lastResourceUpdate != now {
                lastResourceUpdate = now
                NotificationCenter.default.post(name: .resourcesUpdated, object: nil)
            }
        } catch {
            // Silently handle polling errors
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let alertsUpdated = Notification.Name("alertsUpdated")
    static let resourcesUpdated = Notification.Name("resourcesUpdated")
}
