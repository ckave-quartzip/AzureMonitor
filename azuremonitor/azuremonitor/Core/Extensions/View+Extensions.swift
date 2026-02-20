import SwiftUI

extension View {
    func cardStyle() -> some View {
        self
            .padding(Spacing.lg)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
