import SwiftUI

struct CostTrendChart: View {
    let data: [DailyCost]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost Trend")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            let chartData = data.map { ChartDataPoint(label: $0.date, value: Double(truncating: $0.cost as NSDecimalNumber)) }
            LineChartView(data: chartData, lineColor: .brandPrimary)
                .frame(height: 150)
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
