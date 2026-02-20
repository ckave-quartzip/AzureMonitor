import SwiftUI

enum DateRangePreset: String, CaseIterable {
    case last7Days = "Last 7 Days"
    case last30Days = "Last 30 Days"
    case thisMonth = "This Month"
    case lastMonth = "Last Month"
    case last90Days = "Last 90 Days"
    case custom = "Custom"

    var dateRange: (from: Date, to: Date) {
        let calendar = Calendar.current
        let today = Date()

        switch self {
        case .last7Days:
            return (calendar.date(byAdding: .day, value: -6, to: today)!, today)
        case .last30Days:
            return (calendar.date(byAdding: .day, value: -29, to: today)!, today)
        case .thisMonth:
            let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: today))!
            return (startOfMonth, today)
        case .lastMonth:
            let startOfThisMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: today))!
            let startOfLastMonth = calendar.date(byAdding: .month, value: -1, to: startOfThisMonth)!
            let endOfLastMonth = calendar.date(byAdding: .day, value: -1, to: startOfThisMonth)!
            return (startOfLastMonth, endOfLastMonth)
        case .last90Days:
            return (calendar.date(byAdding: .day, value: -89, to: today)!, today)
        case .custom:
            return (calendar.date(byAdding: .day, value: -29, to: today)!, today)
        }
    }
}

struct DateRangePicker: View {
    @Binding var fromDate: Date
    @Binding var toDate: Date
    @State private var selectedPreset: DateRangePreset = .last30Days
    @State private var showCustomPicker = false

    var onDateChange: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Preset buttons
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(DateRangePreset.allCases, id: \.self) { preset in
                        Button(action: {
                            selectedPreset = preset
                            if preset != .custom {
                                let range = preset.dateRange
                                fromDate = range.from
                                toDate = range.to
                                onDateChange?()
                            } else {
                                showCustomPicker = true
                            }
                        }) {
                            Text(preset.rawValue)
                                .font(.labelSmall)
                                .padding(.horizontal, Spacing.md)
                                .padding(.vertical, Spacing.xs)
                                .background(selectedPreset == preset ? Color.brandPrimary : Color.backgroundTertiary)
                                .foregroundColor(selectedPreset == preset ? .white : .textPrimary)
                                .clipShape(Capsule())
                        }
                    }
                }
            }

            // Date display
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.textSecondary)
                Text(dateRangeText)
                    .font(.labelMedium)
                    .foregroundColor(.textPrimary)
            }
        }
        .sheet(isPresented: $showCustomPicker) {
            CustomDateRangeSheet(
                fromDate: $fromDate,
                toDate: $toDate,
                onApply: {
                    showCustomPicker = false
                    onDateChange?()
                }
            )
        }
    }

    private var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return "\(formatter.string(from: fromDate)) - \(formatter.string(from: toDate))"
    }
}

struct CustomDateRangeSheet: View {
    @Binding var fromDate: Date
    @Binding var toDate: Date
    let onApply: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Start Date") {
                    DatePicker("From", selection: $fromDate, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                }

                Section("End Date") {
                    DatePicker("To", selection: $toDate, in: fromDate..., displayedComponents: .date)
                        .datePickerStyle(.graphical)
                }
            }
            .navigationTitle("Select Date Range")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        onApply()
                    }
                }
            }
        }
    }
}
