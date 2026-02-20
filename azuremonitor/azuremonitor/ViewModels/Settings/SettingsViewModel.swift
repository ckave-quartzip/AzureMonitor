import Foundation
import Combine
import LocalAuthentication

@MainActor
class SettingsViewModel: ObservableObject {
    @Published var showBiometricError = false
    @Published var biometricErrorMessage = ""
    @Published var isSigningOut = false

    private let authService = AuthService.shared
    private let biometricService = BiometricService()
    let userSettings = UserSettingsService.shared

    // MARK: - Biometrics
    var biometricTypeLabel: String {
        switch biometricService.biometricType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .none: return "Biometrics"
        }
    }

    var biometricIcon: String {
        switch biometricService.biometricType {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .none: return "lock"
        }
    }

    var canUseBiometrics: Bool {
        biometricService.biometricType != .none
    }

    func toggleBiometrics(_ enabled: Bool) async {
        if enabled {
            // Verify biometrics work before enabling
            let success = await biometricService.authenticate()
            if success {
                userSettings.biometricsEnabled = true
            } else {
                biometricErrorMessage = "Could not verify \(biometricTypeLabel). Please try again."
                showBiometricError = true
                userSettings.biometricsEnabled = false
            }
        } else {
            userSettings.biometricsEnabled = false
        }
    }

    // MARK: - Notifications
    func requestNotificationPermission() async {
        // Use PushNotificationService which handles both authorization AND registration
        let pushService = PushNotificationService.shared
        let granted = await pushService.requestAuthorization()
        userSettings.notificationsEnabled = granted
    }

    // MARK: - Sign Out
    func signOut() async {
        isSigningOut = true
        await authService.signOut()
        isSigningOut = false
    }

    // MARK: - Reset
    func resetSettings() {
        userSettings.resetToDefaults()
    }
}

// Import for UNUserNotificationCenter
import UserNotifications
