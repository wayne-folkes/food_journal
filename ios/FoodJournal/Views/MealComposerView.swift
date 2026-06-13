import SwiftData
import SwiftUI

/// Sheet for logging a new meal: chip item input with autocomplete, meal-type
/// pills, and a time picker. Mirrors the web QuickLogBar / compose sheet.
struct MealComposerView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Environment(ItemHistoryStore.self) private var historyStore
    @FocusState private var inputFocused: Bool

    let initialDate: Date
    let onSave: () -> Void

    @State private var mealType: MealType = .suggested()
    @State private var items: [String] = []
    @State private var inputText = ""
    @State private var consumedAt: Date
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var chipTrigger = 0
    @State private var saveTrigger = 0

    init(initialDate: Date = .now, onSave: @escaping () -> Void) {
        self.initialDate = initialDate
        self.onSave = onSave
        _consumedAt = State(initialValue: initialDate)
        _mealType = State(initialValue: .suggested(for: initialDate))
    }

    private var suggestions: [String] {
        historyStore.suggestions(for: inputText)
            .filter { !items.contains($0) }
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
                    .padding(.bottom, 100) // room for save button
                }

                saveButton
            }
            .navigationTitle("Log a meal")
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
        .onAppear { inputFocused = true }
        .sensoryFeedback(.impact(weight: .light), trigger: chipTrigger)
        .sensoryFeedback(.success, trigger: saveTrigger)
    }

    // MARK: - Meal type

    private var mealTypePicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            label("Meal type")
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
            label("Time")
            DatePicker("", selection: $consumedAt, in: ...Date.now, displayedComponents: [.date, .hourAndMinute])
                .labelsHidden()
                .tint(Color.appAccent)
                .colorScheme(.dark)
        }
    }

    // MARK: - Item input + autocomplete

    private var itemInputSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            label("Items")
            HStack(spacing: 10) {
                TextField("Add item…", text: $inputText)
                    .focused($inputFocused)
                    .foregroundStyle(Color.appInk)
                    .autocorrectionDisabled()
                    .onSubmit { commitInput() }
                    .onChange(of: inputText) { _, new in
                        // Commit on trailing comma (natural flow from web composer)
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

            if !suggestions.isEmpty {
                autocompleteList
            }
        }
    }

    private var autocompleteList: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(suggestions, id: \.self) { suggestion in
                Button {
                    items.append(suggestion)
                    inputText = ""
                    inputFocused = true
                } label: {
                    HStack {
                        Text(suggestion)
                            .font(.subheadline)
                            .foregroundStyle(Color.appInk)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Image(systemName: "arrow.up.left")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.appInk.opacity(0.3))
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                if suggestion != suggestions.last {
                    Divider().overlay(Color.appInk.opacity(0.08))
                }
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.appCard)
        )
    }

    // MARK: - Chips

    private var chipStrip: some View {
        VStack(alignment: .leading, spacing: 10) {
            label("Added (\(items.count))")
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
                        Text(items.isEmpty ? "Add items first" : "Log meal")
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

    // MARK: - Actions

    private func label(_ text: String) -> some View {
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
        // Commit any dangling text
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
            try await MealsRepository.createMeal(
                type: mealType,
                items: items.map { MealItemInput(description: $0, calories: nil) },
                consumedAt: consumedAt,
                context: modelContext,
                historyStore: historyStore
            )
            saveTrigger += 1
            onSave()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
    }
}

// MARK: - FlowLayout (chip wrap)

/// Simple wrapping layout for chip strips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let maxWidth = bounds.width
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
