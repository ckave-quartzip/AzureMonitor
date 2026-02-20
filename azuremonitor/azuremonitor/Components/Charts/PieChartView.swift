import SwiftUI
import Charts

struct PieChartView: View {
    let data: [PieChartDataPoint]

    var body: some View {
        if #available(iOS 17.0, *) {
            Chart(data) { point in
                SectorMark(
                    angle: .value("Value", point.value),
                    innerRadius: .ratio(0.6),
                    angularInset: 1.5
                )
                .foregroundStyle(point.color)
                .cornerRadius(4)
            }
        } else {
            LegacyPieChart(data: data)
        }
    }
}

struct LegacyPieChart: View {
    let data: [PieChartDataPoint]

    var body: some View {
        GeometryReader { geometry in
            let total = data.reduce(0) { $0 + $1.value }
            let size = min(geometry.size.width, geometry.size.height)

            ZStack {
                ForEach(0..<data.count, id: \.self) { index in
                    let startAngle = angleFor(index: index, total: total)
                    let endAngle = angleFor(index: index + 1, total: total)

                    PieSlice(startAngle: startAngle, endAngle: endAngle)
                        .fill(data[index].color)
                }
            }
            .frame(width: size, height: size)
            .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
        }
    }

    private func angleFor(index: Int, total: Double) -> Angle {
        let sum = data.prefix(index).reduce(0) { $0 + $1.value }
        return .degrees(sum / total * 360 - 90)
    }
}

struct PieSlice: Shape {
    let startAngle: Angle
    let endAngle: Angle

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2

        path.move(to: center)
        path.addArc(center: center, radius: radius, startAngle: startAngle, endAngle: endAngle, clockwise: false)
        path.closeSubpath()

        return path
    }
}

struct PieChartDataPoint: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
    let color: Color
}
