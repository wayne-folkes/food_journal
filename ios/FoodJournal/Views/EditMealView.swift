import SwiftData
import SwiftUI

/// Pre-populated edit sheet — same layout as MealComposerView but seeded
/// from an existing meal. Saves via `update_meal_with_items` RPC.
struct EditMealView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @FocusState private var inputFocused: Bool

    let meal: Meal
    let onSave: () -> Void

    @State private var mealType: MealType
    @State private var items: [String]
    @State private var inputText = ""
    @State private var consumedAt: Date
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var chipTrigger = 0
    @State private var saveTrigger = 0

    init(meal: Meal, onSave: @escaping () -> Void) {
        self.meal = meal
        self.onSave = onSave
        _mealType = State(initialValue: meal.mealType)
        _items = State(initialValue: meal.sortedItems.map(\.descriptionText))
        _consumedAt = State(initialValue: meal.consumedAt)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        mealTypePicker
                        timePicker
                        itemInputSection
                        if !items.isEmpty { chipStrip }
                    }
                    .padding(20)
                    .padding(.bottom, 100)
                }

                saveButton
            }
            .navigationTitle("Edit meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.appBg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.appInk.opacity(0.6))
                }
            }
        }
        .preferredColorScheme(.dark)
        .sensoryFeedback(.impact(weight: .light), trigger: chipTrigger)
        .sensoryFeedback(.success, trigger: saveTrigger)
    }

    // MARK: - Meal type

    private var mealTypePicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Meal type")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(MealType.allCases) { type in
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) { mealType = type }
                        } label: {
                            Text(type.label)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(mealType == type ? Color.appBg : type.color)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(
                                    Capsule().fill(mealType == type ? type.color : type.color.opacity(0.12))
                                )
                                .overlay(
                                    Capsule().strokeBorder(type.color.opacity(mealType == type ? 0 : 0.4), lineWidth: 1)
                                )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Time

    private var timePicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Time")
            DatePicker("", selection: $consumedAt, displayedComponents: [.date, .hourAndMinute])
                .labelsHidden()
                .tint(Color.appAccent)
                .colorScheme(.dark)
        }
    }

    // MARK: - Item input

    private var itemInputSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Items")
            HStack(spacing: 10) {
                TextField("Add item…", text: $inputText)
                    .focused($inputFocused)
                    .foregroundStyle(Color.appInk)
                    .autocorrectionDisabled()
                    .onSubmit { commitInput() }
                    .onChange(of: inputText) { _, new in
                        if new.hasSuffix(",") {
                            inputText = String(new.dropLast()).trimmingCharacters(in: .whitespaces)
                            commitInput()
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.appCard)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .strokeBorder(Color.appAccent.opacity(0.4), lineWidth: 1)
                            )
                    )

                if !inputText.trimmingCharacters(in: .whitespaces).isEmpty {
                    Button {
                        commitInput()
                        inputFocused = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Color.appAccent)
                    }
                    .accessibilityLabel("Add item")
                }
            }
        }
    }

    // MARK: - Chips

    private var chipStrip: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Items (\(items.count))")
            FlowLayout(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    HStack(spacing: 6) {
                        Text(item)
                            .font(.subheadline)
                            .foregroundStyle(Color.appInk)
                        Button {
                            withAnimation { items.removeAll { $0 == item } }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(Color.appInk.opacity(0.5))
                        }
                        .accessibilityLabel("Remove \(item)")
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(
                        Capsule().fill(mealType.color.opacity(0.15))
                            .overlay(Capsule().strokeBorder(mealType.color.opacity(0.3), lineWidth: 1))
                    )
                }
            }
        }
    }

    // MARK: - Save

    private var saveButton: some View {
        VStack {
            Spacer()
            Button {
                Task { await save() }
            } label: {
                Group {
                    if isSaving {
                        ProgressView().tint(Color.appBg)
                    } else {
                        Text(items.isEmpty ? "Add items first" : "Save changes")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .foregroundStyle(Color.appBg)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(items.isEmpty ? Color.appInk.opacity(0.2) : Color.appAccent)
                )
            }
            .disabled(items.isEmpty || isSaving)
            .padding(20)
        }
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Color.appInk.opacity(0.5))
            .textCase(.uppercase)
    }

    private func commitInput() {
        let trimmed = inputText
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .capitalized
        guard !trimmed.isEmpty, !items.contains(trimmed) else {
            inputText = ""
            return
        }
        withAnimation { items.append(trimmed) }
        inputText = ""
        chipTrigger += 1
    }

    private func save() async {
        let pending = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !pending.isEmpty {
            let cap = pending.prefix(1).uppercased() + pending.dropFirst()
            if !items.contains(cap) { items.append(cap) }
            inputText = ""
        }
        guard !items.isEmpty else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            try await MealsRepository.updateMeal(
                meal,
                type: mealType,
                items: items.map { MealItemInput(description: $0, calories: nil) },
                consumedAt: consumedAt,
                context: modelContext
            )
            saveTrigger += 1
            onSave()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
    }
}
