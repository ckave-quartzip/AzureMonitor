import SwiftUI

struct ClientDetailView: View {
    @StateObject private var viewModel: ClientDetailViewModel

    init(clientId: UUID) {
        _viewModel = StateObject(wrappedValue: ClientDetailViewModel(clientId: clientId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading client...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let client = viewModel.client {
                VStack(spacing: Spacing.lg) {
                    ClientInfoCard(client: client)
                    EnvironmentsSection(environments: viewModel.environments)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle(viewModel.client?.name ?? "Client")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadDetails()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

struct ClientInfoCard: View {
    let client: Client

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Circle()
                    .fill(client.status == .active ? Color.statusUp : Color.statusUnknown)
                    .frame(width: 12, height: 12)
                Text(client.status.rawValue.capitalized)
                    .font(.labelMedium)
                    .foregroundColor(client.status == .active ? .statusUp : .textTertiary)
            }

            if let email = client.contactEmail {
                InfoRow(label: "Contact", value: email, icon: "envelope")
            }

            if let description = client.description {
                InfoRow(label: "Description", value: description, icon: "doc.text")
            }

            if let fee = client.monthlyHostingFee {
                InfoRow(label: "Monthly Fee", value: "$\(fee)", icon: "dollarsign.circle")
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct EnvironmentsSection: View {
    let environments: [DeploymentEnvironment]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Environments")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if environments.isEmpty {
                Text("No environments configured")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            } else {
                ForEach(environments) { env in
                    NavigationLink(destination: EnvironmentDetailView(environmentId: env.id)) {
                        EnvironmentRow(environment: env)
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

struct EnvironmentRow: View {
    let environment: DeploymentEnvironment

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "folder")
                .foregroundColor(.brandPrimary)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(environment.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                if let description = environment.description {
                    Text(description)
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
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
