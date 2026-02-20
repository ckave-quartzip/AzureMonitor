import SwiftUI

struct ErrorView: View {
    let error: Error
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.severityWarning)

            Text("Something went wrong")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(error.localizedDescription)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            Button(action: retryAction) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.labelLarge)
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(Color.brandPrimary)
                    .clipShape(Capsule())
            }
        }
        .padding(Spacing.xxl)
    }
}
