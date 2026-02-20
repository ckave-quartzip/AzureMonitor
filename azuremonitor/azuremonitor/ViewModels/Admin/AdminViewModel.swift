import Foundation
import Combine

@MainActor
class AdminViewModel: ObservableObject {
    @Published var systemSettings: SystemSettings?
    @Published var apiKeys: [APIKey] = []
    @Published var syncScheduler: SyncScheduler?
    @Published var syncLogs: [SyncLog] = []
    @Published var users: [ManagedUser] = []

    @Published var isLoading = false
    @Published var error: Error?

    private let apiClient = APIClient.shared

    // MARK: - System Settings

    func loadSystemSettings() async {
        do {
            // API may return null or error - use requestOptional for defensive handling
            systemSettings = try await apiClient.requestOptional(.systemSettings)
        } catch {
            self.error = error
        }
    }

    func saveSystemSettings() async {
        guard let settings = systemSettings else { return }
        do {
            try await apiClient.requestVoid(.updateSystemSettings)
        } catch {
            self.error = error
        }
    }

    // MARK: - API Keys

    func loadAPIKeys() async {
        do {
            apiKeys = try await apiClient.requestArrayOrEmpty(.apiKeys)
        } catch {
            self.error = error
        }
    }

    func createAPIKey(name: String, permissions: [String], expiresInDays: Int?) async -> String? {
        do {
            let response: CreateAPIKeyResponse = try await apiClient.request(.createApiKey)
            await loadAPIKeys()
            return response.key
        } catch {
            self.error = error
            return nil
        }
    }

    func revokeAPIKey(_ key: APIKey) async {
        do {
            try await apiClient.requestVoid(.revokeApiKey(id: key.id))
            await loadAPIKeys()
        } catch {
            self.error = error
        }
    }

    // MARK: - Sync Scheduler

    func loadSyncScheduler() async {
        do {
            // API may return null or error - use requestOptional for defensive handling
            syncScheduler = try await apiClient.requestOptional(.syncScheduler)
        } catch {
            self.error = error
        }
    }

    func saveSyncScheduler() async {
        guard syncScheduler != nil else { return }
        do {
            try await apiClient.requestVoid(.updateSyncScheduler)
        } catch {
            self.error = error
        }
    }

    // MARK: - Sync Logs

    func loadSyncLogs() async {
        do {
            syncLogs = try await apiClient.requestArrayOrEmpty(.syncLogs())
        } catch {
            self.error = error
        }
    }

    // MARK: - Users

    func loadUsers() async {
        do {
            users = try await apiClient.requestArrayOrEmpty(.users)
        } catch {
            self.error = error
        }
    }

    func createUser(email: String, name: String?, role: UserRole) async {
        do {
            try await apiClient.requestVoid(.createUser)
            await loadUsers()
        } catch {
            self.error = error
        }
    }

    func updateUser(_ user: ManagedUser, name: String?, role: UserRole?, isActive: Bool?) async {
        do {
            try await apiClient.requestVoid(.updateUser(id: user.id))
            await loadUsers()
        } catch {
            self.error = error
        }
    }

    func deleteUser(_ user: ManagedUser) async {
        do {
            try await apiClient.requestVoid(.deleteUser(id: user.id))
            await loadUsers()
        } catch {
            self.error = error
        }
    }

    // MARK: - Load All

    func loadAllData() async {
        isLoading = true

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadSystemSettings() }
            group.addTask { await self.loadAPIKeys() }
            group.addTask { await self.loadSyncScheduler() }
            group.addTask { await self.loadSyncLogs() }
            group.addTask { await self.loadUsers() }
        }

        isLoading = false
    }
}
