import Foundation
import Observation
import SwiftData

/// In-memory cache of recent item descriptions, used to drive autocomplete in
/// the meal composer. Mirrors the web's `itemHistory` + `loadItemHistory`.
@Observable
@MainActor
final class ItemHistoryStore {
    private(set) var descriptions: [String] = []

    func load(context: ModelContext) async {
        if AppSupabase.client.auth.currentSession != nil {
            await loadFromSupabase()
        } else {
            loadFromSwiftData(context: context)
        }
    }

    /// Prefix-first ranked suggestions for `query`, max `limit` results.
    /// Exact-prefix matches come first; substring matches follow.
    func suggestions(for query: String, limit: Int = 6) -> [String] {
        let q = query.lowercased()
        guard !q.isEmpty else { return [] }
        let prefix = descriptions.filter { $0.lowercased().hasPrefix(q) }
        let substring = descriptions.filter { !$0.lowercased().hasPrefix(q) && $0.lowercased().contains(q) }
        return Array((prefix + substring).prefix(limit))
    }

    func prepend(_ description: String) {
        let lower = description.lowercased()
        descriptions.removeAll { $0.lowercased() == lower }
        descriptions.insert(description, at: 0)
    }

    private func loadFromSupabase() async {
        struct Row: Decodable { let description: String }
        guard let rows: [Row] = try? await AppSupabase.client
            .rpc("get_recent_item_descriptions", params: ["p_limit": 500])
            .execute()
            .value
        else { return }
        descriptions = rows.map(\.description)
    }

    private func loadFromSwiftData(context: ModelContext) {
        guard let meals = try? context.fetch(
            FetchDescriptor<Meal>(sortBy: [SortDescriptor(\.consumedAt, order: .reverse)])
        ) else { return }
        var seen = Set<String>()
        var result: [String] = []
        for meal in meals {
            for item in meal.sortedItems {
                let key = item.descriptionText.lowercased()
                if seen.insert(key).inserted { result.append(item.descriptionText) }
            }
        }
        descriptions = result
    }
}
