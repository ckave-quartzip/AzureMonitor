//
//  MonitoringCheckDetailViewModel.swift
//  azuremonitor
//
//  Created by Chris Kave on 1/19/26.
//

import Foundation
import Combine

@MainActor
class MonitoringCheckDetailViewModel: ObservableObject {
    @Published var check: MonitoringCheck
    @Published var results: [CheckResult] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    private let apiClient = APIClient.shared

    init(check: MonitoringCheck) {
        self.check = check
    }

    func loadResults() async {
        isLoading = true
        error = nil

        do {
            results = try await apiClient.requestArrayOrEmpty(.checkResults(checkId: check.id, limit: 50))
            hasLoaded = true
        } catch is CancellationError {
            // Ignore cancellation
        } catch let urlError as URLError where urlError.code == .cancelled {
            // Ignore URL session cancellation
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadResults()
    }

    // MARK: - Computed Stats

    var successRate: Double {
        guard !results.isEmpty else { return 0 }
        let successCount = results.filter { $0.status == .up }.count
        return Double(successCount) / Double(results.count) * 100
    }

    var averageResponseTime: Int {
        let times = results.compactMap { $0.responseTimeMs }
        guard !times.isEmpty else { return 0 }
        return times.reduce(0, +) / times.count
    }

    var minResponseTime: Int {
        results.compactMap { $0.responseTimeMs }.min() ?? 0
    }

    var maxResponseTime: Int {
        results.compactMap { $0.responseTimeMs }.max() ?? 0
    }

    var lastCheckTime: Date? {
        results.first?.checkedAt
    }

    var lastStatus: ResourceStatus {
        results.first?.status ?? .unknown
    }
}
