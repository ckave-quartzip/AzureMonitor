import SwiftUI

extension Font {
    static let displayLarge = Font.system(.largeTitle, design: .default, weight: .bold)
    static let displayMedium = Font.system(.title, design: .default, weight: .semibold)
    static let displaySmall = Font.system(.title2, design: .default, weight: .semibold)
    static let bodyLarge = Font.system(.body, design: .default, weight: .regular)
    static let bodyMedium = Font.system(.callout, design: .default, weight: .regular)
    static let bodySmall = Font.system(.footnote, design: .default, weight: .regular)
    static let labelLarge = Font.system(.subheadline, design: .default, weight: .medium)
    static let labelMedium = Font.system(.caption, design: .default, weight: .medium)
    static let labelSmall = Font.system(.caption2, design: .default, weight: .medium)
    static let monoLarge = Font.system(.body, design: .monospaced, weight: .regular)
    static let monoMedium = Font.system(.footnote, design: .monospaced, weight: .regular)
}
