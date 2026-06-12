import SwiftData
import SwiftUI

/// Read-only day log: date navigation, summary tiles, meal cards.
struct DayView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var loadError: String?

    let date: Date
    let onDateChange: (Date) -> Void

    @Query private var meals: [Meal]

    init(date: Date, onDateChange: @escaping (Date) -> Void) {
        self.date = date
        self.onDateChange = onDateChange
        let start = date.startOfDay
        let end = start.nextDay
        _meals = Query(
            filter: #Predicate<Meal> { $0.consumedAt >= start && $0.consumedAt < end },
            sort: \Meal.consumedAt
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                masthead
                dateNav
                DaySummaryView(meals: meals)

                if meals.isEmpty {
                    EmptyDayView()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else {
                    VStack(spacing: 14) {
                        ForEach(meals) { meal in
                            MealCardView(meal: meal)
                        }
                    }
                }

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
        .task(id: date.dayKey) { await sync(force: false) }
    }

    private func sync(force: Bool) async {
        do {
            try await MealsRepository.syncDay(containing: date, context: modelContext, force: force)
            loadError = nil
        } catch {
            loadError = "Couldn't refresh — \(error.localizedDescription)"
        }
    }

    // MARK: - Masthead + date nav

    private var masthead: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(date.isToday ? "Today" : date.formatted(.dateTime.weekday(.wide)))
                .font(.system(size: 38, weight: .bold, design: .rounded))
                .foregroundStyle(Color.appInk)
            Text(date.formatted(.dateTime.month(.wide).day().year()))
                .font(.subheadline)
                .foregroundStyle(Color.appInk.opacity(0.5))
        }
        .padding(.top, 8)
    }

    private var dateNav: some View {
        HStack(spacing: 12) {
            navButton(systemName: "chevron.left") { onDateChange(date.previousDay) }

            if !date.isToday {
                Button("Today") { onDateChange(.now) }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Color.appAccent)
            }

            Spacer()

            // Never navigate past today (read path has no future meals).
            navButton(systemName: "chevron.right") { onDateChange(date.nextDay) }
                .disabled(date.isToday)
                .opacity(date.isToday ? 0.3 : 1)
        }
    }

    private func navButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.body.weight(.semibold))
                .foregroundStyle(Color.appInk)
                .frame(width: 38, height: 38)
                .background(Circle().fill(Color.appCard))
        }
    }
}

/// Dashed accent square with a pen icon — mirrors the web empty state.
struct EmptyDayView: View {
    var body: some View {
        VStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(
                    Color.appAccent.opacity(0.6),
                    style: StrokeStyle(lineWidth: 1.5, dash: [6, 5])
                )
                .frame(width: 64, height: 64)
                .overlay(
                    Image(systemName: "pencil.line")
                        .font(.title2)
                        .foregroundStyle(Color.appAccent)
                )
            VStack(spacing: 4) {
                Text("Nothing logged yet.")
                    .font(.headline)
                    .foregroundStyle(Color.appInk)
                Text("Meals you log will show up here.")
                    .font(.subheadline)
                    .foregroundStyle(Color.appInk.opacity(0.5))
            }
        }
    }
}
