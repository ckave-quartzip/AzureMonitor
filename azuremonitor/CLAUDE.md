# Quartz Azure Monitor iOS App

**Project:** azuremonitor
**Platform:** iOS (SwiftUI)

---

## Project Location

**CRITICAL:** Use the existing Xcode project. Do NOT create a new project.

- **Project Root:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/`
- **Source Files:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`
- **Xcode Project:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor.xcodeproj`

---

## Key Rules

### 1. Detail Pages for Clickable Items
When creating any list view, row component, or navigation link:
- Always consider whether clicking the item should navigate to a detail view
- If a detail view doesn't exist, create it with comprehensive information about the item
- Every tappable list item should have a corresponding detail screen
- Detail screens should include: header with key info, metadata sections, related data, and actions where applicable
- Use NavigationLink to wrap row components for drill-down navigation

### 2. API Response Handling
- Use `requestArrayOrEmpty()` for endpoints that return arrays
- Use `requestOptional()` for endpoints that may return null
- Use `requestSingleOrFirst()` for detail endpoints that might return arrays
- Always handle both array and object responses defensively

### 3. Architecture
- Follow MVVM pattern
- Use `@MainActor` for all ViewModels
- Use `@Published` for observable state
- Use `async/await` for all API calls
- Extract subviews when body exceeds 30 lines

### 4. UI States
Always provide these states for data-driven views:
- Loading state
- Error state with retry action
- Empty state (if applicable)
- Pull-to-refresh for lists

### 5. Design System
Use the project's design tokens:
- Colors: `.brandPrimary`, `.textPrimary`, `.textSecondary`, `.backgroundPrimary`, `.backgroundSecondary`, `.statusUp`, `.statusDown`
- Typography: `.displayLarge`, `.displayMedium`, `.displaySmall`, `.bodyLarge`, `.bodyMedium`, `.bodySmall`, `.labelLarge`, `.labelMedium`, `.labelSmall`
- Spacing: `Spacing.xxs`, `Spacing.xs`, `Spacing.sm`, `Spacing.md`, `Spacing.lg`, `Spacing.xl`

### 6. Build & Test
```bash
# Build
xcodebuild -scheme azuremonitor -destination 'platform=iOS Simulator,name=iPhone 17' build

# Run tests
xcodebuild test -scheme azuremonitor -destination 'platform=iOS Simulator,name=iPhone 17'
```

---

## Reference Documents

For full documentation, see:
- `/Users/chriskave/Documents/Development/AzureMonitor/ios-app/agent.md` - Complete agent instructions
- `/Users/chriskave/Documents/Development/AzureMonitor/ios-app/PRD.md` - Product requirements
- `/Users/chriskave/Documents/Development/AzureMonitor/ios-app/UI_DESIGN_GUIDELINES.md` - Visual design specs
