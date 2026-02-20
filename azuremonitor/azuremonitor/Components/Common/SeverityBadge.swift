import SwiftUI

struct SeverityBadge: View {
    let severity: AlertSeverity

    var body: some View {
        Text(severity.displayName)
            .font(.labelSmall)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(severity.color)
            .clipShape(Capsule())
    }
}
