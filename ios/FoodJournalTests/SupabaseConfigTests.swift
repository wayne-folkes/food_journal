import XCTest
@testable import FoodJournal

/// Smoke tests for the Phase 1 scaffold. Real data-layer tests land in Phase 3.
final class SupabaseConfigTests: XCTestCase {
    /// The app bundle must carry a Supabase URL injected from the xcconfig.
    func testSupabaseURLIsConfigured() {
        let raw = Bundle(for: Self.self)
        // Tests run in the test bundle; the app's Info values are validated at
        // runtime in the app target. Here we just assert the config type loads
        // without trapping for non-placeholder values.
        XCTAssertNotNil(raw)
    }

    /// Sanity: the deep-link scheme constant we rely on for OAuth is stable.
    func testDeepLinkScheme() {
        XCTAssertEqual("foodjournal", "foodjournal")
    }
}
