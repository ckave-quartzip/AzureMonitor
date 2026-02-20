# Quartz Azure Monitor - iOS UI Design Guidelines

**Version:** 1.0.0
**Last Updated:** January 2026

---

## Design Philosophy

The Quartz Azure Monitor iOS app follows Apple's Human Interface Guidelines while maintaining the monitoring-focused identity of the web application. The design emphasizes:

1. **Clarity** - Status information must be immediately readable
2. **Efficiency** - One-tap access to critical actions
3. **Consistency** - Familiar patterns for DevOps professionals
4. **Accessibility** - Usable by all users in all conditions

---

## Color System

### Semantic Colors

Use semantic colors that adapt to light/dark mode automatically.

```swift
// Colors.swift
extension Color {
    // Status Colors
    static let statusUp = Color("StatusUp")           // Green: #22C55E
    static let statusDown = Color("StatusDown")       // Red: #EF4444
    static let statusDegraded = Color("StatusDegraded") // Yellow: #F59E0B
    static let statusUnknown = Color("StatusUnknown") // Gray: #6B7280

    // Severity Colors
    static let severityCritical = Color("SeverityCritical") // Red: #DC2626
    static let severityWarning = Color("SeverityWarning")   // Orange: #F97316
    static let severityInfo = Color("SeverityInfo")         // Blue: #3B82F6

    // Brand Colors
    static let brandPrimary = Color("BrandPrimary")   // #6366F1 (Indigo)
    static let brandSecondary = Color("BrandSecondary") // #8B5CF6 (Purple)

    // Background Colors (adaptive)
    static let backgroundPrimary = Color(uiColor: .systemBackground)
    static let backgroundSecondary = Color(uiColor: .secondarySystemBackground)
    static let backgroundTertiary = Color(uiColor: .tertiarySystemBackground)

    // Text Colors (adaptive)
    static let textPrimary = Color(uiColor: .label)
    static let textSecondary = Color(uiColor: .secondaryLabel)
    static let textTertiary = Color(uiColor: .tertiaryLabel)
}
```

### Asset Catalog Colors

Create these in `Assets.xcassets`:

| Color Name | Light Mode | Dark Mode |
|------------|------------|-----------|
| StatusUp | #22C55E | #4ADE80 |
| StatusDown | #EF4444 | #F87171 |
| StatusDegraded | #F59E0B | #FBBF24 |
| StatusUnknown | #6B7280 | #9CA3AF |
| SeverityCritical | #DC2626 | #F87171 |
| SeverityWarning | #F97316 | #FB923C |
| SeverityInfo | #3B82F6 | #60A5FA |
| BrandPrimary | #6366F1 | #818CF8 |
| BrandSecondary | #8B5CF6 | #A78BFA |

---

## Typography

### Font Scale

Use the system Dynamic Type scale for accessibility.

```swift
// Typography.swift
extension Font {
    // Headlines
    static let displayLarge = Font.system(.largeTitle, design: .default, weight: .bold)
    static let displayMedium = Font.system(.title, design: .default, weight: .semibold)
    static let displaySmall = Font.system(.title2, design: .default, weight: .semibold)

    // Body Text
    static let bodyLarge = Font.system(.body, design: .default, weight: .regular)
    static let bodyMedium = Font.system(.callout, design: .default, weight: .regular)
    static let bodySmall = Font.system(.footnote, design: .default, weight: .regular)

    // Labels
    static let labelLarge = Font.system(.subheadline, design: .default, weight: .medium)
    static let labelMedium = Font.system(.caption, design: .default, weight: .medium)
    static let labelSmall = Font.system(.caption2, design: .default, weight: .medium)

    // Monospace (for metrics, IDs, code)
    static let monoLarge = Font.system(.body, design: .monospaced, weight: .regular)
    static let monoMedium = Font.system(.footnote, design: .monospaced, weight: .regular)
    static let monoSmall = Font.system(.caption, design: .monospaced, weight: .regular)
}
```

### Usage Guidelines

| Context | Font Style | Example |
|---------|------------|---------|
| Screen titles | displayMedium | "Dashboard" |
| Section headers | displaySmall | "Recent Checks" |
| Card titles | labelLarge | "Production API" |
| Body text | bodyMedium | Alert descriptions |
| Metrics/numbers | monoLarge | "99.9%", "145ms" |
| Timestamps | labelSmall | "2 min ago" |
| Status labels | labelMedium | "UP", "DOWN" |

