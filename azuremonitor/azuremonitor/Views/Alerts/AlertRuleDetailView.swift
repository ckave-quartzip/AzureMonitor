import SwiftUI

struct AlertRuleDetailView: View {
    @StateObject private var viewModel: AlertRuleDetailViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirmation = false

    init(ruleId: UUID) {
        _viewModel = StateObject(wrappedValue: AlertRuleDetailViewModel(ruleId: ruleId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                if let rule = viewModel.alertRule {
                    // Rule Status Card
                    ruleStatusCard(rule)

                    // Rule Configuration
                    ruleConfigSection(rule)

                    // Conditions
                    conditionsSection(rule)

                    // Actions
                    actionsSection(rule)

                    // Recent Alerts
                    recentAlertsSection

                    // Delete Button
                    deleteButton
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle(viewModel.alertRule?.name ?? "Alert Rule")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                if let rule = viewModel.alertRule {
                    Toggle("", isOn: Binding(
                        get: { rule.isEnabled },
                        set: { _ in Task { await viewModel.toggleEnabled() } }
                    ))
                    .labelsHidden()
                    .disabled(viewModel.isSaving)
                }
            }
        }
        .refreshable {
            await viewModel.loadAllData()
        }
        .task {
            await viewModel.loadAllData()
        }
        .overlay {
            if viewModel.isLoading && viewModel.alertRule == nil {
                LoadingView(message: "Loading rule...")
            }
        }
        .alert("Delete Alert Rule", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                Task {
                    if await viewModel.deleteRule() {
                        dismiss()
                    }
                }
            }
        } message: {
            Text("Are you sure you want to delete this alert rule? This action cannot be undone.")
        }
    }

    private func ruleStatusCard(_ rule: AlertRule) -> some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(rule.isEnabled ? Color.statusUp.opacity(0.2) : Color.statusUnknown.opacity(0.2))
                    .frame(width: 80, height: 80)

                Image(systemName: rule.isEnabled ? "bell.badge.fill" : "bell.slash")
                    .font(.system(size: 32))
                    .foregroundColor(rule.isEnabled ? .statusUp : .statusUnknown)
            }

            Text(rule.isEnabled ? "Active" : "Disabled")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(rule.name)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func ruleConfigSection(_ rule: AlertRule) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Configuration")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                ConfigRow(label: "Rule Type", value: rule.ruleType.displayName)
                ConfigRow(label: "Severity", value: rule.severity.rawValue.capitalized, color: rule.severity.color)

                if let description = rule.description {
                    ConfigRow(label: "Description", value: description)
                }

                if let resourceId = rule.resourceId {
                    ConfigRow(label: "Target Resource", value: resourceId.uuidString.prefix(8) + "...")
                }
            }
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func conditionsSection(_ rule: AlertRule) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Conditions")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "gauge")
                        .foregroundColor(.brandPrimary)

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("Threshold")
                            .font(.labelMedium)
                            .foregroundColor(.textPrimary)

                        Text(thresholdDescription(rule))
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }
                }

                if let duration = rule.duration {
                    Divider()

                    HStack(spacing: Spacing.md) {
                        Image(systemName: "clock")
                            .foregroundColor(.brandPrimary)

                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text("Duration")
                                .font(.labelMedium)
                                .foregroundColor(.textPrimary)

                            Text("Trigger after \(duration) minutes")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                    }
                }

                if let cooldown = rule.cooldownMinutes {
                    Divider()

                    HStack(spacing: Spacing.md) {
                        Image(systemName: "timer")
                            .foregroundColor(.brandPrimary)

                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text("Cooldown")
                                .font(.labelMedium)
                                .foregroundColor(.textPrimary)

                            Text("\(cooldown) minutes between alerts")
                                .font(.bodySmall)
                                .foregroundColor(.textSecondary)
                        }
                    }
                }
            }
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func actionsSection(_ rule: AlertRule) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Notification Actions")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                ActionRow(icon: "envelope", title: "Email", enabled: true)
                ActionRow(icon: "bell", title: "Push Notification", enabled: true)
                ActionRow(icon: "bubble.left", title: "Slack", enabled: false)
                ActionRow(icon: "message", title: "SMS", enabled: false)
            }
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var recentAlertsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Recent Alerts")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            if viewModel.recentAlerts.isEmpty {
                Text("No alerts triggered by this rule")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .padding(Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(viewModel.recentAlerts.prefix(5)) { alert in
                        MiniAlertRow(alert: alert)
                    }
                }
                .padding(Spacing.md)
                .background(Color.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var deleteButton: some View {
        Button(action: { showDeleteConfirmation = true }) {
            HStack {
                Image(systemName: "trash")
                Text("Delete Rule")
            }
            .font(.labelLarge)
            .foregroundColor(.statusDown)
            .frame(maxWidth: .infinity)
            .padding(Spacing.md)
            .background(Color.statusDown.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func thresholdDescription(_ rule: AlertRule) -> String {
        switch rule.ruleType {
        case .threshold:
            return "Value \(rule.thresholdOperator ?? ">") \(rule.threshold ?? 0)"
        case .statusChange:
            return "When resource status changes"
        case .noData:
            return "When no data received for \(rule.threshold ?? 5) minutes"
        case .anomaly:
            return "When anomaly detected"
        }
    }
}

// MARK: - Helper Views

struct ConfigRow: View {
    let label: String
    let value: String
    var color: Color? = nil

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(color ?? .textPrimary)
        }
    }
}

struct ActionRow: View {
    let icon: String
    let title: String
    let enabled: Bool

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .foregroundColor(enabled ? .brandPrimary : .textTertiary)
                .frame(width: 24)

            Text(title)
                .font(.bodyMedium)
                .foregroundColor(enabled ? .textPrimary : .textTertiary)

            Spacer()

            Image(systemName: enabled ? "checkmark.circle.fill" : "circle")
                .foregroundColor(enabled ? .statusUp : .textTertiary)
        }
    }
}

struct MiniAlertRow: View {
    let alert: Alert

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(alert.severity.color)
                .frame(width: 8, height: 8)

            Text(alert.title)
                .font(.bodySmall)
                .foregroundColor(.textPrimary)
                .lineLimit(1)

            Spacer()

            Text(alert.triggeredAt.timeAgo)
                .font(.labelSmall)
                .foregroundColor(.textTertiary)
        }
    }
}

