# Quartz Azure Monitor iOS App - Agent Instructions

**Project:** azuremonitor
**Platform:** iOS (SwiftUI)
**Version:** 1.0.0

---

## PROJECT LOCATION

**CRITICAL:** Use the existing Xcode project. Do NOT create a new project.

- **Project Root:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/`
- **Source Files:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`
- **Xcode Project:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor.xcodeproj`

---

## Overview

You are building a native iOS application for the Quartz Azure Monitor system. This app provides feature parity with the existing web application, allowing DevOps teams to monitor infrastructure, track Azure costs, manage alerts, and respond to incidents from their iOS devices.

---

## Project Structure

Add the following folders and files inside the existing project at `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`:

```
azuremonitor/azuremonitor/
├── azuremonitorApp.swift          # App entry point (existing - update)
├── ContentView.swift               # Will be replaced
├── Core/
│   ├── Design/
│   │   ├── Colors.swift
│   │   ├── Typography.swift
│   │   ├── Spacing.swift
│   │   └── Animation.swift
│   ├── Extensions/
│   │   ├── Date+Extensions.swift
│   │   ├── String+Extensions.swift
│   │   └── View+Extensions.swift
│   └── Utilities/
│       ├── Logger.swift
│       └── Haptics.swift
├── Services/
│   ├── Networking/
│   │   ├── APIClient.swift
│   │   ├── APIEndpoint.swift
│   │   ├── APIError.swift
│   │   └── APIResponse.swift
│   ├── Auth/
│   │   ├── AuthService.swift
│   │   ├── KeychainService.swift
│   │   └── BiometricService.swift
│   ├── Realtime/
│   │   └── RealtimeService.swift
│   └── Push/
│       └── PushNotificationService.swift
│   │
│   ├── Core/
│   │   ├── Design/
│   │   │   ├── Colors.swift
│   │   │   ├── Typography.swift
│   │   │   ├── Spacing.swift
│   │   │   └── Animation.swift
│   │   │
│   │   ├── Extensions/
│   │   │   ├── Date+Extensions.swift
│   │   │   ├── String+Extensions.swift
│   │   │   └── View+Extensions.swift
│   │   │
│   │   └── Utilities/
│   │       ├── Logger.swift
│   │       └── Haptics.swift
│   │
│   ├── Services/
│   │   ├── Networking/
│   │   │   ├── APIClient.swift             # Base HTTP client
│   │   │   ├── APIEndpoint.swift           # Endpoint definitions
│   │   │   ├── APIError.swift              # Error types
│   │   │   └── APIResponse.swift           # Response wrapper
│   │   │
│   │   ├── Auth/
│   │   │   ├── AuthService.swift           # Supabase Auth + Azure SSO
│   │   │   ├── KeychainService.swift       # Secure storage
│   │   │   └── BiometricService.swift      # Face ID/Touch ID
│   │   │
│   │   ├── Realtime/
│   │   │   └── RealtimeService.swift       # Supabase realtime subscriptions
│   │   │
│   │   └── Push/
│   │       └── PushNotificationService.swift
│   │
│   ├── Repositories/
│   │   ├── DashboardRepository.swift
│   │   ├── ClientRepository.swift
│   │   ├── ResourceRepository.swift
│   │   ├── AlertRepository.swift
│   │   ├── IncidentRepository.swift
│   │   └── AzureRepository.swift
│   │
│   ├── Models/
│   │   ├── Client.swift
│   │   ├── Environment.swift
│   │   ├── Resource.swift
│   │   ├── Alert.swift
│   │   ├── AlertRule.swift
│   │   ├── Incident.swift
│   │   ├── MonitoringCheck.swift
│   │   ├── CheckResult.swift
│   │   ├── DashboardSummary.swift
│   │   ├── AzureTenant.swift
│   │   ├── AzureResource.swift
│   │   ├── AzureCostData.swift
│   │   └── User.swift
│   │
│   ├── ViewModels/
│   │   ├── Auth/
│   │   │   └── LoginViewModel.swift
│   │   ├── Dashboard/
│   │   │   └── DashboardViewModel.swift
│   │   ├── Resources/
│   │   │   ├── ResourcesListViewModel.swift
│   │   │   └── ResourceDetailViewModel.swift
│   │   ├── Alerts/
│   │   │   ├── AlertsListViewModel.swift
│   │   │   └── AlertDetailViewModel.swift
│   │   ├── Clients/
│   │   │   ├── ClientsListViewModel.swift
│   │   │   └── ClientDetailViewModel.swift
│   │   ├── Incidents/
│   │   │   ├── IncidentsListViewModel.swift
│   │   │   └── IncidentDetailViewModel.swift
│   │   ├── Azure/
│   │   │   ├── AzureOverviewViewModel.swift
│   │   │   ├── AzureCostReportViewModel.swift
│   │   │   └── AzureResourceDetailViewModel.swift
│   │   └── Settings/
│   │       └── SettingsViewModel.swift
│   │
│   ├── Views/
│   │   ├── Auth/
│   │   │   └── LoginView.swift
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift
│   │   │   ├── StatisticsCardsView.swift
│   │   │   ├── ResourceHealthChart.swift
│   │   │   ├── PerformanceTrendChart.swift
│   │   │   └── RecentChecksListView.swift
│   │   │
│   │   ├── Resources/
│   │   │   ├── ResourcesListView.swift
│   │   │   ├── ResourceDetailView.swift
│   │   │   ├── ResourceRow.swift
│   │   │   ├── ResourceStatusHero.swift
│   │   │   └── ResponseTimeChart.swift
│   │   │
│   │   ├── Alerts/
│   │   │   ├── AlertsListView.swift
│   │   │   ├── AlertDetailView.swift
│   │   │   ├── AlertRow.swift
│   │   │   └── AlertRulesListView.swift
│   │   │
│   │   ├── Clients/
│   │   │   ├── ClientsListView.swift
│   │   │   ├── ClientDetailView.swift
│   │   │   └── ClientRow.swift
│   │   │
│   │   ├── Incidents/
│   │   │   ├── IncidentsListView.swift
│   │   │   ├── IncidentDetailView.swift
│   │   │   └── IncidentRow.swift
│   │   │
│   │   ├── Azure/
│   │   │   ├── AzureOverviewView.swift
│   │   │   ├── AzureCostReportView.swift
│   │   │   ├── AzureHealthIssuesView.swift
│   │   │   ├── AzureResourceDetailView.swift
│   │   │   └── CostTrendChart.swift
│   │   │
│   │   ├── Settings/
│   │   │   └── SettingsView.swift
│   │   │
│   │   └── More/
│   │       └── MoreMenuView.swift
│   │
│   ├── Components/
│   │   ├── Common/
│   │   │   ├── StatusIndicator.swift
│   │   │   ├── SeverityBadge.swift
│   │   │   ├── StatusBadge.swift
│   │   │   ├── StatCard.swift
│   │   │   ├── SearchBar.swift
│   │   │   ├── FilterChip.swift
│   │   │   ├── EmptyStateView.swift
│   │   │   ├── LoadingView.swift
│   │   │   ├── ErrorView.swift
│   │   │   └── RefreshableScrollView.swift
│   │   │
│   │   ├── Forms/
│   │   │   ├── QuartzTextField.swift
│   │   │   ├── PrimaryButton.swift
│   │   │   └── SecondaryButton.swift
│   │   │
│   │   └── Charts/
│   │       ├── LineChartView.swift
│   │       ├── PieChartView.swift
│   │       └── BarChartView.swift
│   │
│   ├── Navigation/
│   │   ├── MainTabView.swift
│   │   ├── AppRouter.swift
│   │   └── DeepLinkHandler.swift
│   │
│   └── Resources/
│       ├── Assets.xcassets/
│       ├── Localizable.strings
│       └── Info.plist
│
├── QuartzMobileTests/
│   ├── ViewModelTests/
│   ├── RepositoryTests/
│   └── ServiceTests/
│
└── QuartzMobileUITests/
    └── UITests/
