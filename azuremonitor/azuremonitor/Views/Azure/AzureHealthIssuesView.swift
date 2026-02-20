import SwiftUI

struct AzureHealthIssuesView: View {
    var body: some View {
        EmptyStateView(
            icon: "checkmark.shield",
            title: "No Health Issues",
            message: "All Azure resources are healthy. Health recommendations will appear here when issues are detected."
        )
        .navigationTitle("Health Issues")
    }
}
