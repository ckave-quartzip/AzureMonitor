import Foundation

/// API Validation utility - can be used for debugging and testing
/// Call APIValidation.runAllChecks() from the app to validate all endpoints
@MainActor
class APIValidation {
    private let apiClient = APIClient.shared

    struct ValidationResult {
        let endpoint: String
        let success: Bool
        let message: String
        let recordCount: Int?
    }

    var results: [ValidationResult] = []

    /// Run all API validations and print results
    static func runAllChecks() async {
        let validator = APIValidation()
        await validator.validateAll()
        validator.printReport()
    }

    func validateAll() async {
        results = []

        // Azure endpoints
        await validateAzureTenants()
        await validateAzureResources()
        await validateAzureCostSummary()

        // SQL endpoints
        await validateSQLDatabasesOverview()
        await validateSQLStatsSummary()

        // Dashboard
        await validateDashboardSummary()
    }

    func printReport() {
        print("\n" + String(repeating: "=", count: 60))
        print("API VALIDATION REPORT")
        print(String(repeating: "=", count: 60))

        var passCount = 0
        var failCount = 0

        for result in results {
            let status = result.success ? "PASS" : "FAIL"
            let countStr = result.recordCount.map { " (\($0) records)" } ?? ""
            print("[\(status)] \(result.endpoint)\(countStr)")
            if !result.success {
                print("       Error: \(result.message)")
            }

            if result.success { passCount += 1 } else { failCount += 1 }
        }

        print(String(repeating: "-", count: 60))
        print("Total: \(passCount) passed, \(failCount) failed")
        print(String(repeating: "=", count: 60) + "\n")
    }

    // MARK: - Individual Validators

    private func validateAzureTenants() async {
        do {
            let tenants: [AzureTenant] = try await apiClient.request(.azureTenants)
            results.append(ValidationResult(
                endpoint: "/azure/tenants",
                success: true,
                message: "OK",
                recordCount: tenants.count
            ))
        } catch {
            results.append(ValidationResult(
                endpoint: "/azure/tenants",
                success: false,
                message: "\(error)",
                recordCount: nil
            ))
        }
    }

    private func validateAzureResources() async {
        do {
            let resources: [AzureResource] = try await apiClient.request(.azureResources())
            results.append(ValidationResult(
                endpoint: "/azure/resources",
                success: true,
                message: "OK",
                recordCount: resources.count
            ))
        } catch {
            results.append(ValidationResult(
                endpoint: "/azure/resources",
                success: false,
                message: "\(error)",
                recordCount: nil
            ))
        }
    }

    private func validateAzureCostSummary() async {
        do {
            // Cost data is loaded via fetchAllCostRecords and aggregated in the app
            // We validate that the raw costs endpoint works
            let records = try await apiClient.fetchAllCostRecords(tenantId: nil, dateFrom: nil, dateTo: nil)
            results.append(ValidationResult(
                endpoint: "/azure/costs",
                success: true,
                message: "OK",
                recordCount: records.count
            ))
        } catch {
            results.append(ValidationResult(
                endpoint: "/azure/costs",
                success: false,
                message: "\(error)",
                recordCount: nil
            ))
        }
    }

    private func validateSQLDatabasesOverview() async {
        do {
            let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
            results.append(ValidationResult(
                endpoint: "/sql/databases/overview",
                success: true,
                message: "OK",
                recordCount: databases.count
            ))

            // Validate data structure
            for db in databases {
                if db.name.isEmpty {
                    print("  WARNING: Database with empty name found (ID: \(db.id))")
                }
            }
        } catch {
            results.append(ValidationResult(
                endpoint: "/sql/databases/overview",
                success: false,
                message: "\(error)",
                recordCount: nil
            ))
        }
    }

    private func validateSQLStatsSummary() async {
        do {
            let summary: SQLStatsSummary? = try await apiClient.requestOptional(.sqlStatsSummary())
            results.append(ValidationResult(
                endpoint: "/sql/stats/summary",
                success: true,
                message: summary != nil ? "OK" : "No data (optional)",
                recordCount: summary != nil ? 1 : 0
            ))

            if let summary = summary {
                print("  SQL Stats: \(summary.totalDatabases) DBs, Avg CPU: \(summary.averageCpuPercent ?? 0)%")
            }
        } catch {
            results.append(ValidationResult(
                endpoint: "/sql/stats/summary",
                success: false,
                message: "\(error)",
                recordCount: nil
            ))
        }
    }

    private func validateDashboardSummary() async {
        do {
            let summary: DashboardSummary = try await apiClient.request(.dashboardSummary)
            results.append(ValidationResult(
                endpoint: "/dashboard/summary",
                success: true,
                message: "OK",
                recordCount: 1
            ))
            print("  Dashboard: \(summary.resourcesCount) resources, \(summary.clientsCount) clients")
        } catch {
            results.append(ValidationResult(
                endpoint: "/dashboard/summary",
                success: false,
                message: "\(error)",
                recordCount: nil
            ))
        }
    }
}
