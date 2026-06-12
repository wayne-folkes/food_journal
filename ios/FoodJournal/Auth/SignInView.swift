import SwiftUI

struct SignInView: View {
    @Environment(AuthManager.self) private var authManager
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


#Preview {
    SignInView()
        .environment(AuthManager())
}
