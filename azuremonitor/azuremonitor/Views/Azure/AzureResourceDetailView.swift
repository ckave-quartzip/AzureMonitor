import SwiftUI

struct AzureResourceDetailView: View {
    @StateObject private var viewModel: AzureResourceDetailViewModel
    @State private var selectedPeriod = "7d"

    init(resourceId: UUID) {
        _viewModel = StateObject(wrappedValue: AzureResourceDetailViewModel(resourceId: resourceId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                if let resource = viewModel.resource {
                    // Resource Hero
                    resourceHero(resource)

                    // Resource Info
                    resourceInfoSection(resource)

                    // Metrics Section - always show with loading/empty state
                    metricsSection(viewModel.metricRecords, isLoading: viewModel.isLoading)

                    // Cost Section - always show with loading/empty state
                    costSection(viewModel.costRecords, isLoading: viewModel.isLoading)

                    // Tags Section
                    if let tags = resource.tags, !tags.isEmpty {
                        tagsSection(tags)
                    }

                    // Linked Resource
                    if let linkedResource = viewModel.linkedResource {
                        linkedResourceSection(linkedResource)
                    }
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle(viewModel.resource?.name ?? "Azure Resource")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadAllData()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
        .overlay {
            if viewModel.isLoading && viewModel.resource == nil {
                LoadingView(message: "Loading resource...")
            }
        }
    }

    private func resourceHero(_ resource: AzureResource) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: resourceTypeIcon(resource.resourceType))
                .font(.system(size: 40))
                .foregroundColor(.brandPrimary)

            Text(resource.name)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(resourceTypeDisplayName(resource.resourceType))
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            if let score = resource.optimizationScore {
                HStack(spacing: Spacing.xs) {
                    Text("Score:")
                        .foregroundColor(.textSecondary)
                    Text("\(score)")
                        .foregroundColor(score >= 80 ? .statusUp : score >= 50 ? .statusDegraded : .statusDown)
                }
                .font(.labelSmall)
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func resourceTypeIcon(_ resourceType: String) -> String {
        switch resourceType.lowercased() {
        case let t where t.contains("virtualmachine"): return "desktopcomputer"
        case let t where t.contains("database") || t.contains("sql"): return "cylinder"
        case let t where t.contains("storage"): return "externaldrive"
        case let t where t.contains("webapp") || t.contains("sites"): return "globe"
        case let t where t.contains("function"): return "bolt"
        case let t where t.contains("network"): return "network"
        case let t where t.contains("loadbalancer"): return "arrow.triangle.branch"
        default: return "cube"
        }
    }

    private func resourceTypeDisplayName(_ resourceType: String) -> String {
        // Extract the last part of the resource type (e.g., "Microsoft.Storage/storageAccounts" -> "Storage Account")
        let parts = resourceType.split(separator: "/")
        guard let lastPart = parts.last else { return resourceType }
        // Convert camelCase to Title Case with spaces
        return String(lastPart)
            .replacingOccurrences(of: "([a-z])([A-Z])", with: "$1 $2", options: .regularExpression)
            .capitalized
    }

    private func resourceInfoSection(_ resource: AzureResource) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Resource Information")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                AzureInfoRow(label: "Resource Group", value: resource.resourceGroup)
                AzureInfoRow(label: "Location", value: resource.location)
                AzureInfoRow(label: "Type", value: resource.resourceType)

                if let sku = resource.sku {
                    AzureInfoRow(label: "SKU", value: sku.name ?? "N/A")
                    if let tier = sku.tier {
                        AzureInfoRow(label: "Tier", value: tier)
                    }
                }

                if let kind = resource.kind {
                    AzureInfoRow(label: "Kind", value: kind)
                }

                if let tenantName = resource.azureTenants?.name {
                    AzureInfoRow(label: "Tenant", value: tenantName)
                }
            }
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func costSection(_ costRecords: [AzureResourceCostRecord], isLoading: Bool) -> some View {
        let totalCost = costRecords.compactMap { $0.cost }.reduce(0, +)
        let currency = costRecords.first?.currency ?? "USD"

        return VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost Analysis")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            if isLoading && costRecords.isEmpty {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding(Spacing.lg)
                    Spacer()
                }
                .background(Color.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else if costRecords.isEmpty {
                Text("No cost data available for this resource")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .padding(Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                HStack(spacing: Spacing.lg) {
                    VStack {
                        Text(formatCurrency(totalCost, currency: currency))
                            .font(.displayMedium)
                            .foregroundColor(.textPrimary)
                        Text("Total Cost")
                            .font(.labelSmall)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()
                }
                .padding(Spacing.lg)
                .background(Color.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                // Cost trend chart
                LineChartView(
                    data: costRecords.compactMap { cost in
                        guard let date = cost.date, let value = cost.cost else { return nil }
                        return ChartDataPoint(label: date, value: value)
                    },
                    lineColor: .brandPrimary
                )
                .frame(height: 120)
            }
        }
    }

    private func metricsSection(_ metricRecords: [AzureResourceMetricRecord], isLoading: Bool) -> some View {
        // Group by metric name and get the latest for each
        var latestMetrics: [String: AzureResourceMetricRecord] = [:]
        for metric in metricRecords {
            if let name = metric.metricName {
                if let existing = latestMetrics[name] {
                    if let newTime = metric.timestampUtc, let existingTime = existing.timestampUtc, newTime > existingTime {
                        latestMetrics[name] = metric
                    }
                } else {
                    latestMetrics[name] = metric
                }
            }
        }
        let uniqueMetrics = Array(latestMetrics.values)

        return VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Performance Metrics")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            if isLoading && uniqueMetrics.isEmpty {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding(Spacing.lg)
                    Spacer()
                }
                .background(Color.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else if !uniqueMetrics.isEmpty {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.md) {
                    ForEach(uniqueMetrics) { metric in
                        MetricRecordCard(metric: metric)
                    }
                }
            } else {
                Text("No metrics available for this resource type")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
                    .padding(Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private func tagsSection(_ tags: [String: String]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Tags")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            FlowLayout(spacing: Spacing.sm) {
                ForEach(Array(tags.keys.sorted()), id: \.self) { key in
                    HStack(spacing: Spacing.xxs) {
                        Text(key)
                            .foregroundColor(.textSecondary)
                        Text(":")
                            .foregroundColor(.textTertiary)
                        Text(tags[key] ?? "")
                            .foregroundColor(.textPrimary)
                    }
                    .font(.labelSmall)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color.backgroundSecondary)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
        }
    }

    private func linkedResourceSection(_ resource: Resource) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Linked Internal Resource")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            NavigationLink(destination: ResourceDetailView(resourceId: resource.id)) {
                HStack(spacing: Spacing.md) {
                    StatusIndicator(status: resource.status, size: .medium)

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(resource.name)
                            .font(.labelMedium)
                            .foregroundColor(.textPrimary)

                        Text(resource.resourceType.displayName)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundColor(.textTertiary)
                }
                .padding(Spacing.md)
                .background(Color.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
        }
    }

    private func formatCurrency(_ value: Double, currency: String = "USD") -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        return formatter.string(from: NSNumber(value: value)) ?? "$0.00"
    }
}

// MARK: - Helper Views

struct AzureInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)
        }
    }
}

struct MetricCard: View {
    let metric: AzureMetricDataPoint

    var body: some View {
        VStack(spacing: Spacing.sm) {
            Text(metric.name ?? "Unknown")
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
                .lineLimit(1)

            Text(metric.displayValue)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if let unit = metric.unit {
                Text(unit)
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct MetricRecordCard: View {
    let metric: AzureResourceMetricRecord

    var body: some View {
        VStack(spacing: Spacing.sm) {
            Text(metric.displayName)
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
                .lineLimit(1)

            Text(metric.displayValue)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if let unit = metric.unit {
                Text(unit)
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var positions: [CGPoint] = []
        var size: CGSize = .zero

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}
