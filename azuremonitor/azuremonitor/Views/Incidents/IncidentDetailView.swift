import SwiftUI

struct IncidentDetailView: View {
    @StateObject private var viewModel: IncidentDetailViewModel

    init(incidentId: UUID) {
        _viewModel = StateObject(wrappedValue: IncidentDetailViewModel(incidentId: incidentId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading incident...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let incident = viewModel.incident {
                VStack(spacing: Spacing.lg) {
                    // Header
                    VStack(spacing: Spacing.md) {
                        SeverityBadge(severity: incident.severity)

                        Text(incident.title)
                            .font(.displayMedium)
                            .foregroundColor(.textPrimary)
                            .multilineTextAlignment(.center)

                        IncidentStatusBadge(status: incident.status)

                        if let createdAt = incident.createdAt {
                            Text("Created \(createdAt.timeAgo)")
                                .font(.labelSmall)
                                .foregroundColor(.textSecondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(Spacing.xl)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    // Description
                    if let description = incident.description {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Description")
                                .font(.displaySmall)
                                .foregroundColor(.textPrimary)

                            Text(description)
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(Spacing.lg)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // Resolution Notes
                    if let notes = incident.resolutionNotes {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Resolution Notes")
                                .font(.displaySmall)
                                .foregroundColor(.textPrimary)

                            Text(notes)
                                .font(.bodyMedium)
                                .foregroundColor(.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(Spacing.lg)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("Incident Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadDetails()
        }
    }
}
