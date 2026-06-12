import SwiftUI

/// Mirrors `MealType` in `shared/types/database.ts`.
enum MealType: String, Codable, CaseIterable, Identifiable, Sendable {
    case breakfast, lunch, dinner, snack, dessert, drink

    var id: String { rawValue }

    var label: String {
        rawValue.prefix(1).uppercased() + rawValue.dropFirst()
    }

    /// Arcade Glow neon accent for this meal type (same hex values as the web
    /// app's `--meal-*` CSS variables).
    var color: Color {
        switch self {
        case .breakfast: Color(hex: "#FFC53D")
        case .lunch:     Color(hex: "#A3E635")
        case .dinner:    Color(hex: "#8B7CFF")
        case .snack:     Color(hex: "#FF7AA2")
        case .dessert:   Color(hex: "#FF9F6B")
        case .drink:     Color(hex: "#4DD8E6")
        }
    }

    /// Suggests a meal type from the local time of day. Mirrors
    /// `suggestMealType` in `client/src/lib/mealType.ts` — dessert and drink
    /// are never auto-suggested.
    static func suggested(for date: Date = .now) -> MealType {
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        let minutes = (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
        if minutes >= 4 * 60, minutes < 10 * 60 + 30 { return .breakfast }
        if minutes >= 10 * 60 + 30, minutes < 14 * 60 + 30 { return .lunch }
        if minutes >= 17 * 60, minutes < 21 * 60 { return .dinner }
        return .snack
    }
}
