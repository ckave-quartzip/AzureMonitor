import SwiftUI

struct StatusIndicator: View {
    enum Size { case small, medium, large }

    let status: ResourceStatus
    let size: Size

    var body: some View {
        Circle()
            .fill(status.color)
            .frame(width: dimension, height: dimension)
            .overlay(
                Circle()
                    .stroke(status.color.opacity(0.3), lineWidth: 2)
            )
    }

    private var dimension: CGFloat {
        switch size {
        case .small: return 8
        case .medium: return 12
        case .large: return 16
        }
    }
}