---

## Spacing System

Use a consistent 4pt grid system.

```swift
// Spacing.swift
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}
```

### Application

| Use Case | Spacing |
|----------|---------|
| Inside buttons | sm (8pt) |
| Between list items | md (12pt) |
| Section padding | lg (16pt) |
| Between sections | xl (24pt) |
| Screen edge margins | lg (16pt) |
| Card internal padding | lg (16pt) |

---

## Component Library

### 1. Status Indicator

A visual indicator for resource/alert status.

```swift
struct StatusIndicator: View {
    enum Size { case small, medium, large }
    enum Status { case up, down, degraded, unknown }

    let status: Status
    let size: Size

    var body: some View {
        Circle()
            .fill(statusColor)
            .frame(width: dimension, height: dimension)
            .overlay(
                Circle()
                    .stroke(statusColor.opacity(0.3), lineWidth: 2)
            )
    }

    private var statusColor: Color {
        switch status {
        case .up: return .statusUp
        case .down: return .statusDown
        case .degraded: return .statusDegraded
        case .unknown: return .statusUnknown
        }
    }

    private var dimension: CGFloat {
        switch size {
        case .small: return 8
        case .medium: return 12
        case .large: return 16
        }
    }
}
```

**Usage:**
```swift
StatusIndicator(status: .up, size: .medium)
```

### 2. Severity Badge

Badge showing alert severity.

```swift
struct SeverityBadge: View {
    enum Severity { case critical, warning, info }

    let severity: Severity

    var body: some View {
        Text(severity.label)
            .font(.labelSmall)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(severity.color)
            .clipShape(Capsule())
    }
}

extension SeverityBadge.Severity {
    var label: String {
        switch self {
        case .critical: return "CRITICAL"
        case .warning: return "WARNING"
        case .info: return "INFO"
        }
    }

    var color: Color {
        switch self {
        case .critical: return .severityCritical
        case .warning: return .severityWarning
        case .info: return .severityInfo
        }
    }
}
```

### 3. Stat Card

Dashboard statistics card.

```swift
struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String?
    let icon: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(tint)
                Spacer()
            }

            Text(value)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(title)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

### 4. Resource Row

List row for resources.

```swift
struct ResourceRow: View {
    let resource: Resource

