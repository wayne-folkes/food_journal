import Foundation
import Observation
import Supabase

@Observable
@MainActor
final class AuthManager {
    private(set) var session: Session?
    private(set) var isGuestMode = false

    var showMainApp: Bool { session != nil || isGuestMode }

    init() {
        // Initialise from the persisted session so there is no sign-in flash on relaunch.
        session = AppSupabase.client.auth.currentSession

        Task { [weak self] in
            for await (event, session) in AppSupabase.client.auth.authStateChanges {
                guard let self else { break }
                self.session = session
                if event == .signedOut {
                    self.isGuestMode = false
                }
            }
        }
    }

    // MARK: - Sign in

    func signInWithGoogle() async throws {
        // supabase-swift opens an ASWebAuthenticationSession and handles PKCE internally.
        try await AppSupabase.client.auth.signInWithOAuth(
            provider: .google,
            redirectTo: URL(string: "foodjournal://auth/callback")!
        )
    }

    // MARK: - Guest / sign out

    func continueAsGuest() {
        isGuestMode = true
    }

    func signOut() async throws {
        try await AppSupabase.client.auth.signOut()
        isGuestMode = false
    }
}

