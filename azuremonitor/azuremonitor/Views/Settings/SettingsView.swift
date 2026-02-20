import SwiftUI

struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var userSettings: UserSettingsService
    @State private var showResetConfirmation = false
    @State private var showSignOutConfirmation = false
    @State private var isRunningDiagnostics = false
    @State private var diagnosticResults: [APIDiagnosticService.DiagnosticResult] = []
    @State private var showDiagnosticResults = false

    var body: some View {
        List {
            appearanceSection
            securitySection
            notificationsSection
            dataRefreshSection
            displaySection
            accountSection
            developerSection
            aboutSection
        }
        .navigationTitle("Settings")
        .alert("Biometric Error", isPresented: $viewModel.showBiometricError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.biometricErrorMessage)
        }
        .alert("Reset Settings", isPresented: $showResetConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Reset", role: .destructive) {
                viewModel.resetSettings()
            }
        } message: {
            Text("This will reset all settings to their default values.")
        }
        .alert("Sign Out", isPresented: $showSignOutConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Sign Out", role: .destructive) {
                Task { await viewModel.signOut() }
            }
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }

    // MARK: - Appearance Section
    private var appearanceSection: some View {
        Section {
            NavigationLink {
                ThemePickerView()
            } label: {
                HStack {
                    SettingsIcon(icon: userSettings.theme.icon, color: .brandPrimary)
                    Text("Theme")
                    Spacer()
                    Text(userSettings.theme.displayName)
                        .foregroundColor(.textSecondary)
                }
            }

            Toggle(isOn: $userSettings.hapticFeedbackEnabled) {
                HStack {
                    SettingsIcon(icon: "hand.tap.fill", color: .brandSecondary)
                    Text("Haptic Feedback")
                }
            }
            .tint(.brandPrimary)
        } header: {
            Text("Appearance")
        }
    }

    // MARK: - Security Section
    private var securitySection: some View {
        Section {
            if viewModel.canUseBiometrics {
                Toggle(isOn: Binding(
                    get: { userSettings.biometricsEnabled },
                    set: { newValue in
                        Task { await viewModel.toggleBiometrics(newValue) }
                    }
                )) {
                    HStack {
                        SettingsIcon(icon: viewModel.biometricIcon, color: .statusUp)
                        Text(viewModel.biometricTypeLabel)
                    }
                }
                .tint(.brandPrimary)
            } else {
                HStack {
                    SettingsIcon(icon: "lock.slash", color: .textTertiary)
                    Text("Biometrics Unavailable")
                        .foregroundColor(.textSecondary)
                }
            }
        } header: {
            Text("Security")
        } footer: {
            if viewModel.canUseBiometrics {
                Text("Use \(viewModel.biometricTypeLabel) to quickly sign in to the app.")
            }
        }
    }

    // MARK: - Notifications Section
    private var notificationsSection: some View {
        Section {
            Toggle(isOn: $userSettings.notificationsEnabled) {
                HStack {
                    SettingsIcon(icon: "bell.badge.fill", color: .severityWarning)
                    Text("Push Notifications")
                }
            }
            .tint(.brandPrimary)
            .onChange(of: userSettings.notificationsEnabled) { _, newValue in
                if newValue {
                    Task { await viewModel.requestNotificationPermission() }
                }
            }

            if userSettings.notificationsEnabled {
                NavigationLink {
                    NotificationPreferencesView()
                } label: {
                    HStack {
                        SettingsIcon(icon: "bell.and.waves.left.and.right.fill", color: .brandPrimary)
                        Text("Notification Preferences")
                        Spacer()
                        Text(notificationPreferencesSummary)
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
        } header: {
            Text("Notifications")
        } footer: {
            Text("Receive alerts for critical resource issues and threshold breaches.")
        }
    }

    private var notificationPreferencesSummary: String {
        let pushService = PushNotificationService.shared
        let enabledCount = [
            pushService.criticalAlertsEnabled,
            pushService.warningAlertsEnabled,
            pushService.incidentUpdatesEnabled,
            pushService.resourceStatusEnabled,
            pushService.costAnomaliesEnabled
        ].filter { $0 }.count
        return "\(enabledCount) of 5 enabled"
    }

    // MARK: - Data & Refresh Section
    private var dataRefreshSection: some View {
        Section {
            Toggle(isOn: $userSettings.autoRefreshEnabled) {
                HStack {
                    SettingsIcon(icon: "arrow.clockwise", color: .severityInfo)
                    Text("Auto Refresh")
                }
            }
            .tint(.brandPrimary)

            if userSettings.autoRefreshEnabled {
                NavigationLink {
                    RefreshIntervalPickerView()
                } label: {
                    HStack {
                        SettingsIcon(icon: "timer", color: .severityInfo)
                        Text("Refresh Interval")
                        Spacer()
                        Text("\(userSettings.refreshIntervalSeconds)s")
                            .foregroundColor(.textSecondary)
                    }
                }
            }

            Toggle(isOn: $userSettings.showResourceCosts) {
                HStack {
                    SettingsIcon(icon: "dollarsign.circle.fill", color: .statusUp)
                    Text("Show Resource Costs")
                }
            }
            .tint(.brandPrimary)
        } header: {
            Text("Data & Refresh")
        }
    }

    // MARK: - Display Section
    private var displaySection: some View {
        Section {
            NavigationLink {
                DefaultTabPickerView()
            } label: {
                HStack {
                    SettingsIcon(icon: "square.grid.2x2", color: .brandPrimary)
                    Text("Default Tab")
                    Spacer()
                    Text(userSettings.defaultDashboardTab.displayName)
                        .foregroundColor(.textSecondary)
                }
            }

            Toggle(isOn: $userSettings.compactAlertView) {
                HStack {
                    SettingsIcon(icon: "list.bullet", color: .brandSecondary)
                    Text("Compact Alert View")
                }
            }
            .tint(.brandPrimary)
        } header: {
            Text("Display")
        }
    }

    // MARK: - Account Section
    private var accountSection: some View {
        Section {
            if let user = authService.currentUser {
                HStack {
                    SettingsIcon(icon: "person.circle.fill", color: .brandPrimary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.displayName)
                            .font(.bodyMedium)
                        Text(user.roles.first?.rawValue.capitalized ?? "User")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }

            Button {
                showSignOutConfirmation = true
            } label: {
                HStack {
                    SettingsIcon(icon: "rectangle.portrait.and.arrow.right", color: .statusDown)
                    Text("Sign Out")
                        .foregroundColor(.statusDown)
                }
            }
        } header: {
            Text("Account")
        }
    }

    // MARK: - Developer Section
    private var developerSection: some View {
        Section {
            Button {
                Task {
                    isRunningDiagnostics = true
                    diagnosticResults = await APIDiagnosticService.shared.runFullDiagnostics()
                    isRunningDiagnostics = false
                    showDiagnosticResults = true
                }
            } label: {
                HStack {
                    SettingsIcon(icon: "stethoscope", color: .brandPrimary)
                    Text("Run API Diagnostics")
                    Spacer()
                    if isRunningDiagnostics {
                        ProgressView()
                    }
                }
            }
            .disabled(isRunningDiagnostics)
        } header: {
            Text("Developer")
        } footer: {
            Text("Tests all API endpoints and reports decoding issues in the Xcode console.")
        }
        .sheet(isPresented: $showDiagnosticResults) {
            DiagnosticResultsView(results: diagnosticResults)
        }
    }

    // MARK: - About Section
    private var aboutSection: some View {
        Section {
            HStack {
                SettingsIcon(icon: "info.circle.fill", color: .textSecondary)
                Text("Version")
                Spacer()
                Text(Bundle.main.appVersion)
                    .foregroundColor(.textSecondary)
            }

            Button {
                showResetConfirmation = true
            } label: {
                HStack {
                    SettingsIcon(icon: "arrow.counterclockwise", color: .severityWarning)
                    Text("Reset Settings")
                        .foregroundColor(.severityWarning)
                }
            }
        } header: {
            Text("About")
        } footer: {
            Text("Quartz Azure Monitor\n\u{00A9} 2026 Quartz")
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, Spacing.md)
        }
    }
}

// MARK: - Diagnostic Results View
struct DiagnosticResultsView: View {
    let results: [APIDiagnosticService.DiagnosticResult]
    @Environment(\.dismiss) private var dismiss

    var passedCount: Int { results.filter { $0.success }.count }
    var failedCount: Int { results.filter { !$0.success }.count }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Text("Total Tests")
                        Spacer()
                        Text("\(results.count)")
                            .foregroundColor(.textSecondary)
                    }
                    HStack {
                        Text("Passed")
                        Spacer()
                        Text("\(passedCount)")
                            .foregroundColor(.statusUp)
                    }
                    HStack {
                        Text("Failed")
                        Spacer()
                        Text("\(failedCount)")
                            .foregroundColor(failedCount > 0 ? .statusDown : .textSecondary)
                    }
                } header: {
                    Text("Summary")
                }

                if failedCount > 0 {
                    Section {
                        ForEach(results.filter { !$0.success }, id: \.endpoint) { result in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.statusDown)
                                    Text(result.endpoint)
                                        .font(.labelLarge)
                                }
                                if let error = result.error {
                                    Text(error)
                                        .font(.caption)
                                        .foregroundColor(.textSecondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    } header: {
                        Text("Failed Endpoints")
                    }
                }

                Section {
                    ForEach(results.filter { $0.success }, id: \.endpoint) { result in
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.statusUp)
                            Text(result.endpoint)
                        }
                    }
                } header: {
                    Text("Passed Endpoints")
                }
            }
            .navigationTitle("API Diagnostics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Helper Views

struct SettingsIcon: View {
    let icon: String
    let color: Color

    var body: some View {
        Image(systemName: icon)
            .font(.system(size: 16))
            .foregroundColor(color)
            .frame(width: 28, height: 28)
            .background(color.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

struct ThemePickerView: View {
    @EnvironmentObject var userSettings: UserSettingsService

    var body: some View {
        List {
            ForEach(UserSettingsService.Theme.allCases) { theme in
                Button {
                    userSettings.theme = theme
                } label: {
                    HStack {
                        Image(systemName: theme.icon)
                            .foregroundColor(.brandPrimary)
                            .frame(width: 24)

                        Text(theme.displayName)
                            .foregroundColor(.textPrimary)

                        Spacer()

                        if userSettings.theme == theme {
                            Image(systemName: "checkmark")
                                .foregroundColor(.brandPrimary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Theme")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct RefreshIntervalPickerView: View {
    @EnvironmentObject var userSettings: UserSettingsService

    private let intervals = [15, 30, 60, 120, 300]

    var body: some View {
        List {
            ForEach(intervals, id: \.self) { interval in
                Button {
                    userSettings.refreshIntervalSeconds = interval
                } label: {
                    HStack {
                        Text(formatInterval(interval))
                            .foregroundColor(.textPrimary)

                        Spacer()

                        if userSettings.refreshIntervalSeconds == interval {
                            Image(systemName: "checkmark")
                                .foregroundColor(.brandPrimary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Refresh Interval")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formatInterval(_ seconds: Int) -> String {
        if seconds < 60 {
            return "\(seconds) seconds"
        } else {
            let minutes = seconds / 60
            return "\(minutes) minute\(minutes > 1 ? "s" : "")"
        }
    }
}

struct DefaultTabPickerView: View {
    @EnvironmentObject var userSettings: UserSettingsService

    var body: some View {
        List {
            ForEach(UserSettingsService.DashboardTab.allCases) { tab in
                Button {
                    userSettings.defaultDashboardTab = tab
                } label: {
                    HStack {
                        Text(tab.displayName)
                            .foregroundColor(.textPrimary)

                        Spacer()

                        if userSettings.defaultDashboardTab == tab {
                            Image(systemName: "checkmark")
                                .foregroundColor(.brandPrimary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Default Tab")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Bundle Extension

extension Bundle {
    var appVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
