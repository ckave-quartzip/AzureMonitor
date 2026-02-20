import SwiftUI

struct PerformanceTrendChart: View {
    let data: [ChartDataPoint]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Performance Trend")
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