```

---

## Development Order

Build the app in this specific order:

### Phase 1: Foundation

1. **Project Setup**
   - Create Xcode project with SwiftUI App lifecycle
   - Configure iOS 17.0 minimum deployment
   - Add Swift Package dependencies (supabase-swift, KeychainAccess, Charts)
   - Setup Asset Catalog with colors from UI_DESIGN_GUIDELINES.md

2. **Core Design System**
   - Implement Colors.swift, Typography.swift, Spacing.swift
   - Create all common UI components (StatusIndicator, SeverityBadge, etc.)
   - Verify components support Dynamic Type and dark mode

3. **Networking Layer**
   - Implement APIClient with base URL configuration
   - Create APIEndpoint enum with all endpoints from PRD.json
   - Implement APIResponse wrapper matching API response format
   - Add auth interceptor for X-API-Key header injection

4. **Authentication**
   - Implement AuthService with Supabase client
   - Configure Azure SSO via Supabase OAuth
   - Implement KeychainService for secure credential storage
   - Implement BiometricService for Face ID/Touch ID
   - Create LoginView and LoginViewModel

### Phase 2: Core Features

5. **Dashboard**
   - Implement DashboardRepository
   - Create DashboardViewModel with @Published properties
   - Build DashboardView with stat cards
   - Add ResourceHealthChart (pie chart)
   - Add PerformanceTrendChart (line chart)
   - Add RecentChecksListView
   - Implement pull-to-refresh
   - Setup realtime subscriptions for live updates

6. **Resources**
   - Implement ResourceRepository with CRUD + filtering
   - Create ResourcesListViewModel with search and filter state
   - Build ResourcesListView with search bar and filter chips
   - Create ResourceRow component
   - Build ResourceDetailView with status hero
   - Add ResponseTimeChart
   - Add uptime statistics grid
   - Add check results list

7. **Alerts**
   - Implement AlertRepository with acknowledge/resolve
   - Create AlertsListViewModel with tab state
   - Build AlertsListView with tabbed interface
   - Create AlertRow with swipe actions
   - Build AlertDetailView
   - Implement alert filtering
   - Add haptic feedback for acknowledge/resolve

### Phase 3: Extended Features

8. **Clients**
   - Implement ClientRepository
   - Create ClientsListViewModel
   - Build ClientsListView with search
   - Build ClientDetailView with environment list

9. **Incidents**
   - Implement IncidentRepository
   - Create IncidentsListViewModel
   - Build IncidentsListView
   - Build IncidentDetailView

10. **Azure Monitoring**
    - Implement AzureRepository
    - Create AzureOverviewViewModel
    - Build AzureOverviewView with cost summary
    - Build AzureCostReportView with filters and charts
    - Build AzureHealthIssuesView
    - Implement CSV export via share sheet

### Phase 4: Polish

11. **Navigation**
    - Implement MainTabView with 5 tabs
    - Setup NavigationStack for each tab
    - Implement DeepLinkHandler for notification tap handling
    - Add badge count on Alerts tab

12. **Push Notifications**
    - Configure APNs entitlement
    - Implement PushNotificationService
    - Register device token with backend
    - Handle notification categories
    - Implement deep linking from notifications

13. **Settings**
    - Build SettingsView
    - Add notification preferences
    - Add theme selection
    - Add biometric toggle
    - Add sign out

14. **Testing & Polish**
    - Write unit tests for ViewModels (80% coverage)
    - Write unit tests for Repositories (80% coverage)
    - Write UI tests for critical flows
    - Performance optimization
    - Accessibility audit

---

## Key Implementation Details

### Authentication with Azure SSO

The app must use Azure SSO through Supabase Auth. Here's the implementation pattern:

```swift
// AuthService.swift
import Supabase