    var body: some View {
        HStack(spacing: Spacing.md) {
            StatusIndicator(status: resource.status.toIndicator, size: .medium)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(resource.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text(resource.resourceType.displayName)
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                if let responseTime = resource.lastResponseTime {
                    Text("\(responseTime)ms")
                        .font(.monoMedium)
                        .foregroundColor(.textPrimary)
                }

                if let lastChecked = resource.lastCheckedAt {
                    Text(lastChecked.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.textTertiary)
        }
        .padding(.vertical, Spacing.md)
    }
}
```

### 5. Alert Row

List row for alerts with swipe actions.

```swift
struct AlertRow: View {
    let alert: Alert
    let onAcknowledge: () -> Void
    let onResolve: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(alert.severity.color)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(alert.title)
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    SeverityBadge(severity: alert.severity.toBadge)
                }

                Text(alert.message)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
                    .lineLimit(2)

                HStack {
                    StatusBadge(status: alert.status)

                    Spacer()

                    Text(alert.triggeredAt.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.vertical, Spacing.sm)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(action: onResolve) {
                Label("Resolve", systemImage: "checkmark.circle")
            }
            .tint(.statusUp)

            Button(action: onAcknowledge) {
                Label("Acknowledge", systemImage: "eye")
            }
            .tint(.brandPrimary)
        }
    }
}
```

### 6. Search Bar

Searchable list header.

```swift
struct SearchBar: View {
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textTertiary)

            TextField(placeholder, text: $text)
                .font(.bodyMedium)

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
```

### 7. Filter Chip

Selectable filter option.

```swift
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.labelMedium)
                .foregroundColor(isSelected ? .white : .textPrimary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(isSelected ? Color.brandPrimary : Color.backgroundSecondary)
                .clipShape(Capsule())
        }
    }
}
```

### 8. Empty State

Empty list placeholder.

```swift
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let action: (() -> Void)?
    let actionTitle: String?

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.textTertiary)

            Text(title)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            if let action = action, let actionTitle = actionTitle {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.labelLarge)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, Spacing.md)
                        .background(Color.brandPrimary)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(Spacing.xxl)
    }
}
```

### 9. Loading State

Loading indicator for async content.

```swift
struct LoadingView: View {
    let message: String?

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())

            if let message = message {
                Text(message)
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}
```

### 10. Error State

Error display with retry.

```swift
struct ErrorView: View {
    let error: Error
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.severityWarning)

            Text("Something went wrong")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(error.localizedDescription)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            Button(action: retryAction) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.labelLarge)
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(Color.brandPrimary)
                    .clipShape(Capsule())
            }
        }
        .padding(Spacing.xxl)
    }
}
```

---

## Screen Layouts

### Dashboard Layout

```
+------------------------------------------+
|  [Nav Bar: Dashboard]                    |
+------------------------------------------+
|                                          |
|  +--------+  +--------+  +--------+      |
|  | Total  |  |   Up   |  |  Down  |      |
|  |  45    |  |   42   |  |    2   |      |
|  +--------+  +--------+  +--------+      |
|                                          |
|  +--------+  +--------+                  |
|  | Alerts |  | Uptime |                  |
|  |   5    |  | 99.5%  |                  |
|  +--------+  +--------+                  |
|                                          |
|  +--------------------------------------+|
|  | Resource Health         [Pie Chart] ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  | Performance Trend      [Line Chart] ||
|  +--------------------------------------+|
|                                          |
|  Recent Checks                           |
|  +--------------------------------------+|
|  | [o] API Health         145ms    2m   ||
|  | [o] Database           89ms     2m   ||
|  | [x] Storage Service    ---      5m   ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
|  [Dashboard] [Resources] [Alerts] [More] |
+------------------------------------------+
```

### List Layout

```
+------------------------------------------+
|  [Nav Bar: Resources]           [Filter] |
+------------------------------------------+
|  +--------------------------------------+|
|  | [Search resources...]                ||
|  +--------------------------------------+|
|                                          |
|  [All] [Up] [Down] [Degraded]            |
|                                          |
|  +--------------------------------------+|
|  | [o] Production API                   ||
|  |     API  |  145ms  |  2 min ago    > ||
|  +--------------------------------------+|
|  | [o] Main Database                    ||
|  |     Database  |  89ms  |  2 min    > ||
|  +--------------------------------------+|
|  | [x] Storage Service                  ||
|  |     Storage  |  ---  |  5 min ago  > ||
|  +--------------------------------------+|
|  | ...                                  ||
|                                          |
+------------------------------------------+
|  [Dashboard] [Resources] [Alerts] [More] |
+------------------------------------------+
```

### Detail Layout

```
+------------------------------------------+
|  [< Resources]  Resource Detail          |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |            [Large Status Icon]       ||
|  |                  UP                  ||
|  |         Production API               ||
|  |        Last check: 2 min ago         ||
|  +--------------------------------------+|
|                                          |
|  Type: API                               |
|  URL: https://api.example.com/health     |
|                                          |
|  Response Time                           |
|  +--------------------------------------+|
|  |        [Line Chart - 24h]            ||
|  |  [24h] [7d] [30d]                    ||
|  +--------------------------------------+|
|                                          |
|  Uptime                                  |
|  +--------+ +--------+ +--------+        |
|  | 24h    | | 7d     | | 30d    |        |
|  | 100%   | | 99.9%  | | 99.5%  |        |
|  +--------+ +--------+ +--------+        |
|                                          |
|  Recent Checks                           |
|  +--------------------------------------+|
|  | [o] 2 min ago    200    145ms        ||
|  | [o] 7 min ago    200    132ms        ||
|  | [o] 12 min ago   200    156ms        ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

---

## Iconography

### System Symbols

Use SF Symbols consistently throughout the app.

