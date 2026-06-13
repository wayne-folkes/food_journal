import Foundation
import Supabase

/// App-wide Supabase client, configured from the values injected into
/// Info.plist by `Config/Secrets.xcconfig` at build time.
///
/// This mirrors the web client (`client/src/lib/supabase.ts`): same project,
/// same RLS policies, same RPCs. The anon key is the publishable client key.
enum SupabaseConfig {
    static let url: URL = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: raw),
            raw != "https://placeholder.supabase.co"
        else {
            assertionFailure(
                "Missing SUPABASE_URL. Copy Config/Secrets.example.xcconfig → "
                + "Config/Secrets.xcconfig and fill in your project values."
            )
            return URL(string: "https://placeholder.supabase.co")!
        }
        return url
    }()

    static let anonKey: String = {
        let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? ""
        if key.isEmpty || key == "placeholder-anon-key" {
            assertionFailure(
                "Missing SUPABASE_ANON_KEY. See Config/Secrets.example.xcconfig."
            )
        }
        return key
    }()
}

/// Singleton holder for the configured `SupabaseClient`.
/// Access via `AppSupabase.client` throughout the app.
enum AppSupabase {
    static let client = SupabaseClient(
        supabaseURL: SupabaseConfig.url,
        supabaseKey: SupabaseConfig.anonKey,
        options: SupabaseClientOptions(
            auth: .init(
                emitLocalSessionAsInitialSession: true
            )
        )
    )
}
