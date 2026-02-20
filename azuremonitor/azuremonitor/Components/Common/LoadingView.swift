import SwiftUI

struct LoadingView: View {
    let message: String?

    init(message: String? = nil) {
        self.message = message
    }

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())

            if let message = message {
                Text(message)
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}

struct LoadingProgressView: View {
    let progress: Double
    let status: String

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Circular progress indicator
            ZStack {
                Circle()
                    .stroke(Color.backgroundTertiary, lineWidth: 8)
                    .frame(width: 80, height: 80)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.brandPrimary, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .frame(width: 80, height: 80)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.3), value: progress)

                Text("\(Int(progress * 100))%")
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)
            }

            Text(status)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(Spacing.xl)
    }
}
