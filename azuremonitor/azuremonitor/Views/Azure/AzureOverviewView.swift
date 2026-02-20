import SwiftUI

struct AzureOverviewView: View {
    @StateObject private var viewModel = AzureOverviewViewModel()

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingProgressView(
                    progress: viewModel.loadingProgress,
                    status: viewModel.loadingStatus
                )
                .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadOverview() } })
            } else {
                VStack(spacing: Spacing.lg) {
                    // Date Range Picker
                    DateRangePicker(
                        fromDate: $viewModel.fromDate,
                        toDate: $viewModel.toDate,
                        onDateChange: {
                            Task { await viewModel.loadOverview() }
                        }
                    )
                    .padding(.horizontal, Spacing.lg)

                    // Cost Summary
                    if let costSummary = viewModel.costSummary {
                        CostSummaryCard(summary: costSummary)
                    } else {
                        NoCostDataCard()
                    }

                    // Resource Stats
                    if viewModel.resourceCount > 0 {
                        ResourceStatsCard(resourceCount: viewModel.resourceCount, resourcesByType: viewModel.resourcesByType)
                    }

                    // Tenants List
                    TenantsList(tenants: viewModel.tenants, selectedTenant: viewModel.selectedTenant) { tenant in
                        Task { await viewModel.selectTenant(tenant) }
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("Azure")
        .refreshable {
            await viewModel.loadOverview()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

struct NoCostDataCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost Summary")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text("No cost data available for the selected period")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ResourceStatsCard: View {
    let resourceCount: Int
    let resourcesByType: [String: [AzureResource]]
    @State private var expandedType: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Azure Resources")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text("\(resourceCount) total resources")
                .font(.displayMedium)
                .foregroundColor(.brandPrimary)

            if !resourcesByType.isEmpty {
                Divider()

                ForEach(Array(resourcesByType.keys.sorted()), id: \.self) { type in
                    if let resources = resourcesByType[type] {
                        VStack(spacing: Spacing.sm) {
                            // Resource type header - tap to expand
                            Button(action: {
                                withAnimation {
                                    expandedType = expandedType == type ? nil : type
                                }
                            }) {
                                HStack {
                                    Image(systemName: iconForResourceType(type))
                                        .foregroundColor(.brandPrimary)
                                        .frame(width: 20)

                                    Text(type.components(separatedBy: "/").last ?? type)
                                        .font(.labelMedium)
                                        .foregroundColor(.textPrimary)
                                        .lineLimit(1)

                                    Spacer()

                                    Text("\(resources.count)")
                                        .font(.labelLarge)
                                        .foregroundColor(.textSecondary)

                                    Image(systemName: expandedType == type ? "chevron.up" : "chevron.down")
                                        .font(.caption)
                                        .foregroundColor(.textTertiary)
                                }
                            }
                            .buttonStyle(.plain)

                            // Expanded resource list
                            if expandedType == type {
                                ForEach(resources) { resource in
                                    NavigationLink(destination: AzureResourceDetailView(resourceId: resource.id)) {
                                        HStack(spacing: Spacing.sm) {
                                            Circle()
                                                .fill(Color.statusUp)
                                                .frame(width: 8, height: 8)

                                            Text(resource.name)
                                                .font(.bodySmall)
                                                .foregroundColor(.textPrimary)
                                                .lineLimit(1)

                                            Spacer()

                                            Text(resource.location)
                                                .font(.labelSmall)
                                                .foregroundColor(.textTertiary)

                                            Image(systemName: "chevron.right")
                                                .font(.caption2)
                                                .foregroundColor(.textTertiary)
                                        }
                                        .padding(.vertical, Spacing.xs)
                                        .padding(.leading, Spacing.lg)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func iconForResourceType(_ type: String) -> String {
        let typeLower = type.lowercased()
        if typeLower.contains("virtualmachine") { return "desktopcomputer" }
        if typeLower.contains("sql") || typeLower.contains("database") { return "cylinder.split.1x2" }
        if typeLower.contains("storage") { return "externaldrive" }
        if typeLower.contains("webapp") || typeLower.contains("sites") { return "globe" }
        if typeLower.contains("function") { return "function" }
        if typeLower.contains("network") || typeLower.contains("vnet") { return "network" }
        if typeLower.contains("loadbalancer") { return "arrow.triangle.branch" }
        if typeLower.contains("keyvault") { return "key" }
        if typeLower.contains("redis") { return "memorychip" }
        return "cloud"
    }
}

struct CostSummaryCard: View {
    let summary: AzureCostSummary

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost Summary")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Total Cost")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Text("$\(summary.totalCost as NSDecimalNumber, formatter: currencyFormatter)")
                        .font(.displayMedium)
                        .foregroundColor(.textPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    Text("Period")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Text("\(summary.period.from) - \(summary.period.to)")
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var currencyFormatter: NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter
    }
}

struct TenantsList: View {
    let tenants: [AzureTenant]
    let selectedTenant: AzureTenant?
    let onSelect: (AzureTenant?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Azure Tenants")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if tenants.isEmpty {
                Text("No Azure tenants configured")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            } else {
                VStack(spacing: Spacing.sm) {
                    TenantButton(title: "All Tenants", isSelected: selectedTenant == nil) {
                        onSelect(nil)
                    }

                    ForEach(tenants) { tenant in
                        TenantButton(title: tenant.name, isSelected: selectedTenant?.id == tenant.id) {
                            onSelect(tenant)
                        }
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct TenantButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.labelLarge)
                    .foregroundColor(isSelected ? .white : .textPrimary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundColor(.white)
                }
            }
            .padding(Spacing.md)
            .background(isSelected ? Color.brandPrimary : Color.backgroundTertiary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
