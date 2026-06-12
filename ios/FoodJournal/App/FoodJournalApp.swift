import SwiftUI

@main
struct FoodJournalApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                // OAuth deep-link callback (foodjournal://auth/callback).
                // Wired in iOS Phase 2 (Auth); stubbed here so the scheme round-trips.
                .onOpenURL { url in
                    print("Received deep link: \(url)")
                }
        }
    }
}
