import SwiftData
import SwiftUI

/// Root view — switches between SignInView and the main app based on auth
/// state, and wipes local data when the user signs out.
struct ContentView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        Group {
            if authManager.showMainApp {
                AppRootView()
            } else {
                SignInView()
            }
        }
        .preferredColorScheme(.dark)
        .onChange(of: authManager.session?.user.id) { oldValue, newValue in
            // Sign-out: clear the local mirror of the remote account's data.
            if oldValue != nil, newValue == nil {
                try? modelContext.delete(model: Meal.self)
                MealsRepository.clearCache()
            }
        }
    }
}

/// Main app shell: topbar (wordmark, search, account), Day/Week mode toggle,
/// and the active view.
struct AppRootView: View {
    @Environment(AuthManager.self) private var authManager

    private enum ViewMode: String, CaseIterable, Identifiable {
        case day = "Day"
        case week = "Week"
        var id: String { rawValue }
    }

    @State private var viewMode: ViewMode = .day
    @State private var selectedDate: Date = .now
    @State private var showSearch = false

    var body: some View {
        ZStack {
            Color.appBg.ignoresSafeArea()

            VStack(spacing: 12) {
                topbar
                modeToggle

                switch viewMode {
                case .day:
                    DayView(date: selectedDate) { selectedDate = $0 }
                case .week:
                    WeekView(
                        anchorDate: selectedDate,
                        onSelectDay: { day in
                            selectedDate = day
                            viewMode = .day
                        },
                        onWeekChange: { selectedDate = $0 }
                    )
                }
            }
        }
        .sheet(isPresented: $showSearch) {
            SearchView { day in
                selectedDate = day
                viewMode = .day
            }
        }
    }

    private var topbar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                Text("Food Journal")
                    .font(.system(.headline, design: .rounded, weight: .bold))
                    .foregroundStyle(Color.appInk)
                Circle()
                    .fill(Color.appAccent)
                    .frame(width: 7, height: 7)
                    .shadow(color: Color.appAccent.opacity(0.8), radius: 4)
            }

            Spacer()

            Button {
                showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Color.appInk)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(Color.appCard))
            }

            Menu {
                if let email = authManager.session?.user.email {
                    Text(email)
                }
                Button("Sign Out", role: .destructive) {
                    Task { try? await authManager.signOut() }
                }
            } label: {
                Image(systemName: "person.crop.circle")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Color.appInk)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(Color.appCard))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private var modeToggle: some View {
        Picker("View", selection: $viewMode) {
            ForEach(ViewMode.allCases) { mode in
                Text(mode.rawValue).tag(mode)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 16)
    }
}
