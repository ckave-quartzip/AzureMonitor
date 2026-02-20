import Foundation
import SwiftUI
import UIKit
import Combine

@MainActor
class UserSettingsService: ObservableObject {
    static let shared = UserSettingsService()

    private let defaults = UserDefaults.standard

    // MARK: - Keys
    private enum Keys {
        static let theme = "user_theme"
        static let biometricsEnabled = "biometrics_enabled"
        static let notificationsEnabled = "notifications_enabled"
        static let autoRefreshEnabled = "auto_refresh_enabled"
        static let refreshIntervalSeconds = "refresh_interval_seconds"
        static let showResourceCosts = "show_resource_costs"
        static let defaultDashboardTab = "default_dashboard_tab"
        static let compactAlertView = "compact_alert_view"
        static let hapticFeedbackEnabled = "haptic_feedback_enabled"
    }

    // MARK: - Theme
    enum Theme: String, CaseIterable, Identifiable {
        case system = "system"
        case light = "light"
        case dark = "dark"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .system: return "System"
            case .light: return "Light"
            case .dark: return "Dark"
            }
        }

        var colorScheme: ColorScheme? {
            switch self {
            case .system: return nil
            case .light: return .light
            case .dark: return .dark
            }
        }

        var icon: String {
            switch self {
            case .system: return "circle.lefthalf.filled"
            case .light: return "sun.max.fill"
            case .dark: return "moon.fill"
            }
        }
    }

    // MARK: - Dashboard Tab
    enum DashboardTab: String, CaseIterable, Identifiable {
        case overview = "overview"
        case resources = "resources"
        case alerts = "alerts"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .overview: return "Overview"
            case .resources: return "Resources"
            case .alerts: return "Alerts"
            }
        }
    }

    // MARK: - Published Properties
    @Published var theme: Theme {
        didSet {
            defaults.set(theme.rawValue, forKey: Keys.theme)
        }
    }

    @Published var biometricsEnabled: Bool {
        didSet {
            defaults.set(biometricsEnabled, forKey: Keys.biometricsEnabled)
        }
    }

    @Published var notificationsEnabled: Bool {
        didSet {
            defaults.set(notificationsEnabled, forKey: Keys.notificationsEnabled)
        }
    }

    @Published var autoRefreshEnabled: Bool {
        didSet {
            defaults.set(autoRefreshEnabled, forKey: Keys.autoRefreshEnabled)
        }
    }

    @Published var refreshIntervalSeconds: Int {
        didSet {
            defaults.set(refreshIntervalSeconds, forKey: Keys.refreshIntervalSeconds)
        }
    }

    @Published var showResourceCosts: Bool {
        didSet {
            defaults.set(showResourceCosts, forKey: Keys.showResourceCosts)
        }
    }

    @Published var defaultDashboardTab: DashboardTab {
        didSet {
            defaults.set(defaultDashboardTab.rawValue, forKey: Keys.defaultDashboardTab)
        }
    }

    @Published var compactAlertView: Bool {
        didSet {
            defaults.set(compactAlertView, forKey: Keys.compactAlertView)
        }
    }

    @Published var hapticFeedbackEnabled: Bool {
        didSet {
            defaults.set(hapticFeedbackEnabled, forKey: Keys.hapticFeedbackEnabled)
        }
    }

    // MARK: - Computed Properties
    var colorScheme: ColorScheme? {
        theme.colorScheme
    }

    // MARK: - Initialization
    private init() {
        // Load saved values or use defaults
        let savedTheme = defaults.string(forKey: Keys.theme) ?? Theme.system.rawValue
        self.theme = Theme(rawValue: savedTheme) ?? .system

        self.biometricsEnabled = defaults.bool(forKey: Keys.biometricsEnabled)
        self.notificationsEnabled = defaults.object(forKey: Keys.notificationsEnabled) as? Bool ?? true
        self.autoRefreshEnabled = defaults.object(forKey: Keys.autoRefreshEnabled) as? Bool ?? true
        self.refreshIntervalSeconds = defaults.object(forKey: Keys.refreshIntervalSeconds) as? Int ?? 30
        self.showResourceCosts = defaults.object(forKey: Keys.showResourceCosts) as? Bool ?? true

        let savedTab = defaults.string(forKey: Keys.defaultDashboardTab) ?? DashboardTab.overview.rawValue
        self.defaultDashboardTab = DashboardTab(rawValue: savedTab) ?? .overview

        self.compactAlertView = defaults.bool(forKey: Keys.compactAlertView)
        self.hapticFeedbackEnabled = defaults.object(forKey: Keys.hapticFeedbackEnabled) as? Bool ?? true
    }

    // MARK: - Methods
    func resetToDefaults() {
        theme = .system
        biometricsEnabled = false
        notificationsEnabled = true
        autoRefreshEnabled = true
        refreshIntervalSeconds = 30
        showResourceCosts = true
        defaultDashboardTab = .overview
        compactAlertView = false
        hapticFeedbackEnabled = true
    }

    func triggerHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        guard hapticFeedbackEnabled else { return }
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
}
