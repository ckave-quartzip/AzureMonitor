import SwiftUI

struct EnvironmentDetailView: View {
    @StateObject private var viewModel: EnvironmentDetailViewModel

    init(environmentId: UUID) {
        _viewModel = StateObject(wrappedValue: EnvironmentDetailViewModel(environmentId: environmentId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading environment...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let environment = viewModel.environment {
                VStack(spacing: Spacing.lg) {
                    EnvironmentInfoCard(environment: environment)
                    ResourcesSummaryCard(viewModel: viewModel)
                    EnvironmentResourcesSection(resources: viewModel.resources)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle(viewModel.environment?.name ?? "Environment")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadDetails()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

struct EnvironmentInfoCard: View {
    let environment: DeploymentEnvironment

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if let clientName = environment.clientName {
                InfoRow(label: "Client", value: clientName, icon: "building.2")
            }

            if let description = environment.description {
                InfoRow(label: "Description", value: description, icon: "doc.text")
            }

            if let resourceGroup = environment.azureResourceGroup {
                InfoRow(label: "Resource Group", value: resourceGroup, icon: "folder")
            }

            if environment.azureTenantId != nil {
                InfoRow(label: "Azure Connected", value: "Yes", icon: "link")
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ResourcesSummaryCard: View {
    @ObservedObject var viewModel: EnvironmentDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Resources")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.lg) {
                StatusPill(
                    count: viewModel.resourcesByStatus.up.count,
                    label: "Up",
                    color: .statusUp
                )

                StatusPill(
                    count: viewModel.resourcesByStatus.degraded.count,
                    label: "Degraded",
                    color: .statusDegraded
                )

                StatusPill(
                    count: viewModel.resourcesByStatus.down.count,
                    label: "Down",
                    color: .statusDown
                )
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct StatusPill: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: Spacing.xxs) {
            Text("\(count)")
                .font(.displayMedium)
                .foregroundColor(count > 0 ? color : .textTertiary)

            Text(label)
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct EnvironmentResourcesSection: View {
    let resources: [Resource]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("All Resources")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if resources.isEmpty {
                Text("No resources in this environment")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            } else {
                ForEach(resources) { resource in
                    NavigationLink(destination: ResourceDetailView(resourceId: resource.id)) {
                        EnvironmentResourceRow(resource: resource)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct EnvironmentResourceRow: View {
    let resource: Resource

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(resource.status.color)
                .frame(width: 12, height: 12)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(resource.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text(resource.resourceType.displayName)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
        }
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
