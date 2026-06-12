import SwiftUI

/// Arcade Glow meal card with swipe actions for edit and delete.
struct MealCardView: View {
    let meal: Meal
    let onEdit: () -> Void
    let onDelete: () -> Void

    private var typeColor: Color { meal.mealType.color }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                MealTypePill(type: meal.mealType)
                Spacer()
                Text(meal.consumedAt, format: .dateTime.hour().minute())
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Color.appInk.opacity(0.5))
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(meal.sortedItems) { item in
                    HStack(alignment: .firstTextBaseline) {
                        Text(item.descriptionText)
                            .font(.body)
                            .foregroundStyle(Color.appInk)
                        Spacer()
                        if let cal = item.calories {
                            Text("\(Int(cal.rounded())) kcal")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(Color.appInk.opacity(0.45))
                        }
                    }
                }
            }

            if totalCalories > 0 {
                HStack {
                    Spacer()
                    Text("\(isPartial ? "~" : "")\(totalCalories.formatted()) kcal")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(typeColor)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.appCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(typeColor.opacity(0.35), lineWidth: 1)
        )
        .shadow(color: typeColor.opacity(0.16), radius: 14, y: 4)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading) {
            Button(action: onEdit) {
                Label("Edit", systemImage: "pencil")
            }
            .tint(Color.appAccent)
        }
    }

    private var totalCalories: Int {
        Int(meal.items.compactMap(\.calories).reduce(0, +).rounded())
    }

    private var isPartial: Bool {
        let withCal = meal.items.filter { $0.calories != nil }
        return !withCal.isEmpty && withCal.count < meal.items.count
    }
}

/// Solid neon pill with dark text, same recipe as the web's active meal-type pills.
struct MealTypePill: View {
    let type: MealType

    var body: some View {
        Text(type.label)
            .font(.caption.weight(.bold))
            .foregroundStyle(Color.appBg)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Capsule().fill(type.color))
    }
}
