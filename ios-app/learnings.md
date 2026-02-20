# Quartz Azure Monitor - Technical Learnings & Context

**Project:** QuartzMobile
**Last Updated:** January 2026

This document captures technical insights, patterns, and context derived from analyzing the existing web application to guide iOS development.

---

## Web Application Architecture Summary

The existing Quartz IP Dev Ops Monitoring System is built with:

- **Frontend:** React 18.3.1 + TypeScript 5.8.3 + Vite
- **UI Library:** shadcn/ui (Radix UI components) + Tailwind CSS
- **State Management:** TanStack React Query + React Hook Form + Zustand
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Charting:** Recharts

---

## Key Learnings from Web Codebase

### 1. Authentication Flow

**Web Implementation:**
```typescript
// Web uses Supabase Auth with two methods:
// 1. Email/Password
await supabase.auth.signInWithPassword({ email, password })

// 2. Azure OAuth (Microsoft SSO)
await supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    scopes: 'email openid profile'
  }
})
```

**iOS Translation:**
- Use `supabase-swift` package for authentication
- Azure SSO uses OAuth 2.0 PKCE flow
- Handle OAuth callback via custom URL scheme
- Store session in Keychain, not UserDefaults

**Gotcha:** The web app uses `signInWithOAuth` which opens in the same window. iOS needs to handle this via `ASWebAuthenticationSession` or Supabase's built-in OAuth handling.

### 2. Role-Based Access Control

**Web Implementation:**
```typescript
// Roles: admin, editor, viewer
type AppRole = 'admin' | 'editor' | 'viewer';

// Fetched after auth from user_roles table
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

// Permission checks
const isAdmin = roles.includes('admin');
const isEditor = roles.includes('editor');
const hasWriteAccess = isAdmin || isEditor;
```

**iOS Translation:**
- Fetch roles after successful authentication
- Store roles in AuthService as @Published property
- Use @Environment or @EnvironmentObject to propagate
- Conditionally show/hide UI based on roles

### 3. Real-time Subscriptions

**Web Implementation:**
```typescript
// Dashboard subscribes to changes
useEffect(() => {
  const channel = supabase
    .channel('resource-updates')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'check_results' },
      () => refetchDashboard()
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'alerts' },
      () => refetchAlerts()
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

**iOS Translation:**
```swift
// Use Supabase Realtime in Swift
let channel = supabase.channel("resource-updates")
    .on("postgres_changes", table: "check_results") { payload in
        Task { await viewModel.refresh() }
    }
    .on("postgres_changes", table: "alerts") { payload in
        Task { await viewModel.refreshAlerts() }
    }
    .subscribe()
```

**Gotcha:** Realtime subscriptions should be lifecycle-aware. Subscribe in `.onAppear`, unsubscribe in `.onDisappear`.

### 4. Data Fetching Patterns

**Web Implementation (React Query):**
```typescript
// useResources hook
export function useResources(filters?: ResourceFilters) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: async () => {
      let query = supabase.from('resources').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}
```

**iOS Translation:**
```swift
// ResourceRepository
class ResourceRepository {
    private let supabase: SupabaseClient

    func fetchResources(status: ResourceStatus? = nil, clientId: UUID? = nil) async throws -> [Resource] {
        var query = supabase.from("resources").select()

        if let status = status {
            query = query.eq("status", value: status.rawValue)
        }
        if let clientId = clientId {
            query = query.eq("client_id", value: clientId.uuidString)
        }

        return try await query.execute().value
    }
}
```

### 5. Dashboard Statistics Calculation

**Web Implementation:**
```typescript
// Dashboard summary from API
const dashboardData = {
  resources: {
    total: resources.length,
    up: resources.filter(r => r.status === 'up').length,
    down: resources.filter(r => r.status === 'down').length,
    degraded: resources.filter(r => r.status === 'degraded').length
  },
  alerts: {
    active: alerts.filter(a => a.status === 'active').length,
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    warning: alerts.filter(a => a.severity === 'warning' && a.status === 'active').length
  },
  uptime: {
    average: calculateAverageUptime(checkResults),
    period: '30d'
  }
};
```

**iOS Translation:**
- Use the `/dashboard/summary` API endpoint which returns pre-calculated stats
- Don't recalculate on client side - trust the server

### 6. Alert Acknowledge/Resolve Actions

**Web Implementation:**
```typescript
// Acknowledge alert
const acknowledgeAlert = useMutation({
  mutationFn: async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    toast({ title: 'Alert acknowledged' });
  }
});
```

**iOS Translation:**
```swift
// AlertRepository
func acknowledgeAlert(id: UUID) async throws {
    try await apiClient.request(
        APIEndpoint.acknowledgeAlert(id: id)
    )
    // ViewModel should refresh alert list after success
}

