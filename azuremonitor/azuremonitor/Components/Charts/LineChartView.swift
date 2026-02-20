import SwiftUI
import Charts

struct LineChartView: View {
    let data: [ChartDataPoint]
    let lineColor: Color
    let showArea: Bool

    init(data: [ChartDataPoint], lineColor: Color = .brandPrimary, showArea: Bool = true) {
        self.data = data
        self.lineColor = lineColor
        self.showArea = showArea
    }

    var body: some View {
        if #available(iOS 16.0, *) {
            Chart(data) { point in
                LineMark(
                    x: .value("Date", point.label),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(lineColor)

                if showArea {
                    AreaMark(
                        x: .value("Date", point.label),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(lineColor.opacity(0.1))
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading)
            }
        } else {
            Text("Charts require iOS 16+")
                .foregroundColor(.textSecondary)
        }
    }
}

struct ChartDataPoint: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
}
