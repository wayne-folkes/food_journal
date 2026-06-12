import SwiftData
import SwiftUI

@main
struct FoodJournalApp: App {
    @State private var authManager = AuthManager()
    @State private var historyStore = ItemHistoryStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .environment(historyStore)
                .onOpenURL { url in
                    AppSupabase.client.auth.handle(url)
                }
        }
        .modelContainer(for: Meal.self)
    }
}
