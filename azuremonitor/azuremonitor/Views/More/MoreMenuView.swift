import SwiftUI

struct MoreMenuView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Azure") {
                    NavigationLink(destination: AzureOverviewView()) {
                        Label("Azure Overview", systemImage: "cloud.fill")
                    }

                    NavigationLink(destination: AzureHealthIssuesView()) {
                        Label("Health Issues", systemImage: "heart.text.square")
                    }

                    NavigationLink(destination: AzureCostReportView()) {
                        Label("Cost Report", systemImage: "dollarsign.circle")
                    }
                }

                Section("Database Monitoring") {
                    NavigationLink(destination: SQLOverviewView()) {
                        Label("SQL Databases", systemImage: "cylinder.split.1x2")
                    }
                }

                Section("Management") {
                    NavigationLink(destination: IncidentsListView()) {
                        Label("Incidents", systemImage: "exclamationmark.triangle")
                    }
                }

                Section("Administration") {
                    NavigationLink(destination: AdminView()) {
                        Label("System Settings", systemImage: "gearshape.2")
                    }

                    NavigationLink(destination: UserManagementView()) {
                        Label("User Management", systemImage: "person.3")
                    }
                }

                Section("Account") {
                    NavigationLink(destination: SettingsView()) {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}
