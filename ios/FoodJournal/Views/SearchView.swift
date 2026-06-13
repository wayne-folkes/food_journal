import SwiftData
import SwiftUI

/// Search sheet: debounced query → `search_meals` RPC (authed) or local
/// filter (guest). Tapping a result jumps to that day.
struct SearchView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @FocusState private var fieldFocused: Bool

    @State private var query = ""
    @State private var results: [SearchMealRow] = []
    @State private var isSearching = false
    @State private var searchError: String?

    let onSelectDay: (Date) -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBg.ignoresSafeArea()

                VStack(spacing: 0) {
                    searchField
                        .padding(16)

                    resultsList
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.appAccent)
                }
            }
        }
        .preferredColorScheme(.dark)
        .task(id: query) {
            // 300ms debounce, mirroring the web search overlay.
            guard query.trimmingCharacters(in: .whitespaces).count >= 2 else {
                results = []
                return
            }
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await runSearch()
        }
        .onAppear { fieldFocused = true }
    }

    private func runSearch() async {
        isSearching = true
        defer { isSearching = false }
        do {
            results = try await MealsRepository.searchMeals(query: query, context: modelContext)
            searchError = nil
        } catch {
            searchError = error.localizedDescription
        }
    }

    // MARK: - Subviews

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.appInk.opacity(0.4))
            TextField("Search meals…", text: $query)
                .focused($fieldFocused)
                .foregroundStyle(Color.appInk)
                .autocorrectionDisabled()
            if isSearching {
                ProgressView().tint(Color.appAccent)
            } else if !query.isEmpty {
                Button {
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.appInk.opacity(0.3))
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.appCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.appAccent.opacity(0.35), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var resultsList: some View {
        if let searchError {
            Spacer()
            Text(searchError)
                .font(.caption)
                .foregroundStyle(.red.opacity(0.8))
                .padding()
            Spacer()
        } else if results.isEmpty {
            Spacer()
            Text(query.count >= 2 ? "No matches." : "Type to search your meals.")
                .font(.subheadline)
                .foregroundStyle(Color.appInk.opacity(0.4))
            Spacer()
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10, pinnedViews: .sectionHeaders) {
                    ForEach(groupedResults, id: \.key) { group in
                        Section {
                            ForEach(group.rows) { row in
                                resultRow(row)
                            }
                        } header: {
                            Text(group.label)
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.appInk.opacity(0.5))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 6)
                                .background(Color.appBg)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
    }

    private var groupedResults: [(key: String, label: String, rows: [SearchMealRow])] {
        let groups = Dictionary(grouping: results) { $0.consumedAt.dayKey }
        return groups
            .sorted { $0.key > $1.key }
            .map { key, rows in
                let label = rows[0].consumedAt
                    .formatted(.dateTime.weekday(.wide).month(.abbreviated).day())
                return (key, label, rows.sorted { $0.consumedAt < $1.consumedAt })
            }
    }

    private func resultRow(_ row: SearchMealRow) -> some View {
        Button {
            onSelectDay(row.consumedAt)
            dismiss()
        } label: {
            HStack(spacing: 12) {
                MealTypePill(type: row.mealType)
                Text(
                    row.items
                        .sorted { $0.position < $1.position }
                        .map(\.description)
                        .joined(separator: ", ")
                )
                .font(.subheadline)
                .foregroundStyle(Color.appInk)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                Spacer()
                Text(row.consumedAt, format: .dateTime.hour().minute())
                    .font(.caption)
                    .foregroundStyle(Color.appInk.opacity(0.4))
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.appCard)
            )
        }
    }
}
