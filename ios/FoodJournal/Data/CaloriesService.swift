import FoundationModels
import SwiftData

@Generable
struct CalorieBatch {
    @Guide(description: "One calorie estimate per food item, in the same order as the input list")
    var items: [ItemEstimate]
}

@Generable
struct ItemEstimate {
    @Guide(description: "Estimated calories as a whole number for a typical serving of this food")
    var calories: Int
}

/// Estimates calories for meal items using Apple Foundation Models (on-device, iOS 26+).
/// Requires Apple Intelligence to be enabled on the device.
@MainActor
enum CaloriesService {
    /// Fills nil calories for items in `meal`. Silently does nothing if the model
    /// is unavailable or estimation fails. Updates both SwiftData and Supabase.
    static func estimateIfNeeded(for meal: Meal, context: ModelContext) async {
        guard case .available = SystemLanguageModel.default.availability else { return }

        let pending = meal.sortedItems.filter { $0.calories == nil }
        guard !pending.isEmpty else { return }

        guard let batch = await estimate(pending.map(\.descriptionText)),
              batch.items.count == pending.count else { return }

        for (item, est) in zip(pending, batch.items) {
            item.calories = Double(est.calories)
        }
        try? context.save()

        // Patch Supabase only for server-synced meals (meal_id + position avoids UUID mismatch)
        guard AppSupabase.client.auth.currentSession != nil,
              meal.userId != nil,
              !meal.pendingSync else { return }

        for (item, est) in zip(pending, batch.items) {
            _ = try? await AppSupabase.client
                .from("meal_items")
                .update(["calories": est.calories])
                .eq("meal_id", value: meal.id)
                .eq("position", value: item.position)
                .execute()
        }
    }

    private static func estimate(_ descriptions: [String]) async -> CalorieBatch? {
        let list = descriptions.enumerated()
            .map { "\($0 + 1). \($1)" }
            .joined(separator: "\n")
        let session = LanguageModelSession(
            instructions: "You are a nutrition expert. Estimate calories conservatively using typical serving sizes."
        )
        return try? await session.respond(
            to: "Estimate the calories in each of these food items:\n\(list)",
            generating: CalorieBatch.self
        ).content
    }
}
