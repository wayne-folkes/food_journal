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
        let currentSession = AppSupabase.client.auth.currentSession
        
        // Check if the session is expired
        if let currentSession, !currentSession.isExpired {
            session = currentSession
        } else if currentSession?.isExpired == true {
            // Session exists but is expired - attempt to refresh it
            Task { [weak self] in
                try? await self?.refreshSession()
            }
        }

        Task { [weak self] in
            for await (event, session) in AppSupabase.client.auth.authStateChanges {
                guard let self else { break }
                
                // Check if the session is expired before accepting it
                if let session, !session.isExpired {
                    self.session = session
                } else if session?.isExpired == true {
                    // Attempt to refresh expired session
                    try? await self.refreshSession()
                } else {
                    self.session = nil
                }
                
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
    
    // MARK: - Session management
    
    private func refreshSession() async throws {
        let refreshedSession = try await AppSupabase.client.auth.refreshSession()
        self.session = refreshedSession
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