class AuthService: ObservableObject {
    private let supabase: SupabaseClient

    init() {
        self.supabase = SupabaseClient(
            supabaseURL: URL(string: "https://zkqhktsvhazeljnncncr.supabase.co")!,
            supabaseKey: "YOUR_ANON_KEY"
        )
    }

    // Azure SSO Sign In
    func signInWithAzure() async throws {
        try await supabase.auth.signInWithOAuth(
            provider: .azure,
            redirectTo: URL(string: "quartzmonitor://auth-callback")
        )
    }

    // Email/Password Sign In
    func signIn(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
    }

    // Handle OAuth callback
    func handleOAuthCallback(url: URL) async throws {
        try await supabase.auth.session(from: url)
    }

    // Get current session
    var currentSession: Session? {
        supabase.auth.currentSession
    }

    // Sign out
    func signOut() async throws {
        try await supabase.auth.signOut()
    }
}
```

### URL Scheme Configuration

Add to Info.plist for OAuth callback:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>quartzmonitor</string>
        </array>
    </dict>
</array>
```

### API Client Pattern

```swift
// APIClient.swift
class APIClient {
    private let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
    private let session: URLSession
    private let keychainService: KeychainService

    func request<T: Codable>(_ endpoint: APIEndpoint) async throws -> T {
        var request = URLRequest(url: endpoint.url(baseURL: baseURL))
        request.httpMethod = endpoint.method.rawValue

        // Add API key from keychain
        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = endpoint.body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorResponse = try? JSONDecoder().decode(APIResponse<EmptyResponse>.self, from: data)
            throw APIError.serverError(
                code: errorResponse?.error?.code ?? "UNKNOWN",
                message: errorResponse?.error?.message ?? "Unknown error"
            )
        }

        let apiResponse = try JSONDecoder().decode(APIResponse<T>.self, from: data)

        guard apiResponse.success, let data = apiResponse.data else {
            throw APIError.dataNotFound
        }

        return data
    }
}
```

