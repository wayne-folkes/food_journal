import SwiftUI

/// 3-tile stat strip (Meals / Items / kcal) with neon numerals — mirrors the
/// web `DaySummary`, including its meal-type color assignments.
struct DaySummaryView: View {
    let meals: [Meal]

    var body: some View {
        if !meals.isEmpty {
            HStack(spacing: 10) {
                tile(value: "\(meals.count)", label: "Meals", color: MealType.dinner.color)
                tile(value: "\(itemCount)", label: "Items", color: MealType.lunch.color)
                tile(value: calorieValue, label: calorieLabel, color: MealType.breakfast.color)
            }
        }
    }

    private var itemCount: Int { meals.flatMap(\.items).count }

    private var calorieValue: String {
        let (total, isPartial, hasAny) = meals.calorieSummary
        guard hasAny else { return "—" }
        return "\(isPartial ? "~" : "")\(total.formatted())"
    }

    private var calorieLabel: String {
        meals.calorieSummary.hasAny ? "~kcal so far" : "kcal"
    }

    private func tile(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(.title, design: .rounded, weight: .bold))
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(Color.appInk.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.appCard)
        )
        .accessibilityElement(children: .combine)
    }
}