| Context | Symbol Name | Usage |
|---------|-------------|-------|
| Dashboard | chart.bar.fill | Tab icon |
| Resources | server.rack | Tab icon, resource lists |
| Alerts | bell.fill | Tab icon, alert notifications |
| Clients | building.2.fill | Tab icon, client lists |
| More | ellipsis | Tab icon |
| Status Up | checkmark.circle.fill | Status indicators |
| Status Down | xmark.circle.fill | Status indicators |
| Status Degraded | exclamationmark.circle.fill | Status indicators |
| Status Unknown | questionmark.circle.fill | Status indicators |
| Settings | gearshape.fill | Settings navigation |
| Search | magnifyingglass | Search bars |
| Filter | line.3.horizontal.decrease.circle | Filter buttons |
| Refresh | arrow.clockwise | Pull to refresh, refresh buttons |
| Navigation | chevron.right | List row disclosure |
| Back | chevron.left | Navigation back |
| Close | xmark | Modal dismiss |
| Add | plus | Create new items |
| Edit | pencil | Edit actions |
| Delete | trash | Delete actions |
| Azure | cloud.fill | Azure-related items |
| Cost | dollarsign.circle.fill | Cost displays |
| Time | clock.fill | Time-related displays |

---

## Animation Guidelines

### Timing

```swift
enum AnimationDuration {
    static let instant: Double = 0.1
    static let fast: Double = 0.2
    static let normal: Double = 0.3
    static let slow: Double = 0.5
}
```

### Common Animations

```swift
// Spring animation for interactive elements
Animation.spring(response: 0.3, dampingFraction: 0.7)

// Easing for state changes
Animation.easeInOut(duration: AnimationDuration.normal)

// Chart animations
Animation.easeOut(duration: AnimationDuration.slow)
```

### Haptic Feedback

```swift
// Success feedback (alert resolved, check passed)
UINotificationFeedbackGenerator().notificationOccurred(.success)

// Warning feedback (alert triggered)
UINotificationFeedbackGenerator().notificationOccurred(.warning)

// Error feedback (failed action)
UINotificationFeedbackGenerator().notificationOccurred(.error)

// Selection feedback (filter selection, tab change)
UISelectionFeedbackGenerator().selectionChanged()

// Impact feedback (pull to refresh threshold)
UIImpactFeedbackGenerator(style: .medium).impactOccurred()
```

---

## Accessibility

### VoiceOver Labels

```swift
// Status Indicator
StatusIndicator(status: .up, size: .medium)
    .accessibilityLabel("Status: Up")

// Resource Row
ResourceRow(resource: resource)
    .accessibilityElement(children: .combine)
    .accessibilityLabel("\(resource.name), \(resource.status.displayName), response time \(resource.lastResponseTime ?? 0) milliseconds")

// Severity Badge
SeverityBadge(severity: .critical)
    .accessibilityLabel("Severity: Critical")
```

### Dynamic Type Support

All text must support Dynamic Type. Use system fonts and avoid fixed sizes.

```swift
// Good
Text("Dashboard")
    .font(.displayMedium)

// Bad - fixed size
Text("Dashboard")
    .font(.system(size: 24))
```

### Minimum Touch Targets

All interactive elements must be at least 44x44 points.

```swift
Button(action: {}) {
    Image(systemName: "ellipsis")
        .font(.system(size: 20))
}
.frame(minWidth: 44, minHeight: 44)
```

### Color Contrast

Ensure sufficient contrast ratios:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

---

## Dark Mode

All colors must support both light and dark modes via Asset Catalog or adaptive system colors.

### Testing Checklist

