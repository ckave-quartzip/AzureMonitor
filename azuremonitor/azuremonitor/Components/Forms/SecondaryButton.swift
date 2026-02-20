import SwiftUI

struct SecondaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .brandPrimary))
                }
                Text(title)
                    .font(.labelLarge)
            }
            .frame(maxWidth: .infinity)
            .foregroundColor(.brandPrimary)
            .padding(.vertical, Spacing.md)
            .background(Color.brandPrimary.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .disabled(isLoading || isDisabled)
    }
}
