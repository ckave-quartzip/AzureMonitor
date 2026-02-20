import SwiftUI

struct AlertRow: View {
    let alert: Alert
    let onAcknowledge: () -> Void
    let onResolve: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(alert.severity.color)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(alert.title)
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    SeverityBadge(severity: alert.severity)
                }

                Text(alert.message)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
                    .lineLimit(2)

                HStack {
                    StatusBadge(status: alert.status)

                    Spacer()

                    Text(alert.triggeredAt.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.vertical, Spacing.sm)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            if alert.status != .resolved {
                Button(action: onResolve) {
                    Label("Resolve", systemImage: "checkmark.circle")
                }
                .tint(.statusUp)
            }

            if alert.status == .active {
                Button(action: onAcknowledge) {
                    Label("Acknowledge", systemImage: "eye")
                }
                .tint(.brandPrimary)
            }
        }
    }
}
