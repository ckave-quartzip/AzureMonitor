import SwiftUI

struct ResponseTimeChart: View {
    let data: [ChartDataPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Response Time")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            LineChartView(data: data, lineColor: .brandPrimary)
                .frame(height: 150)
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
