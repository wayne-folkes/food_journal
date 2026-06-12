import Foundation

/// Wire types for Supabase responses. Field names mirror
/// `shared/types/database.ts`; supabase-swift's default decoder handles the
/// Postgres ISO8601 timestamp formats.

struct MealDTO: Decodable, Identifiable, Sendable {
    let id: String
    let userId: String?
    let consumedAt: Date
    let mealType: MealType
    let rawInput: String
    let createdAt: Date
    let updatedAt: Date
    let mealItems: [MealItemDTO]

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case consumedAt = "consumed_at"
        case mealType = "meal_type"
        case rawInput = "raw_input"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case mealItems = "meal_items"
    }
}

struct MealItemDTO: Decodable, Identifiable, Sendable {
    let id: String
    let description: String
    let position: Int
    let consumedAt: Date
    let createdAt: Date
    let calories: Double?
    let qty: String?

    enum CodingKeys: String, CodingKey {
        case id, description, position, calories, qty
        case consumedAt = "consumed_at"
        case createdAt = "created_at"
    }
}

/// Row returned by the `search_meals` RPC. Items arrive as a jsonb array;
/// only the fields the search UI needs are decoded (skipping the item
/// timestamps avoids jsonb date-format pitfalls).
struct SearchMealRow: Decodable, Identifiable, Sendable {
    let id: String
    let consumedAt: Date
    let mealType: MealType
    let items: [Item]

    struct Item: Decodable, Sendable {
        let description: String
        let position: Int
        let calories: Double?
    }

    enum CodingKeys: String, CodingKey {
        case id, items
        case consumedAt = "consumed_at"
        case mealType = "meal_type"
    }
}
