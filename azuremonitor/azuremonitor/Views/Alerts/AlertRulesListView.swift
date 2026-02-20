import SwiftUI

struct AlertRulesListView: View {
    @StateObject private var viewModel = AlertsListViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading alert rules...")
            } else if viewModel.alertRules.isEmpty {
                EmptyStateView(
                    icon: "bell.badge",
                    title: "No Alert Rules",
                    message: "Configure alert rules in the web app"
                )
            } else {
                List(viewModel.alertRules) { rule in
                    NavigationLink(destination: AlertRuleDetailView(ruleId: rule.id)) {
                        AlertRuleRow(rule: rule)
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Alert Rules")
        .task {
            await viewModel.loadAlertRules()
        }
    }
}

struct AlertRuleRow: View {
    let rule: AlertRule

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: rule.isEnabled ? "bell.badge.fill" : "bell.slash")
                .foregroundColor(rule.isEnabled ? .brandPrimary : .textTertiary)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(rule.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text(rule.ruleType.displayName)
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            SeverityBadge(severity: rule.severity)
        }
        .padding(.vertical, Spacing.xs)
    }
}
