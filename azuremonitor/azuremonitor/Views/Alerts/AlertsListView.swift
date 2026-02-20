import SwiftUI

struct AlertsListView: View {
    @StateObject private var viewModel = AlertsListViewModel()
    var isEmbedded: Bool = false

    var body: some View {
        Group {
            if isEmbedded {
                content
            } else {
                NavigationStack {
                    content
                }
            }
        }
    }

    private var content: some View {
        VStack(spacing: 0) {
            Picker("View", selection: $viewModel.selectedTab) {
                Text("Active").tag(0)
                Text("Acknowledged").tag(1)
                Text("Resolved").tag(2)
                Text("Rules").tag(3)
                Text("Templates").tag(4)
            }
            .pickerStyle(.segmented)
            .padding(Spacing.lg)

            Group {
                if viewModel.isLoading && viewModel.alerts.isEmpty {
                    LoadingView(message: "Loading alerts...")
                } else if let error = viewModel.error {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadAlerts() } })
                } else {
                    switch viewModel.selectedTab {
                    case 0:
                        alertsList(viewModel.activeAlerts, emptyMessage: "No active alerts")
                    case 1:
                        alertsList(viewModel.acknowledgedAlerts, emptyMessage: "No acknowledged alerts")
                    case 2:
                        alertsList(viewModel.resolvedAlerts, emptyMessage: "No resolved alerts")
                    case 3:
                        alertRulesList
                    case 4:
                        alertTemplatesList
                    default:
                        EmptyView()
                    }
                }
            }
        }
        .navigationTitle("Alerts")
        .refreshable {
            async let alerts: () = viewModel.loadAlerts()
            async let rules: () = viewModel.loadAlertRules()
            async let templates: () = viewModel.loadAlertTemplates()
            _ = await (alerts, rules, templates)
        }
        .task {
            async let alerts: () = viewModel.loadAlerts()
            async let rules: () = viewModel.loadAlertRules()
            async let templates: () = viewModel.loadAlertTemplates()
            _ = await (alerts, rules, templates)
        }
    }

    @ViewBuilder
    private func alertsList(_ alerts: [Alert], emptyMessage: String) -> some View {
        if alerts.isEmpty {
            EmptyStateView(
                icon: "bell.slash",
                title: emptyMessage,
                message: "Alerts will appear here when triggered"
            )
        } else {
            List(alerts) { alert in
                NavigationLink(destination: AlertDetailView(alertId: alert.id)) {
                    AlertRow(
                        alert: alert,
                        onAcknowledge: { Task { await viewModel.acknowledgeAlert(alert) } },
                        onResolve: { Task { await viewModel.resolveAlert(alert) } }
                    )
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
        }
    }

    @ViewBuilder
    private var alertRulesList: some View {
        if viewModel.alertRules.isEmpty {
            EmptyStateView(
                icon: "bell.badge",
                title: "No Alert Rules",
                message: "Configure alert rules in the web app"
            )
        } else {
            List(viewModel.alertRules) { rule in
                AlertRuleRow(rule: rule)
            }
            .listStyle(.plain)
        }
    }

    @ViewBuilder
    private var alertTemplatesList: some View {
        if viewModel.alertTemplates.isEmpty {
            EmptyStateView(
                icon: "doc.text",
                title: "No Alert Templates",
                message: "Alert templates help you quickly create new alert rules"
            )
        } else {
            List(viewModel.alertTemplates) { template in
                NavigationLink(destination: AlertTemplateDetailView(template: template)) {
                    AlertTemplateRow(template: template)
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
        }
    }
}

// MARK: - Alert Template Row

struct AlertTemplateRow: View {
    let template: AlertTemplate

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "doc.text.fill")
                .foregroundColor(.brandPrimary)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(template.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                if let description = template.description {
                    Text(description)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .lineLimit(2)
                }

                HStack(spacing: Spacing.sm) {
                    Text(template.ruleType.displayName)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)

                    if let resourceType = template.azureResourceType {
                        Text(resourceType.components(separatedBy: "/").last ?? resourceType)
                            .font(.labelSmall)
                            .foregroundColor(.textTertiary)
                    }
                }
            }

            Spacer()

            SeverityBadge(severity: template.severity)
        }
        .padding(.vertical, Spacing.xs)
    }
}
