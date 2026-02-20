import SwiftUI

struct StatusBadge: View {
    let status: AlertStatus

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
        case .active: return .white
        case .acknowledged: return .brandPrimary
        case .resolved: return .statusUp
        }
    }

    private var backgroundColor: Color {
        switch status {
        case .active: return .severityCritical
        case .acknowledged: return .brandPrimary.opacity(0.2)
        case .resolved: return .statusUp.opacity(0.2)
        }
    }
}
