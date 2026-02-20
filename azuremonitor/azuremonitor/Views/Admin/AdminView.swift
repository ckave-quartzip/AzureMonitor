import SwiftUI

struct AdminView: View {
    @StateObject private var viewModel = AdminViewModel()
    @State private var selectedSection = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Section", selection: $selectedSection) {
                    Text("Settings").tag(0)
                    Text("Users").tag(1)
                    Text("API Keys").tag(2)
                    Text("Sync").tag(3)
                }
                .pickerStyle(.segmented)
                .padding(Spacing.lg)

                TabView(selection: $selectedSection) {
                    systemSettingsView.tag(0)
                    usersView.tag(1)
                    apiKeysView.tag(2)
                    syncView.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("Admin")
            .task {
                await viewModel.loadAllData()
            }
            .refreshable {
                await viewModel.loadAllData()
            }
        }
    }

    // MARK: - System Settings

    private var systemSettingsView: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                if var settings = viewModel.systemSettings {
                    SettingsSection(title: "General") {
                        Toggle("Maintenance Mode", isOn: Binding(
                            get: { settings.maintenanceMode },
                            set: { settings.maintenanceMode = $0; viewModel.systemSettings = settings }
                        ))

                        Toggle("Allow Public Registration", isOn: Binding(
                            get: { settings.allowPublicRegistration },
                            set: { settings.allowPublicRegistration = $0; viewModel.systemSettings = settings }
                        ))
                    }

                    SettingsSection(title: "Data Retention") {
                        Stepper("Retention: \(settings.dataRetentionDays) days", value: Binding(
                            get: { settings.dataRetentionDays },
                            set: { settings.dataRetentionDays = $0; viewModel.systemSettings = settings }
                        ), in: 7...365)
                    }

                    SettingsSection(title: "Alerts") {
                        Toggle("Enable Cost Alerts", isOn: Binding(
                            get: { settings.enableCostAlerts },
                            set: { settings.enableCostAlerts = $0; viewModel.systemSettings = settings }
                        ))

                        Stepper("Alert Threshold: \(settings.defaultAlertThreshold)", value: Binding(
                            get: { settings.defaultAlertThreshold },
                            set: { settings.defaultAlertThreshold = $0; viewModel.systemSettings = settings }
                        ), in: 1...100)
                    }

                    PrimaryButton(title: "Save Settings", action: {
                        Task { await viewModel.saveSystemSettings() }
                    })
                } else {
                    LoadingView(message: "Loading settings...")
                }
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - Users

    private var usersView: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                ForEach(viewModel.users) { user in
                    UserRow(user: user, onDelete: {
                        Task { await viewModel.deleteUser(user) }
                    })
                }

                if viewModel.users.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: "No Users",
                        message: "No users configured"
                    )
                }
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - API Keys

    private var apiKeysView: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                ForEach(viewModel.apiKeys) { key in
                    APIKeyRow(apiKey: key, onRevoke: {
                        Task { await viewModel.revokeAPIKey(key) }
                    })
                }

                if viewModel.apiKeys.isEmpty {
                    EmptyStateView(
                        icon: "key",
                        title: "No API Keys",
                        message: "No API keys configured"
                    )
                }
            }
            .padding(Spacing.lg)
        }
    }

    // MARK: - Sync

    private var syncView: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                if var scheduler = viewModel.syncScheduler {
                    SettingsSection(title: "Azure Sync") {
                        Toggle("Enabled", isOn: Binding(
                            get: { scheduler.azureSyncEnabled },
                            set: { scheduler.azureSyncEnabled = $0; viewModel.syncScheduler = scheduler }
                        ))

                        if scheduler.azureSyncEnabled {
                            Stepper("Interval: \(scheduler.azureSyncIntervalMinutes) min", value: Binding(
                                get: { scheduler.azureSyncIntervalMinutes },
                                set: { scheduler.azureSyncIntervalMinutes = $0; viewModel.syncScheduler = scheduler }
                            ), in: 5...1440)
                        }

                        if let lastSync = scheduler.lastAzureSync {
                            Text("Last sync: \(lastSync.timeAgo)")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                    }

                    SettingsSection(title: "Cost Sync") {
                        Toggle("Enabled", isOn: Binding(
                            get: { scheduler.costSyncEnabled },
                            set: { scheduler.costSyncEnabled = $0; viewModel.syncScheduler = scheduler }
                        ))

                        if scheduler.costSyncEnabled {
                            Stepper("Interval: \(scheduler.costSyncIntervalMinutes) min", value: Binding(
                                get: { scheduler.costSyncIntervalMinutes },
                                set: { scheduler.costSyncIntervalMinutes = $0; viewModel.syncScheduler = scheduler }
                            ), in: 60...1440)
                        }
                    }

                    PrimaryButton(title: "Save Schedule", action: {
                        Task { await viewModel.saveSyncScheduler() }
                    })
                }

                // Sync Logs
                SettingsSection(title: "Recent Sync Logs") {
                    ForEach(viewModel.syncLogs.prefix(10)) { log in
                        SyncLogRow(log: log)
                    }
                }
            }
            .padding(Spacing.lg)
        }
    }
}

// MARK: - Helper Views

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(title)
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                content
            }
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct UserRow: View {
    let user: ManagedUser
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(user.isActive ? Color.statusUp : Color.statusUnknown)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(user.name ?? user.email)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text(user.email)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            Text(user.role.displayName)
                .font(.labelSmall)
                .foregroundColor(.brandPrimary)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xxs)
                .background(Color.brandPrimary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .swipeActions(edge: .trailing) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }
        }
    }
}

struct APIKeyRow: View {
    let apiKey: APIKey
    let onRevoke: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "key.fill")
                .foregroundColor(apiKey.isActive ? .brandPrimary : .textTertiary)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(apiKey.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text("\(apiKey.keyPrefix)...")
                    .font(.monoMedium)
                    .foregroundColor(.textSecondary)

                if let lastUsed = apiKey.lastUsedAt {
                    Text("Last used: \(lastUsed.timeAgo)")
                        .font(.bodySmall)
                        .foregroundColor(.textTertiary)
                }
            }

            Spacer()

            if apiKey.isActive {
                Button("Revoke", action: onRevoke)
                    .font(.labelSmall)
                    .foregroundColor(.statusDown)
            } else {
                Text("Revoked")
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct SyncLogRow: View {
    let log: SyncLog

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(log.syncType)
                    .font(.labelMedium)
                    .foregroundColor(.textPrimary)

                Text("\(log.itemsProcessed) items - \(log.startedAt.timeAgo)")
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            Text(log.status.rawValue.capitalized)
                .font(.labelSmall)
                .foregroundColor(statusColor)
        }
        .padding(.vertical, Spacing.xs)
    }

    private var statusColor: Color {
        switch log.status {
        case .running: return .brandPrimary
        case .completed: return .statusUp
        case .failed: return .statusDown
        case .pending: return .statusUnknown
        }
    }
}
