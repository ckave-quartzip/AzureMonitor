import Foundation
import Combine
import UIKit
import AuthenticationServices

@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var error: Error?

    private let keychainService = KeychainService()
    private let biometricService = BiometricService()
    private let apiClient = APIClient.shared

    // Default API key for app access (all authenticated users use this)
    private let defaultAPIKey = "qtz_H0N0X53ETxvzmqac9DfJ767GGtQgvE6WR6umCgOPoCE"

    // OAuth configuration
    private let supabaseURL = "https://zkqhktsvhazeljnncncr.supabase.co"
    private let callbackScheme = "quartzmonitor"
    private let callbackURL = "quartzmonitor://auth-callback"

    private init() {
        checkExistingSession()
    }

    private func checkExistingSession() {
        let hasAPIKey = keychainService.getAPIKey() != nil
        let hasAccessToken = keychainService.getAccessToken() != nil

        print("=== Auth Check ===")
        print("Has API Key: \(hasAPIKey)")
        print("Has Access Token: \(hasAccessToken)")
        print("==================")

        // Only authenticate if we have an API key
        if hasAPIKey {
            isAuthenticated = true
            Task {
                await loadCurrentUser()
            }
        }
    }

    // Debug: Force clear all credentials
    func forceClearCredentials() {
        print("Force clearing all credentials")
        keychainService.clearAll()
        isAuthenticated = false
        currentUser = nil
    }

    // MARK: - API Key Authentication (Direct - bypasses SSO)

    func signIn(apiKey: String) async throws {
        isLoading = true
        error = nil

        defer { isLoading = false }

        keychainService.storeAPIKey(apiKey)

        do {
            let user: User = try await apiClient.request(.me)
            currentUser = user
            isAuthenticated = true

            // Request push notification permissions after successful login
            await requestPushNotificationPermissions()
        } catch {
            keychainService.clearAll()
            self.error = error
            throw error
        }
    }

    // MARK: - OAuth (Azure SSO) + Auto API Key

    func signInWithAzure() async throws {
        isLoading = true
        error = nil

        // Build the OAuth URL
        var components = URLComponents(string: "\(supabaseURL)/auth/v1/authorize")!
        components.queryItems = [
            URLQueryItem(name: "provider", value: "azure"),
            URLQueryItem(name: "redirect_to", value: callbackURL),
            URLQueryItem(name: "scopes", value: "email openid profile")
        ]

        guard let authURL = components.url else {
            isLoading = false
            throw AuthError.invalidCallback
        }

        print("Starting OAuth with URL: \(authURL.absoluteString)")

        // Use ASWebAuthenticationSession for secure OAuth flow
        do {
            let callbackURL = try await performWebAuthentication(url: authURL)
            try await handleOAuthCallback(url: callbackURL)
        } catch {
            isLoading = false
            self.error = error
            throw error
        }

        isLoading = false
    }

    private func performWebAuthentication(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error {
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        continuation.resume(throwing: AuthError.userCancelled)
                    } else {
                        continuation.resume(throwing: error)
                    }
                    return
                }

                guard let callbackURL = callbackURL else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                continuation.resume(returning: callbackURL)
            }

            session.presentationContextProvider = WebAuthContextProvider.shared
            session.prefersEphemeralWebBrowserSession = true  // Don't use cached SSO session

            DispatchQueue.main.async {
                session.start()
            }
        }
    }

    func handleOAuthCallback(url: URL) async throws {
        print("OAuth callback received: \(url.absoluteString)")

        // Parse the callback URL - tokens can be in fragment or query
        var tokenString = url.fragment ?? ""
        if tokenString.isEmpty {
            tokenString = url.query ?? ""
        }

        // Parse the token string into key-value pairs
        let params = tokenString.split(separator: "&").reduce(into: [String: String]()) { result, pair in
            let parts = pair.split(separator: "=", maxSplits: 1)
            if parts.count == 2 {
                let key = String(parts[0])
                let value = String(parts[1]).removingPercentEncoding ?? String(parts[1])
                result[key] = value
            }
        }

        // Check for errors first
        if let errorDescription = params["error_description"] {
            throw AuthError.oauthFailed(errorDescription)
        } else if let error = params["error"] {
            throw AuthError.oauthFailed(error)
        }

        // Extract tokens from callback URL
        if params["access_token"] != nil {
            // SSO succeeded - store the default API key for API access
            keychainService.storeAPIKey(defaultAPIKey)
            isAuthenticated = true
            await loadCurrentUser()

            // Request push notification permissions after successful login
            await requestPushNotificationPermissions()
        } else {
            throw AuthError.invalidCallback
        }
    }

    // MARK: - Push Notifications

    private func requestPushNotificationPermissions() async {
        let pushService = PushNotificationService.shared
        let granted = await pushService.requestAuthorization()
        if granted {
            print("Push notification permissions granted")
        } else {
            print("Push notification permissions denied or not determined")
        }
    }

    // MARK: - User Management

    private func loadCurrentUser() async {
        do {
            // /me endpoint returns API key info, not user info
            let keyInfo: APIKeyInfo = try await apiClient.request(.me)
            currentUser = User.fromAPIKeyInfo(keyInfo)
            print("Loaded user from API key: \(keyInfo.keyName)")

            // Start loading cost data in background for faster UI
            startBackgroundCostCaching()
        } catch {
            print("Failed to load current user: \(error)")
            // Still allow usage even if /me fails
        }
    }

    /// Start loading cost data in the background for faster UI response
    private func startBackgroundCostCaching() {
        // Calculate default date range (last 30 days)
        let toDate = Date()
        let fromDate = Calendar.current.date(byAdding: .day, value: -29, to: toDate)!

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        CostDataCache.shared.startBackgroundLoad(
            tenantId: nil,
            dateFrom: formatter.string(from: fromDate),
            dateTo: formatter.string(from: toDate)
        )
        print("Started background cost data caching")
    }

    // MARK: - Sign Out

    func signOut() async {
        print("Signing out - clearing all credentials")
        keychainService.clearAll()
        isAuthenticated = false
        currentUser = nil
        print("Sign out complete - isAuthenticated: \(isAuthenticated)")
    }

    // MARK: - Biometrics

    func authenticateWithBiometrics() async -> Bool {
        guard keychainService.getAPIKey() != nil else {
            return false
        }

        let success = await biometricService.authenticate()
        if success {
            isAuthenticated = true
        }
        return success
    }
}

// MARK: - Web Authentication Context Provider

class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthContextProvider()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case invalidCallback
    case oauthFailed(String)
    case invalidCredentials
    case userCancelled

    var errorDescription: String? {
        switch self {
        case .invalidCallback:
            return "Invalid authentication callback"
        case .oauthFailed(let message):
            return "Authentication failed: \(message)"
        case .invalidCredentials:
            return "Invalid credentials"
        case .userCancelled:
            return "Sign in was cancelled"
        }
    }
}
