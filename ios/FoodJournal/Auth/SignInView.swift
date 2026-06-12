import AuthenticationServices
import CryptoKit
import SwiftUI

struct SignInView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var pendingNonce: String?
    @State private var signInError: Error?

    var body: some View {
        ZStack {
            Color.appBg.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Hero
                VStack(spacing: 14) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(Color.appAccent)

                    Text("Food Journal")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundStyle(Color.appInk)

                    Text("Track what you eat, effortlessly.")
                        .font(.subheadline)
                        .foregroundStyle(Color.appInk.opacity(0.55))
                }

                Spacer()

                // Auth buttons
                VStack(spacing: 12) {
                    SignInWithAppleButton(.signIn) { request in
                        let nonce = makeNonce()
                        pendingNonce = nonce
                        request.requestedScopes = [.fullName, .email]
                        request.nonce = sha256(nonce)
                    } onCompletion: { result in
                        switch result {
                        case .success(let auth):
                            guard let nonce = pendingNonce else { return }
                            Task {
                                do {
                                    try await authManager.handleAppleSignIn(
                                        authorization: auth, nonce: nonce
                                    )
                                } catch {
                                    signInError = error
                                }
                            }
                        case .failure(let error):
                            // Ignore user-cancelled
                            if (error as? ASAuthorizationError)?.code != .canceled {
                                signInError = error
                            }
                        }
                    }
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 50)
                    .cornerRadius(12)

                    Button {
                        Task {
                            do { try await authManager.signInWithGoogle() }
                            catch { signInError = error }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "globe")
                                .font(.body.weight(.semibold))
                            Text("Sign in with Google")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.white)
                        .foregroundStyle(Color.black)
                        .cornerRadius(12)
                    }

                    Button("Continue without account") {
                        authManager.continueAsGuest()
                    }
                    .font(.footnote)
                    .foregroundStyle(Color.appInk.opacity(0.45))
                    .padding(.top, 6)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 56)
            }
        }
        .alert("Sign In Error", isPresented: .init(
            get: { signInError != nil },
            set: { if !$0 { signInError = nil } }
        )) {
            Button("OK") { signInError = nil }
        } message: {
            Text(signInError?.localizedDescription ?? "Unknown error")
        }
    }
}

// MARK: - Nonce helpers (required for Apple Sign In + Supabase OIDC)

private func makeNonce(length: Int = 32) -> String {
    let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var result = ""
    var remaining = length
    while remaining > 0 {
        (0 ..< 16).forEach { _ in
            guard remaining > 0 else { return }
            var byte: UInt8 = 0
            _ = SecRandomCopyBytes(kSecRandomDefault, 1, &byte)
            if byte < charset.count {
                result.append(charset[Int(byte)])
                remaining -= 1
            }
        }
    }
    return result
}

private func sha256(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
}

#Preview {
    SignInView()
        .environment(AuthManager())
}