// In ViewModel
func acknowledge(alert: Alert) async {
    do {
        try await repository.acknowledgeAlert(id: alert.id)
        Haptics.success()
        await loadAlerts() // Refresh list
    } catch {
        self.error = error
        Haptics.error()
    }
}
```

### 7. Cost Data Structure

**Database Schema:**
```sql
azure_cost_data (
  id UUID,
  tenant_id UUID,
  resource_id TEXT,
  resource_group TEXT,
  period_date DATE,
  cost DECIMAL(12,4),
  currency TEXT,
  meter_category TEXT,
  meter_subcategory TEXT
)
```

**API Response Pattern:**
```json
{
  "totalCost": 15234.56,
  "currency": "USD",
  "period": { "from": "2024-01-01", "to": "2024-01-31" },
  "byTenant": [...],
  "byResourceGroup": [...],
  "dailyTrend": [...]
}
```

**iOS Translation:**
- Use `Decimal` type for currency values, not `Double`
- Format currency using `NumberFormatter` with locale
- Charts should handle potentially large datasets - consider aggregation

### 8. Resource Status Colors

**Web CSS (Tailwind classes):**
```css
up: "bg-green-500"      /* #22C55E */
down: "bg-red-500"      /* #EF4444 */
degraded: "bg-yellow-500" /* #F59E0B */
unknown: "bg-gray-500"   /* #6B7280 */
```

**iOS Translation:**
- Use Asset Catalog colors with light/dark variants
- Match exact hex values for brand consistency
- Consider color blindness - icons supplement colors

### 9. Date/Time Formatting

**Web Implementation:**
```typescript
// Using date-fns
import { formatDistanceToNow, format } from 'date-fns';

// "2 minutes ago"
formatDistanceToNow(date, { addSuffix: true })

// "Jan 15, 2024 10:30 AM"
format(date, 'MMM d, yyyy h:mm a')
```

**iOS Translation:**
```swift
// RelativeDateTimeFormatter for "2 minutes ago"
let formatter = RelativeDateTimeFormatter()
formatter.unitsStyle = .full
return formatter.localizedString(for: date, relativeTo: Date())

// DateFormatter for absolute dates
let formatter = DateFormatter()
formatter.dateStyle = .medium
formatter.timeStyle = .short
return formatter.string(from: date)
```

### 10. Pagination Pattern

**Web Implementation:**
```typescript
// Pagination state
const [page, setPage] = useState(0);
const limit = 50;

// Query with pagination
const { data } = await supabase
  .from('resources')
  .select('*', { count: 'exact' })
  .range(page * limit, (page + 1) * limit - 1);
```

**iOS Translation:**
- Use infinite scroll instead of traditional pagination
- Load more items when scrolling near bottom
- Track hasMore flag based on returned count vs limit

```swift
func loadMore() async {
    guard !isLoadingMore && hasMore else { return }
    isLoadingMore = true

    let newItems = try await repository.fetchResources(
        offset: resources.count,
        limit: pageSize
    )

    resources.append(contentsOf: newItems)
    hasMore = newItems.count == pageSize
    isLoadingMore = false
}
```

---

## API Considerations

### Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_abc123",
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

**iOS Model:**
```swift
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: APIErrorResponse?
    let meta: ResponseMeta?
}

struct ResponseMeta: Codable {
    let timestamp: Date
    let requestId: String
    let total: Int?
    let limit: Int?
    let offset: Int?

