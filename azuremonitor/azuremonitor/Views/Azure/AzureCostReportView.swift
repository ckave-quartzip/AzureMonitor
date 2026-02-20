import SwiftUI

struct AzureCostReportView: View {
    @StateObject private var viewModel = AzureCostReportViewModel()

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingProgressView(
                    progress: viewModel.loadingProgress,
                    status: viewModel.loadingStatus
                )
                .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadCostData() } })
            } else {
                VStack(spacing: Spacing.lg) {
                    // Date Range Picker
                    DateRangePicker(
                        fromDate: $viewModel.fromDate,
                        toDate: $viewModel.toDate,
                        onDateChange: {
                            Task { await viewModel.loadCostData() }
                        }
                    )

                    // Cost Summary Card
                    if let summary = viewModel.costSummary {
                        CostReportSummaryCard(summary: summary)
                    } else {
                        NoCostDataAvailable()
                    }

                    // Daily Cost Trend
                    if !viewModel.dailyCosts.isEmpty {
                        DailyCostSection(costs: viewModel.dailyCosts)
                    }

                    // Cost by Resource Group
                    if !viewModel.costsByResourceGroup.isEmpty {
                        CostByResourceGroupSection(costs: viewModel.costsByResourceGroup)
                    }

                    // Cost by Category
                    if !viewModel.costsByCategory.isEmpty {
                        CostByCategorySection(costs: viewModel.costsByCategory)
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("Cost Report")
        .refreshable {
            await viewModel.loadCostData()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

struct NoCostDataAvailable: View {
    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "dollarsign.circle")
                .font(.system(size: 48))
                .foregroundColor(.textTertiary)

            Text("No Cost Data")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text("No cost records found for the selected date range")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CostReportSummaryCard: View {
    let summary: AzureCostSummary

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Total Costs")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(summary.totalCost.formatted(.currency(code: summary.currency)))
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)

                    Text("Period: \(summary.period.from) to \(summary.period.to)")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }

                Spacer()
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct DailyCostSection: View {
    let costs: [DailyCost]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Daily Costs")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            ForEach(costs.suffix(7)) { cost in
                HStack {
                    Text(cost.date)
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Spacer()

                    Text(cost.cost.formatted(.currency(code: "USD")))
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)
                }
                .padding(.vertical, Spacing.xs)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CostByResourceGroupSection: View {
    let costs: [ResourceGroupCost]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost by Resource Group")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            ForEach(costs.prefix(10)) { cost in
                HStack {
                    Text(cost.resourceGroup)
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)

                    Spacer()

                    Text(cost.cost.formatted(.currency(code: "USD")))
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)
                }
                .padding(.vertical, Spacing.xs)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CostByCategorySection: View {
    let costs: [CategoryCost]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost by Category")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            ForEach(costs.prefix(10)) { cost in
                HStack {
                    Text(cost.category)
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Spacer()

                    Text(cost.cost.formatted(.currency(code: "USD")))
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)
                }
                .padding(.vertical, Spacing.xs)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
