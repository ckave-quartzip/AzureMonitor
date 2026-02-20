//
//  NotificationPreferencesView.swift
//  azuremonitor
//
//  Created by Chris Kave on 1/19/26.
//

import SwiftUI

struct NotificationPreferencesView: View {
    @ObservedObject var pushService = PushNotificationService.shared
    @State private var isSaving = false

    var body: some View {
        List {
            permissionStatusSection
            alertNotificationsSection
            otherNotificationsSection
        }
        .navigationTitle("Notification Preferences")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Permission Status Section

    private var permissionStatusSection: some View {
        Section {
            HStack {
                SettingsIcon(
                    icon: permissionStatusIcon,
                    color: permissionStatusColor
                )
                VStack(alignment: .leading, spacing: 2) {
                    Text("Permission Status")
                        .font(.bodyMedium)
                    Text(permissionStatusText)
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
                Spacer()
                if pushService.authorizationStatus == .denied {
                    Button("Settings") {
                        openSystemSettings()
                    }
                    .font(.labelMedium)
                    .foregroundColor(.brandPrimary)
                }
            }
        } footer: {
            if pushService.authorizationStatus == .denied {
                Text("Notifications are disabled. Tap Settings to enable them in System Settings.")
            }
        }
    }

    private var permissionStatusIcon: String {
        switch pushService.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return "checkmark.circle.fill"
        case .denied:
            return "xmark.circle.fill"
        case .notDetermined:
            return "questionmark.circle.fill"
        @unknown default:
            return "questionmark.circle.fill"
        }
    }

    private var permissionStatusColor: Color {
        switch pushService.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return .statusUp
        case .denied:
            return .statusDown
        case .notDetermined:
            return .severityWarning
        @unknown default:
            return .textSecondary
        }
    }

    private var permissionStatusText: String {
        switch pushService.authorizationStatus {
        case .authorized:
            return "Enabled"
        case .denied:
            return "Disabled"
        case .notDetermined:
            return "Not Set"
        case .provisional:
            return "Provisional"
        case .ephemeral:
            return "Ephemeral"
        @unknown default:
            return "Unknown"
        }
    }

    // MARK: - Alert Notifications Section

    private var alertNotificationsSection: some View {
        Section {
            Toggle(isOn: $pushService.criticalAlertsEnabled) {
                HStack {
                    SettingsIcon(icon: "exclamationmark.triangle.fill", color: .severityCritical)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Critical Alerts")
                            .font(.bodyMedium)
                        Text("High priority issues requiring immediate attention")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .tint(.brandPrimary)
            .onChange(of: pushService.criticalAlertsEnabled) { _, _ in
                savePreferences()
            }

            Toggle(isOn: $pushService.warningAlertsEnabled) {
                HStack {
                    SettingsIcon(icon: "exclamationmark.circle.fill", color: .severityWarning)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Warning Alerts")
                            .font(.bodyMedium)
                        Text("Potential issues that may need attention")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .tint(.brandPrimary)
            .onChange(of: pushService.warningAlertsEnabled) { _, _ in
                savePreferences()
            }
        } header: {
            Text("Alert Notifications")
        } footer: {
            Text("Critical alerts are recommended to stay enabled for important system issues.")
        }
    }

    // MARK: - Other Notifications Section

    private var otherNotificationsSection: some View {
        Section {
            Toggle(isOn: $pushService.incidentUpdatesEnabled) {
                HStack {
                    SettingsIcon(icon: "flame.fill", color: .severityCritical)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Incident Updates")
                            .font(.bodyMedium)
                        Text("Status changes for active incidents")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .tint(.brandPrimary)
            .onChange(of: pushService.incidentUpdatesEnabled) { _, _ in
                savePreferences()
            }

            Toggle(isOn: $pushService.resourceStatusEnabled) {
                HStack {
                    SettingsIcon(icon: "server.rack", color: .severityInfo)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Resource Status Changes")
                            .font(.bodyMedium)
                        Text("When resources go up, down, or change state")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .tint(.brandPrimary)
            .onChange(of: pushService.resourceStatusEnabled) { _, _ in
                savePreferences()
            }

            Toggle(isOn: $pushService.costAnomaliesEnabled) {
                HStack {
                    SettingsIcon(icon: "dollarsign.circle.fill", color: .statusUp)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Cost Anomalies")
                            .font(.bodyMedium)
                        Text("Unusual spending patterns detected")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }
                }
            }
            .tint(.brandPrimary)
            .onChange(of: pushService.costAnomaliesEnabled) { _, _ in
                savePreferences()
            }
        } header: {
            Text("Other Notifications")
        }
    }

    // MARK: - Actions

    private func savePreferences() {
        isSaving = true
        pushService.savePreferences()
        // Brief delay to show saving state if needed
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            isSaving = false
        }
    }

    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    NavigationStack {
        NotificationPreferencesView()
    }
}
