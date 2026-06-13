import Foundation
import SwiftData
import Supabase

/// Owns all Supabase ↔ SwiftData I/O for meals. Views observe SwiftData via
/// `@Query`; these methods sync remote rows into the local store.
///
/// Mirrors the web zustand store: day/week results are cached per key so
/// revisiting a date doesn't refetch (`dayCache` on the web).
@MainActor
enum MealsRepository {
    static var loadedDayKeys = Set<String>()
    static var loadedWeekKeys = Set<String>()

    static var isAuthed: Bool { AppSupabase.client.auth.currentSession != nil }

    /// Forget fetch caches (call on sign-out alongside wiping SwiftData).
    static func clearCache() {
        loadedDayKeys.removeAll()
        loadedWeekKeys.removeAll()
    }

    // MARK: - Sync

    static func syncDay(containing date: Date, context: ModelContext, force: Bool = false) async throws {
        guard isAuthed else { return } // guest: SwiftData is the source of truth
        let key = date.dayKey
        if !force, loadedDayKeys.contains(key) { return }
        try await syncRange(date.startOfDay ..< date.startOfDay.nextDay, context: context)
        loadedDayKeys.insert(key)
    }

    static func syncWeek(containing date: Date, context: ModelContext, force: Bool = false) async throws {
        guard isAuthed else { return }
        let range = date.weekRange
        let key = range.lowerBound.dayKey
        if !force, loadedWeekKeys.contains(key) { return }
        try await syncRange(range, context: context)
        loadedWeekKeys.insert(key)
        // A synced week covers all its days.
        var day = range.lowerBound
        while day < range.upperBound {
            loadedDayKeys.insert(day.dayKey)
            day = day.nextDay
        }
    }

    private static func syncRange(_ range: Range<Date>, context: ModelContext) async throws {
        let dtos: [MealDTO] = try await AppSupabase.client
            .from("meals")
            .select("*, meal_items(*)")
            .gte("consumed_at", value: iso(range.lowerBound))
            .lt("consumed_at", value: iso(range.upperBound))
            .order("consumed_at", ascending: true)
            .execute()
            .value

        try upsert(dtos, range: range, context: context)
    }

    /// Reconcile remote rows into SwiftData for the given range: update
    /// matches, insert new, delete remote-owned rows that vanished remotely.
    /// Guest rows (`userId == nil`) are never touched.
    private static func upsert(_ dtos: [MealDTO], range: Range<Date>, context: ModelContext) throws {
        let lower = range.lowerBound
        let upper = range.upperBound
        let existing = try context.fetch(FetchDescriptor<Meal>(
            predicate: #Predicate { $0.userId != nil && $0.consumedAt >= lower && $0.consumedAt < upper }
        ))

        let incomingIds = Set(dtos.map(\.id))
        for stale in existing where !incomingIds.contains(stale.id) {
            context.delete(stale)
        }

        let byId = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        for dto in dtos {
            if let meal = byId[dto.id] {
                meal.userId = dto.userId
                meal.consumedAt = dto.consumedAt
                meal.mealTypeRaw = dto.mealType.rawValue
                meal.rawInput = dto.rawInput
                meal.updatedAt = dto.updatedAt
                // Capture locally-estimated calories before deleting items — server
                // may not have them yet if CaloriesService is still patching Supabase.
                var localCalByPosition: [Int: Double] = [:]
                for item in meal.items {
                    if let cal = item.calories { localCalByPosition[item.position] = cal }
                }
                for item in meal.items { context.delete(item) }
                meal.items = dto.mealItems.map { itemDTO in
                    let item = MealItem(from: itemDTO)
                    if item.calories == nil, let saved = localCalByPosition[itemDTO.position] {
                        item.calories = saved
                    }
                    return item
                }
            } else {
                let meal = Meal(
                    id: dto.id,
                    userId: dto.userId,
                    consumedAt: dto.consumedAt,
                    mealType: dto.mealType,
                    rawInput: dto.rawInput,
                    createdAt: dto.createdAt,
                    updatedAt: dto.updatedAt
                )
                meal.items = dto.mealItems.map(MealItem.init(from:))
                context.insert(meal)
            }
        }

        try context.save()
    }

    // MARK: - Search

    /// Authed: `search_meals` RPC. Guest: in-memory filter over SwiftData,
    /// mirroring the web store's local search path.
    static func searchMeals(query: String, context: ModelContext) async throws -> [SearchMealRow] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { return [] }

        if isAuthed {
            return try await AppSupabase.client
                .rpc("search_meals", params: ["p_query": q])
                .execute()
                .value
        }

        let needle = q.lowercased()
        let all = try context.fetch(FetchDescriptor<Meal>(
            sortBy: [SortDescriptor(\.consumedAt, order: .reverse)]
        ))
        return all
            .filter { $0.items.contains { $0.descriptionText.lowercased().contains(needle) } }
            .map { meal in
                SearchMealRow(
                    id: meal.id,
                    consumedAt: meal.consumedAt,
                    mealType: meal.mealType,
                    items: meal.sortedItems.map {
                        .init(description: $0.descriptionText, position: $0.position, calories: $0.calories)
                    }
                )
            }
    }

    // MARK: - Helpers

    private static func iso(_ date: Date) -> String {
        date.formatted(.iso8601)
    }
}

private extension MealItem {
    convenience init(from dto: MealItemDTO) {
        self.init(
            id: dto.id,
            descriptionText: dto.description,
            position: dto.position,
            consumedAt: dto.consumedAt,
            createdAt: dto.createdAt,
            calories: dto.calories,
            qty: dto.qty
        )
    }
}
