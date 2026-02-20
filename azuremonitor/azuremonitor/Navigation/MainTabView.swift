import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @StateObject private var alertsViewModel = AlertsListViewModel()

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }
                .tag(0)

            ResourcesListView()
                .tabItem {
                    Label("Resources", systemImage: "server.rack")
                }
                .tag(1)

            AlertsListView()
                .tabItem {
                    Label("Alerts", systemImage: "bell.fill")
                }
                .tag(2)
                .badge(alertsViewModel.activeAlerts.count)

            ClientsListView()
                .tabItem {
                    Label("Clients", systemImage: "building.2.fill")
                }
                .tag(3)

            MoreMenuView()
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
                .tag(4)
        }
        .task {
            await alertsViewModel.loadAlerts()
        }
    }
}
