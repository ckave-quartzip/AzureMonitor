import Foundation
import Security

class KeychainService {
    private let service = "com.quartz.monitor"

    private enum Keys {
        static let apiKey = "api_key"
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
    }

    // MARK: - API Key

    func storeAPIKey(_ key: String) {
        save(key: Keys.apiKey, value: key)
    }

    func getAPIKey() -> String? {
        retrieve(key: Keys.apiKey)
    }

    func deleteAPIKey() {
        delete(key: Keys.apiKey)
    }

    // MARK: - Tokens

    func storeTokens(access: String, refresh: String) {
        save(key: Keys.accessToken, value: access)
        save(key: Keys.refreshToken, value: refresh)
    }

    func getAccessToken() -> String? {
        retrieve(key: Keys.accessToken)
    }

    func getRefreshToken() -> String? {
        retrieve(key: Keys.refreshToken)
    }

    // MARK: - Clear

    func clearAll() {
        delete(key: Keys.apiKey)
        delete(key: Keys.accessToken)
        delete(key: Keys.refreshToken)
    }

    // MARK: - Private Helpers

    private func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        // Delete existing item first
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    private func retrieve(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            return nil
        }

        return string
    }

    private func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
