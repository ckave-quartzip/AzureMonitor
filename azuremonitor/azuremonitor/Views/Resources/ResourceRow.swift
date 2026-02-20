import SwiftUI

struct ResourceRow: View {
    let resource: Resource

    var body: some View {
        HStack(spacing: Spacing.md) {
            StatusIndicator(status: resource.status, size: .medium)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(resource.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                HStack(spacing: Spacing.xs) {
                    Image(systemName: resource.resourceType.icon)
                        .font(.system(size: 10))
                    Text(resource.resourceType.displayName)
                }
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                Text(resource.status.displayName)
                    .font(.labelSmall)
                    .foregroundColor(resource.status.color)

                if let lastChecked = resource.lastCheckedAt {
                    Text(lastChecked.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}
