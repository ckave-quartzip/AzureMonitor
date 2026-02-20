# Ralph Loop Configuration - Quartz Azure Monitor iOS App

**Project:** QuartzMobile
**Version:** 1.0.0
**Last Updated:** January 2026

---

## Overview

This document provides the entry point configuration for the Ralph Loop to build the Quartz Azure Monitor iOS application with feature parity to the web application.

---

## Document Map

| Document | Purpose | Priority |
|----------|---------|----------|
| `PRD.md` | Full product requirements document | Read first |
| `PRD.json` | Structured requirements for parsing | Reference during build |
| `UI_DESIGN_GUIDELINES.md` | Visual design specifications | Reference for UI work |
| `agent.md` | Development instructions and patterns | Follow for implementation |
| `learnings.md` | Technical context from web app | Reference for patterns |
| `SETUP.md` | Project setup guide | Reference for configuration |

---

## Build Order

Execute these phases in order:

### Phase 1: Project Foundation
**Estimated Tasks:** 15-20

1. Create Xcode project structure
2. Configure Swift Package dependencies
3. Setup Asset Catalog with colors
4. Implement Core/Design system (Colors, Typography, Spacing)
5. Create all common UI components

**Validation:** All components render correctly in previews

### Phase 2: Networking & Auth
**Estimated Tasks:** 10-15

1. Implement APIClient with error handling
2. Create all APIEndpoint definitions
3. Implement AuthService with Azure SSO
4. Implement KeychainService
5. Implement BiometricService
6. Create LoginView and LoginViewModel

**Validation:** User can sign in via Azure SSO

### Phase 3: Dashboard
**Estimated Tasks:** 10-15

1. Implement DashboardRepository
2. Create DashboardViewModel
3. Build DashboardView with stat cards
4. Implement charts (health, trends)
5. Add recent checks list
6. Setup realtime subscriptions

**Validation:** Dashboard shows live data, updates in real-time

### Phase 4: Resources
**Estimated Tasks:** 12-18

1. Implement ResourceRepository
2. Create ResourcesListViewModel
3. Build ResourcesListView with search/filter
4. Create ResourceRow component
5. Build ResourceDetailView
6. Implement response time charts
7. Add uptime statistics

**Validation:** User can browse, search, filter resources

### Phase 5: Alerts
**Estimated Tasks:** 12-18

1. Implement AlertRepository
2. Create AlertsListViewModel
3. Build AlertsListView with tabs
4. Create AlertRow with swipe actions
5. Implement acknowledge/resolve
6. Add haptic feedback

**Validation:** User can view, acknowledge, resolve alerts

### Phase 6: Clients & Incidents
**Estimated Tasks:** 15-20

1. Implement ClientRepository
2. Build ClientsListView and ClientDetailView
3. Implement IncidentRepository
4. Build IncidentsListView and IncidentDetailView

**Validation:** User can browse clients and incidents

### Phase 7: Azure Monitoring
**Estimated Tasks:** 15-20

1. Implement AzureRepository
2. Build AzureOverviewView
3. Build AzureCostReportView with filters
4. Build AzureHealthIssuesView
5. Implement cost charts
6. Add CSV export

**Validation:** User can view Azure costs and health issues

### Phase 8: Navigation & Polish
**Estimated Tasks:** 10-15

1. Implement MainTabView
2. Setup NavigationStack routing
3. Implement DeepLinkHandler
4. Add push notification handling
5. Build SettingsView

**Validation:** Full app navigation works, notifications deep link

### Phase 9: Testing & QA
**Estimated Tasks:** 20-30

1. Write ViewModel unit tests (80% coverage)
2. Write Repository unit tests
3. Write UI tests for critical flows
4. Accessibility audit
5. Performance optimization
6. Dark mode verification

**Validation:** All tests pass, accessibility compliant

---

## API Configuration

```json
{
  "baseUrl": "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1",
  "authMethod": "X-API-Key header",
  "authProvider": "Supabase Auth with Azure OAuth"
}
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Framework | SwiftUI | Modern, declarative, native |
| Architecture | MVVM | Clean separation, testable |
| Networking | URLSession + async/await | Native, no dependencies |
| Auth | Supabase Auth | Matches web, Azure SSO support |
| State | @Published + ObservableObject | SwiftUI standard |
| Charts | Swift Charts | Native iOS 16+ framework |
| Keychain | KeychainAccess | Simplified secure storage |
| Testing | XCTest | Native, well supported |

---

## Success Criteria

The build is complete when:

- [ ] All screens from PRD implemented
- [ ] Azure SSO authentication works
- [ ] Real-time updates functional
- [ ] Push notifications configured
- [ ] All P0/P1 features complete
- [ ] Unit test coverage > 80%
- [ ] App passes accessibility audit
- [ ] Dark mode fully supported
- [ ] No memory leaks
- [ ] App launches in < 2 seconds

---

## Reference Files for Each Module

### Authentication
- `PRD.md` > Section 1. Authentication Module
- `PRD.json` > modules[0] (auth)
- `agent.md` > Authentication with Azure SSO
- `learnings.md` > 1. Authentication Flow

### Dashboard
- `PRD.md` > Section 2. Dashboard Module
- `PRD.json` > modules[1] (dashboard)
- `UI_DESIGN_GUIDELINES.md` > Dashboard Layout
- `learnings.md` > 5. Dashboard Statistics Calculation

### Resources
- `PRD.md` > Section 4. Resource Monitoring Module
- `PRD.json` > modules[2] (resources)
- `UI_DESIGN_GUIDELINES.md` > Resource Row, List Layout
- `learnings.md` > 4. Data Fetching Patterns

### Alerts
- `PRD.md` > Section 5. Alerts Module
- `PRD.json` > modules[3] (alerts)
- `UI_DESIGN_GUIDELINES.md` > Alert Row, Severity Badge
- `learnings.md` > 6. Alert Acknowledge/Resolve Actions

### Azure
- `PRD.md` > Section 7. Azure Overview Module
- `PRD.json` > modules[6] (azure)
- `UI_DESIGN_GUIDELINES.md` > Charts section
- `learnings.md` > 7. Cost Data Structure

---

## Error Recovery

If a phase fails:

1. Review the specific error message
2. Check related documentation section
3. Verify API endpoint availability
4. Check network/auth configuration
5. Roll back to last working state if needed

---

## Notes for Agent

1. **Authentication is Critical** - Do not proceed past Phase 2 until Azure SSO is working
2. **Follow Design System** - All UI must use colors/typography from UI_DESIGN_GUIDELINES.md
3. **Test Incrementally** - Validate each phase before proceeding
4. **Real-time is Essential** - Dashboard must update live for this to be useful
5. **Security First** - Never hardcode credentials or log sensitive data

---

## Completion Checklist

When all phases complete, verify:

```
[ ] App icon and launch screen configured
[ ] All navigation paths work
[ ] Pull-to-refresh on all lists
[ ] Error states show retry option
[ ] Empty states have appropriate messaging
[ ] Loading states show progress
[ ] Haptic feedback on actions
[ ] VoiceOver labels complete
[ ] Dynamic Type supported
[ ] Dark mode works everywhere
[ ] App can go background and resume
[ ] Notifications arrive and deep link
[ ] Offline mode shows cached data
```

---

## Start Command

Begin with Phase 1, Task 1: Create Xcode project structure following the directory layout in `agent.md`.