### ViewModel Pattern

```swift
// ResourcesListViewModel.swift
@MainActor
class ResourcesListViewModel: ObservableObject {
    @Published var resources: [Resource] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var searchText = ""
    @Published var selectedStatus: ResourceStatus?

    private let repository: ResourceRepository

    init(repository: ResourceRepository = ResourceRepository()) {
        self.repository = repository
    }

    var filteredResources: [Resource] {
        resources.filter { resource in
            let matchesSearch = searchText.isEmpty ||
                resource.name.localizedCaseInsensitiveContains(searchText)
            let matchesStatus = selectedStatus == nil ||
                resource.status == selectedStatus
            return matchesSearch && matchesStatus
        }
    }

    func loadResources() async {
        isLoading = true
        error = nil

        do {
            resources = try await repository.fetchResources()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

### Realtime Subscriptions

```swift
// RealtimeService.swift
class RealtimeService {
    private let supabase: SupabaseClient
    private var channel: RealtimeChannel?

    func subscribeToAlerts(onUpdate: @escaping () -> Void) {
        channel = supabase.channel("alerts-changes")
            .on("postgres_changes", table: "alerts") { payload in
                onUpdate()
            }
            .subscribe()
    }

    func unsubscribe() {
        channel?.unsubscribe()
    }
}
```

---

## Coding Standards

### Swift Style

- Use Swift 6.0 strict concurrency
- Prefer async/await over completion handlers
- Use @MainActor for all ViewModels
- Use @Published for observable state
- Use private(set) for read-only properties
- Use guard for early returns
- Use meaningful variable names

### SwiftUI Best Practices

- Extract subviews when body exceeds 30 lines
- Use @ViewBuilder for conditional content
- Prefer composition over inheritance
- Use .task {} for async loading on appear
- Use .refreshable {} for pull-to-refresh
- Always provide loading, error, and empty states

### Error Handling

- Use typed errors (APIError enum)
- Display user-friendly error messages
- Provide retry actions where appropriate
- Log errors for debugging (use os.log)

### Testing

- Test ViewModels with mock repositories
- Test Repositories with mock API client
- Use XCTest for unit tests
- Use XCUITest for UI tests

---

## Common Patterns

### List View Pattern

```swift
struct ResourcesListView: View {
    @StateObject private var viewModel = ResourcesListViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.resources.isEmpty {
                    LoadingView(message: "Loading resources...")
                } else if let error = viewModel.error {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadResources() } })
                } else if viewModel.filteredResources.isEmpty {
                    EmptyStateView(
                        icon: "server.rack",
                        title: "No Resources",
                        message: "No resources match your filters"
                    )
                } else {
                    List(viewModel.filteredResources) { resource in
                        NavigationLink(value: resource) {
                            ResourceRow(resource: resource)
                        }
                    }
                    .refreshable {
                        await viewModel.loadResources()
                    }
                }
            }
            .navigationTitle("Resources")
            .searchable(text: $viewModel.searchText)
            .task {
                await viewModel.loadResources()
            }
            .navigationDestination(for: Resource.self) { resource in
                ResourceDetailView(resource: resource)
            }
        }
    }
}
```

### Detail View Pattern

```swift
struct ResourceDetailView: View {
    let resource: Resource
    @StateObject private var viewModel: ResourceDetailViewModel

