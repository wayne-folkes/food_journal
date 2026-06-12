import SwiftUI

/// Placeholder root view for the Phase 1 scaffold. Replaced by the real
/// day view in iOS Phase 3 (Read path).
struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.tint)
            Text("Food Journal")
                .font(.largeTitle.bold())
            Text("iOS scaffold — Phase 1")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
