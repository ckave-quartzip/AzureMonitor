import Foundation
import Combine

@MainActor
class LoginViewModel: ObservableObject {
    @Published var apiKey = ""
    @Published var isLoading = false
    @Published var error: Error?
    @Published var showBiometricOption = false

    private let authService = AuthService.shared
    private let biometricService = BiometricService()

    init() {
        showBiometricOption = biometricService.biometricType != .none
    }

    var isFormValid: Bool {
        !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func signInWithAPIKey() async {
        isLoading = true
        error = nil

        do {
            try await authService.signIn(apiKey: apiKey.trimmingCharacters(in: .whitespacesAndNewlines))
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func signInWithAzure() async {
        isLoading = true
        error = nil

        do {
            try await authService.signInWithAzure()
        } catch let authError as AuthError {
            // Don't show error if user just cancelled
            if case .userCancelled = authError {
                // User cancelled, do nothing
            } else {
                self.error = authError
            }
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func signInWithBiometrics() async {
        let success = await authService.authenticateWithBiometrics()
        if success {
            // Biometric auth succeeded, user is now authenticated
        }
    }
}
