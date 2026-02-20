import Foundation
import Combine

class DeepLinkHandler: ObservableObject {
    enum DeepLink: Equatable {
        case resource(id: UUID)
        case alert(id: UUID)
        case client(id: UUID)
        case incident(id: UUID)
        case authCallback(url: URL)

        static func == (lhs: DeepLink, rhs: DeepLink) -> Bool {
            switch (lhs, rhs) {
            case (.resource(let lhsId), .resource(let rhsId)):
                return lhsId == rhsId
            case (.alert(let lhsId), .alert(let rhsId)):
                return lhsId == rhsId
            case (.client(let lhsId), .client(let rhsId)):
                return lhsId == rhsId
            case (.incident(let lhsId), .incident(let rhsId)):
                return lhsId == rhsId
            case (.authCallback(let lhsUrl), .authCallback(let rhsUrl)):
                return lhsUrl == rhsUrl
            default:
                return false
            }
        }
    }

    @Published var pendingDeepLink: DeepLink?

    func handle(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return
        }

        // Handle OAuth callback
        if url.scheme == "quartzmonitor" && url.host == "auth-callback" {
            pendingDeepLink = .authCallback(url: url)
            return
        }

        // Handle other deep links
        guard let host = components.host else { return }

        switch host {
        case "resource":
            if let idString = components.queryItems?.first(where: { $0.name == "id" })?.value,
               let id = UUID(uuidString: idString) {
                pendingDeepLink = .resource(id: id)
            }
        case "alert":
            if let idString = components.queryItems?.first(where: { $0.name == "id" })?.value,
               let id = UUID(uuidString: idString) {
                pendingDeepLink = .alert(id: id)
            }
        case "client":
            if let idString = components.queryItems?.first(where: { $0.name == "id" })?.value,
               let id = UUID(uuidString: idString) {
                pendingDeepLink = .client(id: id)
            }
        case "incident":
            if let idString = components.queryItems?.first(where: { $0.name == "id" })?.value,
               let id = UUID(uuidString: idString) {
                pendingDeepLink = .incident(id: id)
            }
        default:
            break
        }
    }

    func clearPendingDeepLink() {
        pendingDeepLink = nil
    }
}
