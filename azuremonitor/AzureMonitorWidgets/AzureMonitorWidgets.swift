import WidgetKit
import SwiftUI

@main
struct AzureMonitorWidgets: WidgetBundle {
    var body: some Widget {
        StatusWidget()
        AlertsWidget()
        ResourceHealthWidget()
    }
}
