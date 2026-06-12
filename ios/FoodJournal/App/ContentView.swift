import SwiftUI

/// Root view — switches between SignInView and the main app based on auth state.
/// The main app placeholder here will be replaced by the real day view in Phase 3.
struct ContentView: View {
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        if authManager.showMainApp {
            AppRootView()
        } else {
            SignInView()
        }
    }
}

/// Placeholder for the main app (Phase 3 will replace this with the real day view).
private struct AppRootView: View {
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ZStack {
            Color.appBg.ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "fork.knife.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Color.appAccent)

                Text("Food Journal")
                    .font(.largeTitle.bold())
                    .foregroundStyle(Color.appInk)

                if let email = authManager.session?.user.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(Color.appInk.opacity(0.55))
                } else if authManager.isGuestMode {
                    Text("Guest mode — data stays on this device")
                        .font(.subheadline)
                        .foregroundStyle(Color.appInk.opacity(0.55))
                }

                Text("Phase 3 coming soon…")
                    .font(.caption)
                    .foregroundStyle(Color.appInk.opacity(0.3))
                    .padding(.top, 24)

                Button("Sign Out") {
                    Task { try? await authManager.signOut() }
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Color.appAccent)
                .padding(.top, 8)
            }
            .padding()
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthManager())
}
