import SwiftUI

struct IncidentRow: View {
    let incident: Incident

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(incident.title)
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    SeverityBadge(severity: incident.severity)
                }

                if let description = incident.description {
                    Text(description)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .lineLimit(2)
                }

                HStack {
                    IncidentStatusBadge(status: incident.status)

                    Spacer()

                    if let createdAt = incident.createdAt {
                        Text(createdAt.timeAgo)
                            .font(.labelSmall)
                            .foregroundColor(.textTertiary)
                    }
                }
            }
        }
        .padding(.vertical, Spacing.sm)
    }
}

struct IncidentStatusBadge: View {
    let status: IncidentStatus

    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.labelSmall)
            .foregroundColor(foregroundColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(backgroundColor)
            .clipShape(Capsule())
    }

    private var foregroundColor: Color {
        switch status {
        case .open: return .white
        case .investigating: return .severityWarning
        case .resolved, .closed: return .statusUp
        }
    }

    private var backgroundColor: Color {
        switch status {
        case .open: return .severityCritical
        case .investigating: return .severityWarning.opacity(0.2)
        case .resolved, .closed: return .statusUp.opacity(0.2)
        }
    }
}
