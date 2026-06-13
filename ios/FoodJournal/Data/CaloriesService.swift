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

        // Capture descriptions before the await. Do NOT hold MealItem references
        // across it — sync can delete and recreate those objects while Foundation
        // Models is running, leaving us with orphaned items.
        let descriptions = meal.sortedItems.filter { $0.calories == nil }.map(\.descriptionText)
        guard !descriptions.isEmpty else { return }
        print("🔍 CaloriesService: estimating \(descriptions.count) items")

        // [Int?] aligned to `descriptions` — nil where the model refused/failed.
        let estimates = await estimate(descriptions)
        guard estimates.contains(where: { $0 != nil }) else {
            print("⚠️ CaloriesService: estimation failed for all items")
            return
        }

        // Re-read live items now that we're past the await — sync may have
        // replaced the original MealItem objects while Foundation Models ran.
        let liveItems = meal.sortedItems.filter { $0.calories == nil }
        guard liveItems.count == estimates.count else {
            print("⚠️ CaloriesService: item count changed during estimation, skipping")
            return
        }

        // Apply only the items we got a number for; leave the rest nil.
        var patched: [(item: MealItem, calories: Int)] = []
        for (item, est) in zip(liveItems, estimates) {
            guard let est else { continue }
            print("   ✅ \(item.descriptionText): \(est) kcal")
            item.calories = Double(est)
            patched.append((item, est))
        }
        try? context.save()

        // Update Supabase whenever authed and the meal has a user — skip only for
        // true guest meals (userId nil). pendingSync=true is fine: for an existing
        // meal whose edit RPC failed, the row still exists and position-keyed updates
        // land correctly. For a brand-new meal not yet pushed, update hits 0 rows
        // safely; flushPendingSync will carry the locally-set calories when it syncs.
        guard AppSupabase.client.auth.currentSession != nil, meal.userId != nil else { return }

        for (item, est) in patched {
            do {
                try await AppSupabase.client
                    .from("meal_items")
                    .update(["calories": est])
                    .eq("meal_id", value: meal.id)
                    .eq("position", value: item.position)
                    .execute()
                print("☁️ CaloriesService: patched Supabase — \(item.descriptionText): \(est) kcal")
            } catch {
                print("❌ CaloriesService: Supabase update failed for \(item.descriptionText): \(error)")
            }
        }
    }

    /// Returns one optional estimate per description (same order). Apple's
    /// on-device model refuses non-deterministically, so we try the batch twice,
    /// then fall back to per-item estimation — a single stubborn item shouldn't
    /// cost us calories for the rest of the meal.
    private static func estimate(_ descriptions: [String]) async -> [Int?] {
        print("🤖 CaloriesService: estimating items:")
        descriptions.forEach { print("   - \($0)") }

        for attempt in 1...2 {
            if let batch = await batchEstimate(descriptions), batch.count == descriptions.count {
                return batch.map { $0 }
            }
            print("⚠️ CaloriesService: batch attempt \(attempt) failed")
        }

        print("⚠️ CaloriesService: falling back to per-item estimation")
        var results: [Int?] = []
        for description in descriptions {
            results.append(await singleEstimate(description))
        }
        return results
    }

    private static func batchEstimate(_ descriptions: [String]) async -> [Int]? {
        let list = descriptions.enumerated()
            .map { "\($0 + 1). \($1)" }
            .joined(separator: "\n")
        let prompt = "For each food item, give the typical kcal for one standard portion:\n\(list)"
        do {
            let response = try await LanguageModelSession().respond(
                to: prompt,
                generating: CalorieBatch.self
            )
            return response.content.items.map(\.calories)
        } catch {
            logGenerationError(error)
            return nil
        }
    }

    private static func singleEstimate(_ description: String) async -> Int? {
        let prompt = "Typical kcal for one standard portion of \(description)?"
        do {
            let response = try await LanguageModelSession().respond(
                to: prompt,
                generating: ItemEstimate.self
            )
            print("   ✅ (per-item) \(description): \(response.content.calories) kcal")
            return response.content.calories
        } catch {
            print("   ⚠️ (per-item) refused: \(description)")
            return nil
        }
    }

    private static func logGenerationError(_ error: Error) {
        if let genError = error as? LanguageModelSession.GenerationError, case .refusal = genError {
            print("⚠️ CaloriesService: Content refusal")
        } else {
            print("❌ CaloriesService: Generation error: \(error)")
        }
    }
}
