import SwiftData
import SwiftUI

/// Week overview: stacked neon bar chart (one column per day, segments per
/// meal type) above tappable day rows — mirrors the web `WeekView`.
struct WeekView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var loadError: String?

    let anchorDate: Date
    let onSelectDay: (Date) -> Void
    let onWeekChange: (Date) -> Void

    @Query private var meals: [Meal]

    init(
        anchorDate: Date,
        onSelectDay: @escaping (Date) -> Void,
        onWeekChange: @escaping (Date) -> Void
    ) {
        self.anchorDate = anchorDate
        self.onSelectDay = onSelectDay
        self.onWeekChange = onWeekChange
        let range = anchorDate.weekRange
        let start = range.lowerBound
        let end = range.upperBound
        _meals = Query(
            filter: #Predicate<Meal> { $0.consumedAt >= start && $0.consumedAt < end },
            sort: \Meal.consumedAt
        )
    }

    private var weekDays: [Date] {
        let start = anchorDate.weekRange.lowerBound
        return (0 ..< 7).map { Calendar.current.date(byAdding: .day, value: $0, to: start)! }
    }

    private func meals(on day: Date) -> [Meal] {
        meals.filter { Calendar.current.isDate($0.consumedAt, inSameDayAs: day) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                masthead
                weekNav
                chart
                dayRows

                if let loadError {
                    Text(loadError)
                        .font(.caption)
                        .foregroundStyle(.red.opacity(0.8))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .refreshable { await sync(force: true) }
        .task(id: anchorDate.weekRange.lowerBound.dayKey) { await sync(force: false) }
    }

    private func sync(force: Bool) async {
        do {
            try await MealsRepository.syncWeek(containing: anchorDate, context: modelContext, force: force)
            loadError = nil
        } catch {
            loadError = "Couldn't refresh — \(error.localizedDescription)"
        }
    }

    // MARK: - Masthead + nav

    private var masthead: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("This week")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(Color.appInk)
            Text(weekRangeLabel)
                .font(.subheadline)
                .foregroundStyle(Color.appInk.opacity(0.5))
        }
        .padding(.top, 8)
    }

    private var weekRangeLabel: String {
        let range = anchorDate.weekRange
        let start = range.lowerBound
        let end = Calendar.current.date(byAdding: .day, value: 6, to: start)!
        return "\(start.formatted(.dateTime.month(.abbreviated).day())) – \(end.formatted(.dateTime.month(.abbreviated).day()))"
    }

    private var weekNav: some View {
        HStack(spacing: 12) {
            navButton(systemName: "chevron.left", label: "Previous week") {
                onWeekChange(Calendar.current.date(byAdding: .day, value: -7, to: anchorDate)!)
            }

            if !anchorDate.weekRange.contains(.now) {
                Button("This week") { onWeekChange(.now) }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Color.appAccent)
            }

            Spacer()

            navButton(systemName: "chevron.right", label: "Next week") {
                onWeekChange(Calendar.current.date(byAdding: .day, value: 7, to: anchorDate)!)
            }
            .disabled(anchorDate.weekRange.contains(.now))
            .opacity(anchorDate.weekRange.contains(.now) ? 0.3 : 1)
        }
    }

    private func navButton(systemName: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.body.weight(.semibold))
                .foregroundStyle(Color.appInk)
                .frame(width: 38, height: 38)
                .background(Circle().fill(Color.appCard))
        }
        .accessibilityLabel(label)
    }

    // MARK: - Chart

    private let chartHeight: CGFloat = 120

    private var maxItemsPerDay: Int {
        max(weekDays.map { meals(on: $0).flatMap(\.items).count }.max() ?? 0, 1)
    }

    private var chart: some View {
        HStack(alignment: .bottom, spacing: 10) {
            ForEach(weekDays, id: \.dayKey) { day in
                VStack(spacing: 6) {
                    chartColumn(for: day)
                    Text(day.formatted(.dateTime.weekday(.narrow)))
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(
                            day.isToday ? Color.appAccent : Color.appInk.opacity(0.45)
                        )
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture { onSelectDay(day) }
                .accessibilityLabel("\(day.formatted(.dateTime.weekday(.wide))), \(summaryLine(for: meals(on: day)))")
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.appCard)
        )
    }

    private func chartColumn(for day: Date) -> some View {
        let dayMeals = meals(on: day)
        let unit = chartHeight / CGFloat(maxItemsPerDay)

        return VStack(spacing: 3) {
            Spacer(minLength: 0)
            // Segments stacked in fixed meal-type order, like the web chart.
            ForEach(MealType.allCases) { type in
                let count = dayMeals
                    .filter { $0.mealType == type }
                    .flatMap(\.items)
                    .count
                if count > 0 {
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .fill(type.color)
                        .frame(height: max(CGFloat(count) * unit - 3, 5))
                        .shadow(color: type.color.opacity(0.5), radius: 4)
                }
            }
        }
        .frame(height: chartHeight)
    }

    // MARK: - Day rows

    private var dayRows: some View {
        VStack(spacing: 0) {
            ForEach(weekDays, id: \.dayKey) { day in
                let dayMeals = meals(on: day)
                Button {
                    onSelectDay(day)
                } label: {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(day.formatted(.dateTime.weekday(.wide)))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(day.isToday ? Color.appAccent : Color.appInk)
                            Text(summaryLine(for: dayMeals))
                                .font(.caption)
                                .foregroundStyle(Color.appInk.opacity(0.45))
                                .lineLimit(1)
                        }
                        Spacer()
                        HStack(spacing: 4) {
                            ForEach(mealTypes(in: dayMeals)) { type in
                                Circle()
                                    .fill(type.color)
                                    .frame(width: 8, height: 8)
                            }
                        }
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.appInk.opacity(0.3))
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal, 16)
                }
                if day.dayKey != weekDays.last?.dayKey {
                    Divider().overlay(Color.appInk.opacity(0.08))
                }
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.appCard)
        )
    }

    private func summaryLine(for dayMeals: [Meal]) -> String {
        let count = dayMeals.flatMap(\.items).count
        guard count > 0 else { return "No meals" }
        return "\(dayMeals.count) meal\(dayMeals.count == 1 ? "" : "s") · \(count) item\(count == 1 ? "" : "s")"
    }

    private func mealTypes(in dayMeals: [Meal]) -> [MealType] {
        MealType.allCases.filter { type in dayMeals.contains { $0.mealType == type } }
    }
}
