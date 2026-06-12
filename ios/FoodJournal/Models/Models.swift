import Foundation
import SwiftData

/// Local store of meals. Mirrors the `meals` table — remote rows are upserted
/// here by `MealsRepository`, guest-mode rows live here only (Phase 4 syncs
/// them up on sign-in).
@Model
final class Meal {
    @Attribute(.unique) var id: String
    var userId: String?
    var consumedAt: Date
    var mealTypeRaw: String
    var rawInput: String
    var createdAt: Date
    var updatedAt: Date

    /// True when this meal was created locally and has not yet been written to
    /// Supabase (authed user was offline, or guest meal awaiting sign-in sync).
    var pendingSync: Bool = false

    @Relationship(deleteRule: .cascade, inverse: \MealItem.meal)
    var items: [MealItem] = []

    init(
        id: String,
        userId: String?,
        consumedAt: Date,
        mealType: MealType,
        rawInput: String,
        createdAt: Date,
        updatedAt: Date
    ) {
        self.id = id
        self.userId = userId
        self.consumedAt = consumedAt
        self.mealTypeRaw = mealType.rawValue
        self.rawInput = rawInput
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var mealType: MealType { MealType(rawValue: mealTypeRaw) ?? .snack }
    var sortedItems: [MealItem] { items.sorted { $0.position < $1.position } }
}

/// Mirrors the `meal_items` table.
@Model
final class MealItem {
    @Attribute(.unique) var id: String
    var descriptionText: String
    var position: Int
    var consumedAt: Date
    var createdAt: Date
    var calories: Double?
    var qty: String?

    var meal: Meal?

    init(
        id: String,
        descriptionText: String,
        position: Int,
        consumedAt: Date,
        createdAt: Date,
        calories: Double?,
        qty: String?
    ) {
        self.id = id
        self.descriptionText = descriptionText
        self.position = position
        self.consumedAt = consumedAt
        self.createdAt = createdAt
        self.calories = calories
        self.qty = qty
    }
}

// MARK: - Calorie totals

extension Array where Element == Meal {
    /// (total, isPartial, hasAny) for the calories across all items —
    /// mirrors the web `DaySummary` "~kcal so far" logic.
    var calorieSummary: (total: Int, isPartial: Bool, hasAny: Bool) {
        let allItems = flatMap(\.items)
        let withCal = allItems.compactMap(\.calories)
        let total = Int(withCal.reduce(0, +).rounded())
        return (total, !withCal.isEmpty && withCal.count < allItems.count, !withCal.isEmpty)
    }
}