    init(resource: Resource) {
        self.resource = resource
        _viewModel = StateObject(wrappedValue: ResourceDetailViewModel(resourceId: resource.id))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                ResourceStatusHero(status: viewModel.status)

                // Metadata section
                // Chart section
                // Details section
            }
            .padding(Spacing.lg)
        }
        .navigationTitle(resource.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadDetails()
        }
        .refreshable {
            await viewModel.loadDetails()
        }
    }
}
```

---

## Reference Documents

- **PRD.md** - Full product requirements
- **PRD.json** - Structured requirements for parsing
- **UI_DESIGN_GUIDELINES.md** - Visual design specifications
- **learnings.md** - Technical context and insights
- **API_DOCUMENTATION.md** - API endpoint reference

---

## Quality Checklist

Before considering any feature complete:

- [ ] Follows MVVM architecture
- [ ] Uses design system colors and typography
- [ ] Supports Dynamic Type
- [ ] Supports dark mode
- [ ] Has VoiceOver accessibility labels
- [ ] Has loading state
- [ ] Has error state with retry
- [ ] Has empty state (if applicable)
- [ ] Has pull-to-refresh (if list)
- [ ] Uses appropriate haptic feedback
- [ ] Unit tests written (80% coverage target)
- [ ] No force unwraps
- [ ] No memory leaks (check with Instruments)
- [ ] Animations at 60 FPS

---

## Important Notes

1. **Azure SSO is Required** - The primary authentication method must be Azure SSO via Supabase OAuth. Email/password is a fallback.

2. **API Key Management** - Store the API key securely in Keychain after successful authentication. Never hardcode.

3. **Offline Awareness** - Always check network status and display appropriate UI when offline.

4. **Performance** - Target sub-2-second load times. Use lazy loading and pagination.

5. **Real-time Priority** - Dashboard and Alerts screens must update in real-time via WebSocket subscriptions.

6. **Detail Pages for Clickable Items** - When creating any list view, row component, or navigation link:
   - Always consider whether clicking the item should navigate to a detail view
   - If a detail view doesn't exist, create it with comprehensive information about the item
   - Every tappable list item should have a corresponding detail screen
   - Detail screens should include: header with key info, metadata sections, related data, and actions where applicable
   - Use NavigationLink to wrap row components for drill-down navigation