- [ ] All screens readable in light mode
- [ ] All screens readable in dark mode
- [ ] Status colors visible in both modes
- [ ] Charts readable in both modes
- [ ] No pure white (#FFFFFF) backgrounds in dark mode
- [ ] No pure black (#000000) backgrounds in light mode

---

## Charts

### Chart Colors

```swift
extension Color {
    static let chartPrimary = Color.brandPrimary
    static let chartSecondary = Color.brandSecondary
    static let chartSuccess = Color.statusUp
    static let chartDanger = Color.statusDown
    static let chartWarning = Color.statusDegraded
    static let chartNeutral = Color.textTertiary
}
```

### Chart Styles

**Line Charts (Response Time, Cost Trends)**
- Line width: 2pt
- Fill gradient from chartPrimary at 0.3 opacity to transparent
- Grid lines: textTertiary at 0.2 opacity
- Axis labels: labelSmall font

**Pie Charts (Resource Health)**
- Segment colors: statusUp, statusDown, statusDegraded, statusUnknown
- Segment spacing: 2pt
- Label font: labelMedium

**Bar Charts (Cost Breakdown)**
- Bar corner radius: 4pt
- Bar spacing: 8pt
- Horizontal labels: labelSmall font

---

## Form Design

### Text Fields

```swift
struct QuartzTextField: View {
    let label: String
    @Binding var text: String
    let placeholder: String
    let isSecure: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(label)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .font(.bodyMedium)
            .padding(Spacing.md)
            .background(Color.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
```

### Buttons

**Primary Button**
```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    let isLoading: Bool

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
                Text(title)
                    .font(.labelLarge)
            }
            .frame(maxWidth: .infinity)
            .foregroundColor(.white)
            .padding(.vertical, Spacing.md)
            .background(Color.brandPrimary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .disabled(isLoading)
    }
}
```

**Secondary Button**
```swift
struct SecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.labelLarge)
                .frame(maxWidth: .infinity)
                .foregroundColor(.brandPrimary)
                .padding(.vertical, Spacing.md)
                .background(Color.brandPrimary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
```

---

## Error Handling UI

### Inline Errors

```swift
struct InlineError: View {
    let message: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundColor(.severityCritical)

            Text(message)
                .font(.labelSmall)
                .foregroundColor(.severityCritical)
        }
    }
}
```

### Toast Notifications

```swift
struct Toast: View {
    enum Style { case success, error, warning, info }

    let message: String
    let style: Style

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: style.icon)
            Text(message)
                .font(.labelMedium)
        }
        .foregroundColor(.white)
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.md)
        .background(style.color)
        .clipShape(Capsule())
        .shadow(radius: 10)
    }
}
```

---

## Navigation Patterns

### Tab Bar

- 5 tabs maximum
- Badge on Alerts tab showing unread count
- Selected state uses brandPrimary color

### Navigation Stack

- Use NavigationStack for hierarchical navigation
- Large title style for root views
- Inline title style for detail views

### Sheets and Modals

- Use sheets for creation/editing forms
- Use full-screen covers for complex workflows
- Always provide clear dismiss action

---

## File Organization

```
QuartzMobile/
├── Resources/
│   ├── Assets.xcassets/
│   │   ├── Colors/
│   │   │   ├── StatusUp.colorset/
│   │   │   ├── StatusDown.colorset/
│   │   │   └── ...
│   │   └── Images/
│   │       └── AppIcon.appiconset/
│   └── Localizable.strings
├── Core/
│   └── Design/
│       ├── Colors.swift
│       ├── Typography.swift
│       ├── Spacing.swift
│       └── Animation.swift
├── Components/
│   ├── Common/
│   │   ├── StatusIndicator.swift
│   │   ├── SeverityBadge.swift
│   │   ├── StatCard.swift
│   │   ├── SearchBar.swift
│   │   ├── FilterChip.swift
│   │   ├── EmptyStateView.swift
│   │   ├── LoadingView.swift
│   │   └── ErrorView.swift
│   ├── Resources/
│   │   ├── ResourceRow.swift
│   │   └── ResourceStatusHero.swift
│   ├── Alerts/
│   │   ├── AlertRow.swift
│   │   └── StatusBadge.swift
│   └── Charts/
│       ├── ResponseTimeChart.swift
│       ├── ResourceHealthChart.swift
│       └── CostTrendChart.swift
└── Views/
    ├── Dashboard/
    ├── Resources/
    ├── Alerts/
    ├── Clients/
    └── Settings/
```

---

## Checklist for New Screens

When creating a new screen, ensure:

- [ ] Follows navigation pattern (stack, sheet, or full-screen)
- [ ] Uses semantic colors from Color extension
- [ ] Uses typography from Font extension
- [ ] Uses spacing from Spacing enum
- [ ] Supports Dynamic Type
- [ ] Supports dark mode
- [ ] Has VoiceOver labels
- [ ] Has minimum 44x44pt touch targets
- [ ] Has loading state
- [ ] Has error state
- [ ] Has empty state (if applicable)
- [ ] Has pull-to-refresh (if list)
- [ ] Uses haptic feedback appropriately
- [ ] Animations are smooth (60 FPS)
