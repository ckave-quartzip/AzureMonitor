# Ralph Loop Prompt - Build QuartzMobile iOS App

## Objective
Build a complete native iOS application called **azuremonitor** that provides feature parity with the Quartz Azure Monitor web application. Execute all phases in sequence until the app is complete.

## Instructions
Read and execute the complete build specifications from: `/Users/chriskave/Documents/Development/AzureMonitor/ios-app/MASTER_PROMPT.md`

## Project Location
**IMPORTANT:** Use the existing Xcode project at: `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/`

Source files go in: `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`

## Execution Steps

1. **Read MASTER_PROMPT.md** - Contains all code, structure, and specifications
2. **Create folder structure inside existing project** - Add folders to `/azuremonitor/azuremonitor/`
3. **Implement Phase 1-10** - In order, all Swift files with complete code
4. **Verify Build** - Ensure project compiles without errors

## Key Specifications

- **Platform:** iOS 17.0+
- **Language:** Swift 6.0
- **UI Framework:** SwiftUI
- **Architecture:** MVVM
- **Bundle ID:** com.quartz.monitor

## API Configuration

```
Base URL: https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1
Auth: X-API-Key header
OAuth Callback: quartzmonitor://auth-callback
```

## Dependencies (Swift Package Manager)

```
https://github.com/supabase-community/supabase-swift (2.0.0+)
https://github.com/kishikawakatsumi/KeychainAccess (4.2.0+)
```

## Project Structure (inside /azuremonitor/azuremonitor/)

```
azuremonitor/
├── App/
│   └── azuremonitorApp.swift (existing - update)
├── Core/
│   ├── Design/
│   │   ├── Colors.swift
│   │   ├── Spacing.swift
│   │   └── Typography.swift
│   ├── Extensions/
│   │   ├── Date+Extensions.swift
│   │   └── View+Extensions.swift
│   └── Utilities/
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
│   └── Realtime/
│       └── RealtimeService.swift
├── Repositories/
│   ├── DashboardRepository.swift
│   ├── ClientRepository.swift
│   ├── ResourceRepository.swift
│   ├── AlertRepository.swift
│   ├── IncidentRepository.swift
│   └── AzureRepository.swift
├── Models/
│   ├── Client.swift
│   ├── Environment.swift
│   ├── Resource.swift
│   ├── Alert.swift
│   ├── AlertRule.swift
│   ├── Incident.swift
│   ├── MonitoringCheck.swift
│   ├── CheckResult.swift
│   ├── DashboardSummary.swift
│   ├── AzureTenant.swift
│   ├── AzureResource.swift
│   ├── AzureCostData.swift
│   └── User.swift
├── ViewModels/
│   ├── Auth/
│   │   └── LoginViewModel.swift
│   ├── Dashboard/
│   │   └── DashboardViewModel.swift
│   ├── Resources/
│   │   ├── ResourcesListViewModel.swift
│   │   └── ResourceDetailViewModel.swift
│   ├── Alerts/
│   │   ├── AlertsListViewModel.swift
│   │   └── AlertDetailViewModel.swift
│   ├── Clients/
│   │   ├── ClientsListViewModel.swift
│   │   └── ClientDetailViewModel.swift
│   ├── Incidents/
│   │   ├── IncidentsListViewModel.swift
│   │   └── IncidentDetailViewModel.swift
│   ├── Azure/
│   │   ├── AzureOverviewViewModel.swift
│   │   └── AzureCostReportViewModel.swift
│   └── Settings/
│       └── SettingsViewModel.swift
├── Views/
│   ├── Auth/
│   │   └── LoginView.swift
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── StatisticsCardsView.swift
│   │   ├── ResourceHealthChart.swift
│   │   ├── PerformanceTrendChart.swift
│   │   └── RecentChecksListView.swift
│   ├── Resources/
│   │   ├── ResourcesListView.swift
│   │   ├── ResourceDetailView.swift
│   │   ├── ResourceRow.swift
│   │   ├── ResourceStatusHero.swift
│   │   └── ResponseTimeChart.swift
│   ├── Alerts/
│   │   ├── AlertsListView.swift
│   │   ├── AlertDetailView.swift
│   │   ├── AlertRow.swift
│   │   └── AlertRulesListView.swift
│   ├── Clients/
│   │   ├── ClientsListView.swift
│   │   ├── ClientDetailView.swift
│   │   └── ClientRow.swift
│   ├── Incidents/
│   │   ├── IncidentsListView.swift
│   │   ├── IncidentDetailView.swift
│   │   └── IncidentRow.swift
│   ├── Azure/
│   │   ├── AzureOverviewView.swift
│   │   ├── AzureCostReportView.swift
│   │   ├── AzureHealthIssuesView.swift
│   │   └── CostTrendChart.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── More/
│       └── MoreMenuView.swift
├── Components/
│   ├── Common/
│   │   ├── StatusIndicator.swift
│   │   ├── SeverityBadge.swift
│   │   ├── StatusBadge.swift
│   │   ├── StatCard.swift
│   │   ├── SearchBar.swift
│   │   ├── FilterChip.swift
│   │   ├── EmptyStateView.swift
│   │   ├── LoadingView.swift
│   │   └── ErrorView.swift
│   ├── Forms/
│   │   ├── QuartzTextField.swift
│   │   ├── PrimaryButton.swift
│   │   └── SecondaryButton.swift
│   └── Charts/
│       ├── LineChartView.swift
│       └── PieChartView.swift
└── Navigation/
    ├── MainTabView.swift
    └── DeepLinkHandler.swift
```

## Build Phases

| Phase | Description | Files |
|-------|-------------|-------|
| 1 | Core Design System | Colors.swift, Spacing.swift, Typography.swift |
| 2 | Data Models | Client, Resource, Alert, Incident, Azure models |
| 3 | Networking | APIClient, APIEndpoint, APIError, APIResponse |
| 4 | Auth Services | AuthService, KeychainService, BiometricService |
| 5 | Repositories | Dashboard, Resource, Alert, Client, Incident, Azure |
| 6 | UI Components | StatusIndicator, SeverityBadge, StatCard, SearchBar, etc. |
| 7 | ViewModels | Login, Dashboard, Resources, Alerts, Clients, etc. |
| 8 | Views | All screens (Login, Dashboard, Resources, Alerts, etc.) |
| 9 | Navigation | MainTabView, DeepLinkHandler |
| 10 | App Entry | Update azuremonitorApp.swift |

## Success Criteria

- [ ] All 70+ Swift files created in correct location
- [ ] Project compiles without errors
- [ ] App launches to login screen
- [ ] All navigation flows work
- [ ] All screens render correctly

## Start Command

Begin by reading MASTER_PROMPT.md, then create the folder structure inside the existing project and implement all phases sequentially. Do not stop until the entire app is built and compiles successfully.
