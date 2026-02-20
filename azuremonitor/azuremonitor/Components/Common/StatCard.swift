import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String?
    let icon: String
    let tint: Color

    init(title: String, value: String, subtitle: String? = nil, icon: String, tint: Color = .brandPrimary) {
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.icon = icon
        self.tint = tint
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(tint)
                Spacer()
            }

            Text(value)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(title)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
