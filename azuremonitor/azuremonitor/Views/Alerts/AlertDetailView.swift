import SwiftUI

struct AlertDetailView: View {
    @StateObject private var viewModel: AlertDetailViewModel

    init(alertId: UUID) {
        _viewModel = StateObject(wrappedValue: AlertDetailViewModel(alertId: alertId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading alert...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let alert = viewModel.alert {
                VStack(spacing: Spacing.lg) {
                    // Header
                    VStack(spacing: Spacing.md) {
                        SeverityBadge(severity: alert.severity)

                        Text(alert.title)
                            .font(.displayMedium)
                            .foregroundColor(.textPrimary)
                            .multilineTextAlignment(.center)

                        StatusBadge(status: alert.status)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(Spacing.xl)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Message
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("Message")
                            .font(.displaySmall)
                            .foregroundColor(.textPrimary)

                        Text(alert.message)
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Spacing.lg)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Actions
                    if alert.status != .resolved {
                        VStack(spacing: Spacing.md) {
                            if alert.status == .active {
                                PrimaryButton(
                                    title: "Acknowledge",
                                    action: { Task { await viewModel.acknowledge() } }
                                )
                            }

                            SecondaryButton(
                                title: "Resolve",
                                action: { Task { await viewModel.resolve() } }
                            )
                        }
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("Alert Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadDetails()
        }
    }
}
