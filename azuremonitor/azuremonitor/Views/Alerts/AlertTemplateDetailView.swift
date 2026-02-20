import SwiftUI

struct AlertTemplateDetailView: View {
    let template: AlertTemplate

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Header Card
                VStack(spacing: Spacing.md) {
                    HStack {
                        Image(systemName: "doc.text.fill")
                            .font(.title)
                            .foregroundColor(.brandPrimary)

                        VStack(alignment: .leading, spacing: Spacing.xxs) {
                            Text(template.name)
                                .font(.displaySmall)
                                .foregroundColor(.textPrimary)

                            if template.isBuiltIn {
                                Text("Built-in Template")
                                    .font(.labelSmall)
                                    .foregroundColor(.brandPrimary)
                            }
                        }

                        Spacer()

                        SeverityBadge(severity: template.severity)
                    }

                    if let description = template.description {
                        Text(description)
                            .font(.bodyMedium)
                            .foregroundColor(.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(Spacing.lg)
                .background(Color.backgroundSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Configuration Section
                DetailSection(title: "Configuration") {
                    DetailRow(label: "Rule Type", value: template.ruleType.displayName)

                    if let resourceType = template.azureResourceType {
                        DetailRow(label: "Resource Type", value: formatResourceType(resourceType))
                    }

                    if let threshold = template.threshold {
                        DetailRow(label: "Threshold", value: formatThreshold(threshold, operator: template.thresholdOperator))
                    }

                    if let duration = template.duration {
                        DetailRow(label: "Duration", value: "\(duration) minutes")
                    }

                    if let cooldown = template.cooldownMinutes {
                        DetailRow(label: "Cooldown", value: "\(cooldown) minutes")
                    }
                }

                // Metadata Section
                DetailSection(title: "Metadata") {
                    DetailRow(label: "Severity", value: template.severity.rawValue.capitalized)

                    if let createdAt = template.createdAt {
                        DetailRow(label: "Created", value: createdAt.formatted(date: .abbreviated, time: .shortened))
                    }

                    if let updatedAt = template.updatedAt {
                        DetailRow(label: "Updated", value: updatedAt.formatted(date: .abbreviated, time: .shortened))
                    }
                }

                Spacer()
            }
            .padding(Spacing.lg)
        }
        .background(Color.backgroundPrimary)
        .navigationTitle("Template Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formatResourceType(_ type: String) -> String {
        // Convert "Microsoft.Sql/servers/databases" to "SQL Database"
        let parts = type.components(separatedBy: "/")
        if let last = parts.last {
            return last.capitalized
        }
        return type
    }

    private func formatThreshold(_ value: Double, operator op: String?) -> String {
        let opSymbol: String
        switch op?.lowercased() {
        case "gt", "greaterthan", ">":
            opSymbol = ">"
        case "gte", "greaterthanorequal", ">=":
            opSymbol = ">="
        case "lt", "lessthan", "<":
            opSymbol = "<"
        case "lte", "lessthanorequal", "<=":
            opSymbol = "<="
        case "eq", "equal", "==":
            opSymbol = "="
        default:
            opSymbol = op ?? "="
        }

        if value >= 1_000_000 {
            return "\(opSymbol) \(String(format: "%.1fM", value / 1_000_000))"
        } else if value >= 1_000 {
            return "\(opSymbol) \(String(format: "%.1fK", value / 1_000))"
        } else if value == floor(value) {
            return "\(opSymbol) \(Int(value))"
        } else {
            return "\(opSymbol) \(String(format: "%.2f", value))"
        }
    }
}

// MARK: - Helper Views

private struct DetailSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            VStack(spacing: 0) {
                content
            }
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

private struct DetailRow: View {
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
        .padding(Spacing.md)
    }
}
