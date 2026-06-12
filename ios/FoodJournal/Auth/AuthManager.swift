import AuthenticationServices
import CryptoKit
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

    func handleAppleSignIn(authorization: ASAuthorization, nonce: String) async throws {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8)
        else {
            throw AuthManagerError.invalidAppleCredential
        }
        try await AppSupabase.client.auth.signInWithIdToken(credentials: .init(
            provider: .apple,
            idToken: idToken,
            nonce: nonce
        ))
    }

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

enum AuthManagerError: LocalizedError {
    case invalidAppleCredential

    var errorDescription: String? {
        "Could not complete Apple Sign In. Please try again."
    }
}