    enum CodingKeys: String, CodingKey {
        case timestamp
        case requestId = "request_id"
        case total, limit, offset
    }
}
```

### Error Handling

API errors include codes:
- `UNAUTHORIZED` - Invalid/missing API key
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Bad request parameters
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

**iOS Error Handling:**
```swift
enum APIError: LocalizedError {
    case unauthorized
    case forbidden
    case notFound(resource: String)
    case validationError(message: String)
    case rateLimited(retryAfter: Int?)
    case serverError(message: String)
    case networkError(underlying: Error)
    case decodingError(underlying: Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Please sign in to continue"
        case .forbidden:
            return "You don't have permission to perform this action"
        case .notFound(let resource):
            return "\(resource) not found"
        case .validationError(let message):
            return message
        case .rateLimited:
            return "Too many requests. Please wait a moment."
        case .serverError(let message):
            return message
        case .networkError:
            return "Network connection error. Please check your connection."
        case .decodingError:
            return "Error processing server response"
        }
    }
}
```

### Rate Limiting

- 1000 requests/hour per API key
- 100 requests/minute burst limit
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**iOS Handling:**
- Track rate limit from response headers
- Show warning when approaching limit
- Implement exponential backoff on 429 responses

---

## UI Component Mapping

| Web Component | iOS Equivalent |
|---------------|----------------|
| `<Card>` (shadcn) | Custom `CardView` with background |
| `<Badge>` | Custom `BadgeView` with capsule shape |
| `<Table>` | `List` with custom row views |
| `<Tabs>` | `TabView` or `Picker` with segmented style |
| `<Dialog>` | `.sheet()` or `.fullScreenCover()` |
| `<Popover>` | `.popover()` modifier |
| `<Toast>` (sonner) | Custom toast with overlay |
| `<Button>` | `Button` with custom styles |
| `<Input>` | `TextField` with custom styling |
| `<Select>` | `Picker` or custom dropdown |
| `<Switch>` | `Toggle` |
| `<Checkbox>` | `Toggle` with checkbox style |

---

## Chart Migration

### Web (Recharts) to iOS (Swift Charts / DGCharts)

**Response Time Line Chart:**
```typescript
// Web
<LineChart data={checkResults}>
  <XAxis dataKey="checked_at" />
  <YAxis />
  <Line type="monotone" dataKey="response_time_ms" stroke="#6366F1" />
</LineChart>
```

```swift
// iOS with Swift Charts
Chart(checkResults) { result in
    LineMark(
        x: .value("Time", result.checkedAt),
        y: .value("Response Time", result.responseTimeMs)
    )
    .foregroundStyle(Color.brandPrimary)
}
.chartXAxis {
    AxisMarks(values: .automatic) { value in
        AxisValueLabel(format: .dateTime.hour().minute())
    }
}
```

**Resource Health Pie Chart:**
```typescript
// Web
<PieChart>
  <Pie data={[
    { name: 'Up', value: 42, fill: '#22C55E' },
    { name: 'Down', value: 2, fill: '#EF4444' },
    { name: 'Degraded', value: 1, fill: '#F59E0B' }
  ]} />
</PieChart>
```

```swift
// iOS with Swift Charts
Chart(resourceStats) { stat in
    SectorMark(
        angle: .value("Count", stat.count),
        innerRadius: .ratio(0.5),
        angularInset: 1
    )
    .foregroundStyle(stat.status.color)
}
```

---

## Performance Insights

### Web Performance Patterns

1. **React Query Caching:** Queries cached for 5 minutes by default
2. **Optimistic Updates:** UI updates before server confirms
3. **Lazy Loading:** Routes code-split, components loaded on demand
4. **Real-time Debouncing:** Status updates debounced to prevent flicker

### iOS Performance Recommendations

1. **Use @StateObject wisely:** Create ViewModels at top level, pass down
2. **Implement caching:** Cache API responses in memory and/or Core Data
3. **Lazy load images:** Use `AsyncImage` with placeholder
4. **Pagination:** Load 50 items at a time, infinite scroll
5. **Background refresh:** Use BGAppRefreshTask for silent updates

---

## Data Relationships

```
clients (1) ──────── (n) environments (1) ──────── (n) resources
                              │
                              └── (fk) azure_tenant_id

