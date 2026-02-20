import SwiftUI
import UIKit

extension Color {
    // Status Colors
    static let statusUp = Color(red: 34/255, green: 197/255, blue: 94/255)
    static let statusDown = Color(red: 239/255, green: 68/255, blue: 68/255)
    static let statusDegraded = Color(red: 245/255, green: 158/255, blue: 11/255)
    static let statusUnknown = Color(red: 107/255, green: 114/255, blue: 128/255)

    // Severity Colors
    static let severityCritical = Color(red: 220/255, green: 38/255, blue: 38/255)
    static let severityWarning = Color(red: 249/255, green: 115/255, blue: 22/255)
    static let severityInfo = Color(red: 59/255, green: 130/255, blue: 246/255)

    // Brand Colors
    static let brandPrimary = Color(red: 99/255, green: 102/255, blue: 241/255)
    static let brandSecondary = Color(red: 139/255, green: 92/255, blue: 246/255)

    // Background Colors
    static let backgroundPrimary = Color(UIColor.systemBackground)
    static let backgroundSecondary = Color(UIColor.secondarySystemBackground)
    static let backgroundTertiary = Color(UIColor.tertiarySystemBackground)

    // Text Colors
    static let textPrimary = Color(UIColor.label)
    static let textSecondary = Color(UIColor.secondaryLabel)
    static let textTertiary = Color(UIColor.tertiaryLabel)
}
