//
//  MonitoringCheckDetailView.swift
//  azuremonitor
//
//  Created by Chris Kave on 1/19/26.
//

import SwiftUI

struct MonitoringCheckDetailView: View {
    @StateObject private var viewModel: MonitoringCheckDetailViewModel

    init(check: MonitoringCheck) {
        _viewModel = StateObject(wrappedValue: MonitoringCheckDetailViewModel(check: check))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading && !viewModel.hasLoaded {
                LoadingView(message: "Loading check results...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error, viewModel.results.isEmpty {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadResults() } })
            } else {
                VStack(spacing: Spacing.lg) {
                    CheckStatusHero(viewModel: viewModel)
                    CheckConfigSection(check: viewModel.check)

                    if !viewModel.results.isEmpty {
                        ResponseTimeStatsSection(viewModel: viewModel)
                        RecentResultsSection(results: viewModel.results)
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle(viewModel.check.name)
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadResults()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

// MARK: - Check Status Hero

struct CheckStatusHero: View {
    @ObservedObject var viewModel: MonitoringCheckDetailViewModel

    var body: some View {
        VStack(spacing: Spacing.md) {
            Circle()
                .fill(viewModel.lastStatus.color)
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: viewModel.lastStatus == .up ? "checkmark" : "xmark")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                )

            Text(viewModel.lastStatus.displayName)
                .font(.displayMedium)
                .foregroundColor(viewModel.lastStatus.color)

            if let lastCheck = viewModel.lastCheckTime {
                Text("Last checked \(lastCheck.timeAgo)")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            // Success rate badge
            HStack(spacing: Spacing.sm) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundColor(.statusUp)
                Text(String(format: "%.1f%% success rate", viewModel.successRate))
                    .font(.labelMedium)
                    .foregroundColor(.textPrimary)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(Color.statusUp.opacity(0.15))
            .clipShape(Capsule())
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.xl)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Check Configuration Section

struct CheckConfigSection: View {
    let check: MonitoringCheck

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Configuration")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                CheckConfigRow(label: "Check Type", value: check.checkType.uppercased(), icon: checkTypeIcon)
                CheckConfigRow(label: "Interval", value: formatInterval(check.interval), icon: "clock")
                CheckConfigRow(label: "Status", value: check.isEnabled ? "Active" : "Paused", icon: check.isEnabled ? "checkmark.circle" : "pause.circle")
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var checkTypeIcon: String {
        switch check.checkType.lowercased() {
        case "http", "https": return "globe"
        case "ping", "icmp": return "antenna.radiowaves.left.and.right"
        case "tcp", "port": return "network"
        case "dns": return "server.rack"
        case "ssl", "certificate": return "lock.shield"
        default: return "checkmark.circle"
        }
    }

    private func formatInterval(_ seconds: Int) -> String {
        if seconds < 60 {
            return "\(seconds) seconds"
        } else if seconds < 3600 {
            let minutes = seconds / 60
            return "\(minutes) minute\(minutes > 1 ? "s" : "")"
        } else {
            let hours = seconds / 3600
            return "\(hours) hour\(hours > 1 ? "s" : "")"
        }
    }
}

struct CheckConfigRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.brandPrimary)
                .frame(width: 24)

            Text(label)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)
        }
        .padding(Spacing.sm)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Response Time Stats Section

struct ResponseTimeStatsSection: View {
    @ObservedObject var viewModel: MonitoringCheckDetailViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Response Time")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.md) {
                ResponseStatBox(label: "Avg", value: viewModel.averageResponseTime, unit: "ms")
                ResponseStatBox(label: "Min", value: viewModel.minResponseTime, unit: "ms")
                ResponseStatBox(label: "Max", value: viewModel.maxResponseTime, unit: "ms")
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ResponseStatBox: View {
    let label: String
    let value: Int
    let unit: String

    var body: some View {
        VStack(spacing: Spacing.xs) {
            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text("\(value)")
                    .font(.monoLarge)
                    .foregroundColor(responseTimeColor)
                Text(unit)
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }
            Text(label)
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var responseTimeColor: Color {
        if value < 200 {
            return .statusUp
        } else if value < 500 {
            return .statusDegraded
        } else {
            return .statusDown
        }
    }
}

// MARK: - Recent Results Section

struct RecentResultsSection: View {
    let results: [CheckResult]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Recent Results")
                    .font(.displaySmall)
                    .foregroundColor(.textPrimary)

                Spacer()

                Text("\(results.count) checks")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            VStack(spacing: Spacing.xs) {
                ForEach(results.prefix(20)) { result in
                    CheckResultRow(result: result)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CheckResultRow: View {
    let result: CheckResult

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Status indicator
            Circle()
                .fill(result.status.color)
                .frame(width: 10, height: 10)

            // Time
            if let checkedAt = result.checkedAt {
                Text(checkedAt.timeAgo)
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)
                    .frame(width: 80, alignment: .leading)
            }

            Spacer()

            // Response time
            if let responseTime = result.responseTimeMs {
                Text("\(responseTime)ms")
                    .font(.monoMedium)
                    .foregroundColor(responseTimeColor(responseTime))
            }

            // Status code
            if let statusCode = result.statusCode {
                Text("\(statusCode)")
                    .font(.labelSmall)
                    .foregroundColor(statusCodeColor(statusCode))
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xxs)
                    .background(statusCodeColor(statusCode).opacity(0.15))
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    private func responseTimeColor(_ ms: Int) -> Color {
        if ms < 200 {
            return .statusUp
        } else if ms < 500 {
            return .statusDegraded
        } else {
            return .statusDown
        }
    }

    private func statusCodeColor(_ code: Int) -> Color {
        switch code {
        case 200..<300: return .statusUp
        case 300..<400: return .severityInfo
        case 400..<500: return .severityWarning
        default: return .statusDown
        }
    }
}

#Preview {
    NavigationStack {
        MonitoringCheckDetailView(check: MonitoringCheck(
            id: UUID(),
            resourceId: UUID(),
            name: "HTTP Check",
            checkType: "http",
            isEnabled: true,
            interval: 60,
            createdAt: Date()
        ))
    }
}