resources (1) ──────── (n) monitoring_checks (1) ──────── (n) check_results

resources (1) ──────── (n) alerts

alerts (n) ──────── (n) incidents (via incident_alerts junction)

azure_tenants (1) ──────── (n) azure_resources
azure_resources (1) ──────── (n) azure_cost_data
azure_resources (1) ──────── (n) azure_metrics
```

---

## Common Edge Cases

1. **Resource with no checks:** Show "No monitoring configured" state
2. **Client with no environments:** Show "Add environment" CTA
3. **Alert without resource:** Alert can exist without linked resource
4. **Azure resource not linked:** Show as standalone in Azure views
5. **Cost data gaps:** Handle missing days gracefully in charts
6. **Timezone handling:** All dates stored as UTC, display in local timezone

---

## Security Considerations

1. **API Key Storage:** Use Keychain, never UserDefaults
2. **Session Token:** Refresh before expiry (Supabase handles this)
3. **Sensitive Data Logging:** Never log API keys, tokens, or secrets
4. **Network Security:** All traffic over HTTPS (TLS 1.3)
5. **Biometric:** Use LocalAuthentication framework properly
6. **Certificate Pinning:** Consider for production (optional)

---

## Testing Insights

### Web Test Patterns

```typescript
// ViewModel testing pattern
describe('ResourcesListViewModel', () => {
  it('should load resources on init', async () => {
    const mockRepo = { fetchResources: jest.fn().mockResolvedValue([...]) };
    const vm = new ResourcesListViewModel(mockRepo);
    await vm.loadResources();
    expect(mockRepo.fetchResources).toHaveBeenCalled();
    expect(vm.resources).toHaveLength(3);
  });
});
```

### iOS Test Equivalents

```swift
// XCTest equivalent
class ResourcesListViewModelTests: XCTestCase {
    func testLoadResources() async {
        let mockRepo = MockResourceRepository()
        mockRepo.mockResources = [Resource.mock(), Resource.mock()]

        let vm = ResourcesListViewModel(repository: mockRepo)
        await vm.loadResources()

        XCTAssertEqual(vm.resources.count, 2)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.error)
    }
}
```

---

## Offline Considerations

### Web Behavior
- No explicit offline support
- Shows error when network unavailable
- Real-time subscriptions reconnect automatically

### iOS Recommendations
- Cache last-known dashboard state
- Show stale data with "Last updated: X" indicator
- Queue write operations (acknowledge, resolve) for sync
- Use `NWPathMonitor` for network status

---

## Push Notification Categories

Based on web alert/incident system:

| Category | Title Format | Body Format | Actions |
|----------|--------------|-------------|---------|
| CRITICAL_ALERT | "Critical: {resource}" | "{alert_message}" | Acknowledge, View |
| WARNING_ALERT | "Warning: {resource}" | "{alert_message}" | Acknowledge, View |
| INCIDENT_UPDATE | "Incident: {title}" | "Status: {status}" | View |
| RESOURCE_DOWN | "{resource} is DOWN" | "Last check: {time}" | View |
| COST_ANOMALY | "Cost Spike: {tenant}" | "+{percent}% from yesterday" | View |

---

## Localization Notes

All user-facing strings should be localized. Key areas:

- Status labels ("Up", "Down", "Degraded", "Unknown")
- Severity labels ("Critical", "Warning", "Info")
- Time formatting (relative and absolute)
- Currency formatting
- Error messages
- Empty states
- Button labels

---

## Document References

- **PRD.md** - Full feature requirements
- **PRD.json** - Structured requirements
- **UI_DESIGN_GUIDELINES.md** - Visual design specifications
- **agent.md** - Development instructions
- **API_DOCUMENTATION.md** - API reference (in web repo)
- **AZURE_INTEGRATION.md** - Azure integration details (in web repo)
