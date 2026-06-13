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
        // PostgREST selects embed the relation under the table name "meal_items";
        // the custom RPC functions use "items" to match the web app's MealWithItems shape.
        case mealItems = "meal_items"
        case itemsAlias = "items"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        userId = try c.decodeIfPresent(String.self, forKey: .userId)
        consumedAt = try c.decode(Date.self, forKey: .consumedAt)
        mealType = try c.decode(MealType.self, forKey: .mealType)
        rawInput = try c.decode(String.self, forKey: .rawInput)
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        updatedAt = try c.decode(Date.self, forKey: .updatedAt)
        if let items = try c.decodeIfPresent([MealItemDTO].self, forKey: .mealItems) {
            mealItems = items
        } else {
            mealItems = try c.decode([MealItemDTO].self, forKey: .itemsAlias)
        }
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
