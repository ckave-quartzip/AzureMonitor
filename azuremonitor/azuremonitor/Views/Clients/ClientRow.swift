import SwiftUI

struct ClientRow: View {
    let client: Client

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(client.status == .active ? Color.statusUp : Color.statusUnknown)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(client.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                if let email = client.contactEmail {
                    Text(email)
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
            }

            Spacer()

            Text(client.status.rawValue.capitalized)
                .font(.labelSmall)
                .foregroundColor(client.status == .active ? .statusUp : .textTertiary)
        }
        .padding(.vertical, Spacing.xs)
    }
}
