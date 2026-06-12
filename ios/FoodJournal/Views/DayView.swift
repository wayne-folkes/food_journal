import SwiftData
import SwiftUI

struct DayView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var loadError: String?
    @State private var showComposer = false
    @State private var editingMeal: Meal?
    @State private var undoSnapshot: MealSnapshot?
    @State private var undoTask: Task<Void, Never>?

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
        ZStack(alignment: .bottomTrailing) {
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
                                MealCardView(
                                    meal: meal,
                                    onEdit: { editingMeal = meal },
                                    onDelete: { initiateDelete(meal) }
                                )
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
                .padding(.bottom, 100) // room for FAB + undo
            }
            .scrollIndicators(.hidden)
            .refreshable { await sync(force: true) }
            .task(id: date.dayKey) { await sync(force: false) }

            // FAB
            Button {
                showComposer = true
            } label: {
                Image(systemName: "plus")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Color.appBg)
                    .frame(width: 56, height: 56)
                    .background(Circle().fill(Color.appAccent))
                    .shadow(color: Color.appAccent.opacity(0.55), radius: 16, y: 4)
            }
            .padding(.trailing, 24)
            .padding(.bottom, 32)
        }
        // Undo toast
        .overlay(alignment: .bottom) {
            if undoSnapshot != nil {
                undoBanner
                    .padding(.horizontal, 16)
                    .padding(.bottom, 108)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.3), value: undoSnapshot != nil)
        .sheet(isPresented: $showComposer) {
            MealComposerView(initialDate: date) {
                Task { await sync(force: true) }
            }
        }
        .sheet(item: $editingMeal) { meal in
            EditMealView(meal: meal) {
                Task { await sync(force: true) }
            }
        }
    }

    // MARK: - Delete + undo

    private func initiateDelete(_ meal: Meal) {
        undoTask?.cancel()
        guard let snapshot = try? MealsRepository.deleteMealLocally(meal, context: modelContext) else { return }
        undoSnapshot = snapshot

        undoTask = Task {
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            await MealsRepository.deleteMealRemotely(id: snapshot.id)
            withAnimation { undoSnapshot = nil }
        }
    }

    private func undoDelete() {
        undoTask?.cancel()
        guard let snapshot = undoSnapshot else { return }
        try? MealsRepository.restoreMeal(from: snapshot, context: modelContext)
        withAnimation { undoSnapshot = nil }
    }

    private var undoBanner: some View {
        HStack {
            Image(systemName: "trash")
                .foregroundStyle(Color.appInk.opacity(0.6))
            Text("Meal deleted")
                .font(.subheadline)
                .foregroundStyle(Color.appInk)
            Spacer()
            Button("Undo") { undoDelete() }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Color.appAccent)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.appCard)
                .shadow(color: .black.opacity(0.3), radius: 12, y: 4)
        )
    }

    // MARK: - Sync

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

/// Dashed accent square empty state.
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
                Text("Tap + to log your first meal.")
                    .font(.subheadline)
                    .foregroundStyle(Color.appInk.opacity(0.5))
            }
        }
    }
}
