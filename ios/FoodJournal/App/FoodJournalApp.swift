import SwiftUI

@main
struct FoodJournalApp: App {
    @State private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
                .onOpenURL { url in
                    // Handles foodjournal://auth/callback from Google OAuth redirect.
                    AppSupabase.client.auth.handle(url)
                }
        }
    }
}
