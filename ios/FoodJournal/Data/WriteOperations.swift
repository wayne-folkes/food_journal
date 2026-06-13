import Foundation
import SwiftData

// MARK: - Input types

struct MealItemInput {
    let description: String
    let calories: Double?
}

// MARK: - Write operations

extension MealsRepository {
    // MARK: Create

    /// Creates a meal locally (optimistic), then attempts to sync to Supabase.
    /// If offline or unauthenticated, the meal is kept with `pendingSync = true`.
    @discardableResult
    static func createMeal(
        type: MealType,
        items: [MealItemInput],
        consumedAt: Date,
        context: ModelContext,
        historyStore: ItemHistoryStore
    ) async throws -> Meal {
        let now = Date()
        let userId = AppSupabase.client.auth.currentUser?.id.uuidString
        let tempId = UUID().uuidString
        let rawInput = items.map(\.description).joined(separator: ", ")

        let meal = Meal(
            id: tempId,
            userId: userId,
            consumedAt: consumedAt,
            mealType: type,
            rawInput: rawInput,
            createdAt: now,
            updatedAt: now
        )
        meal.items = items.enumerated().map { idx, item in
            MealItem(
                id: UUID().uuidString,
                descriptionText: item.description,
                position: idx,
                consumedAt: consumedAt,
                createdAt: now,
                calories: item.calories,
                qty: nil
            )
        }
        meal.pendingSync = true
        context.insert(meal)
        try context.save()

        // Keep item history fresh immediately (don't wait for remote sync)
        for item in items { historyStore.prepend(item.description) }

        // Attempt remote create now; failures leave pendingSync = true for later flush
        let finalMeal: Meal
        if userId != nil {
            finalMeal = await pushSingleMeal(meal, context: context)
        } else {
            finalMeal = meal
        }

        // Estimate calories in the background — Foundation Models updates SwiftData + Supabase
        Task { await CaloriesService.estimateIfNeeded(for: finalMeal, context: context) }

        // Invalidate day cache so next loadDay re-fetches
        loadedDayKeys.remove(consumedAt.dayKey)

        return finalMeal
    }

    // MARK: Update

    static func updateMeal(
        _ meal: Meal,
        type: MealType,
        items: [MealItemInput],
        consumedAt: Date,
        context: ModelContext
    ) async throws {
        let now = Date()
        let oldDate = meal.consumedAt
        let rawInput = items.map(\.description).joined(separator: ", ")

        meal.mealTypeRaw = type.rawValue
        meal.consumedAt = consumedAt
        meal.rawInput = rawInput
        meal.updatedAt = now
        meal.pendingSync = true
        for item in meal.items { context.delete(item) }
        meal.items = items.enumerated().map { idx, item in
            MealItem(
                id: UUID().uuidString,
                descriptionText: item.description,
                position: idx,
                consumedAt: consumedAt,
                createdAt: now,
                calories: item.calories,
                qty: nil
            )
        }
        try context.save()

        guard AppSupabase.client.auth.currentSession != nil else {
            // Guest: estimate immediately after local save
            Task { await CaloriesService.estimateIfNeeded(for: meal, context: context) }
            return
        }

        // Encode items for the RPC
        struct RpcItem: Encodable {
            let description: String
            let position: Int
            let consumed_at: String
            let calories: Double?
        }
        let rpcItems = items.enumerated().map { idx, item in
            RpcItem(
                description: item.description,
                position: idx,
                consumed_at: consumedAt.formatted(.iso8601),
                calories: item.calories
            )
        }
        struct UpdateParams: Encodable {
            let p_meal_id: String
            let p_meal_type: String
            let p_consumed_at: String
            let p_raw_input: String
            let p_items: [RpcItem]
        }

        do {
            let dto: MealDTO = try await AppSupabase.client
                .rpc("update_meal_with_items", params: UpdateParams(
                    p_meal_id: meal.id,
                    p_meal_type: type.rawValue,
                    p_consumed_at: consumedAt.formatted(.iso8601),
                    p_raw_input: rawInput,
                    p_items: rpcItems
                ))
                .execute()
                .value

            // Reconcile with server-returned data
            meal.updatedAt = dto.updatedAt
            meal.pendingSync = false
            try context.save()
        } catch {
            print("❌ updateMeal: RPC failed — \(error)")
        }

        loadedDayKeys.remove(oldDate.dayKey)
        loadedDayKeys.remove(consumedAt.dayKey)

        // Estimate after RPC so CaloriesService targets the fresh server items by position
        Task { await CaloriesService.estimateIfNeeded(for: meal, context: context) }
    }

    // MARK: Delete

    /// Deletes a meal from SwiftData. Returns a snapshot for undo. The actual
    /// remote delete is deferred so callers can cancel it (undo pattern).
    @discardableResult
    static func deleteMealLocally(_ meal: Meal, context: ModelContext) throws -> MealSnapshot {
        let snapshot = MealSnapshot(meal: meal)
        context.delete(meal)
        try context.save()
        loadedDayKeys.remove(snapshot.consumedAt.dayKey)
        return snapshot
    }

    static func deleteMealRemotely(id: String) async {
        guard AppSupabase.client.auth.currentSession != nil else { return }
        _ = try? await AppSupabase.client
            .from("meals")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    static func restoreMeal(from snapshot: MealSnapshot, context: ModelContext) throws {
        let meal = snapshot.toMeal()
        context.insert(meal)
        try context.save()
    }

    // MARK: - Offline flush

    /// Pushes a single newly-created meal to Supabase and swaps the local temp
    /// UUID for the server-assigned one on success. Returns the canonical meal
    /// (server-returned on success, unchanged local meal on failure).
    @discardableResult
    private static func pushSingleMeal(_ meal: Meal, context: ModelContext) async -> Meal {
        struct RpcItem: Encodable {
            let description: String
            let position: Int
            let consumed_at: String
            let calories: Double?
        }
        struct CreateParams: Encodable {
            let p_meal_type: String
            let p_consumed_at: String
            let p_raw_input: String
            let p_items: [RpcItem]
        }

        let rpcItems = meal.sortedItems.map { item in
            RpcItem(
                description: item.descriptionText,
                position: item.position,
                consumed_at: item.consumedAt.formatted(.iso8601),
                calories: item.calories
            )
        }

        do {
            let dto: MealDTO = try await AppSupabase.client
                .rpc("create_meal_with_items", params: CreateParams(
                    p_meal_type: meal.mealTypeRaw,
                    p_consumed_at: meal.consumedAt.formatted(.iso8601),
                    p_raw_input: meal.rawInput,
                    p_items: rpcItems
                ))
                .execute()
                .value

            // Swap temp local meal for the server-returned one
            context.delete(meal)
            let serverMeal = Meal(
                id: dto.id,
                userId: dto.userId,
                consumedAt: dto.consumedAt,
                mealType: dto.mealType,
                rawInput: dto.rawInput,
                createdAt: dto.createdAt,
                updatedAt: dto.updatedAt
            )
            serverMeal.items = dto.mealItems.map { item in
                MealItem(
                    id: item.id,
                    descriptionText: item.description,
                    position: item.position,
                    consumedAt: item.consumedAt,
                    createdAt: item.createdAt,
                    calories: item.calories,
                    qty: item.qty
                )
            }
            serverMeal.pendingSync = false
            context.insert(serverMeal)
            try? context.save()
            return serverMeal
        } catch {
            // Keep pendingSync = true; flushPendingSync will retry later
            return meal
        }
    }

    /// Flushes all meals with pendingSync == true that belong to the current
    /// user. Called on foreground / network recovery.
    static func flushPendingSync(context: ModelContext) async {
        guard let userId = AppSupabase.client.auth.currentUser?.id.uuidString else { return }

        guard let pending = try? context.fetch(
            FetchDescriptor<Meal>(
                predicate: #Predicate { $0.pendingSync == true && $0.userId == userId }
            )
        ), !pending.isEmpty else { return }

        for meal in pending {
            await pushSingleMeal(meal, context: context)
        }
    }

    /// Sign-in sync: flush guest meals (userId == nil) to Supabase after sign-in.
    /// Mirrors `syncLocalToRemote` in the web store.
    static func syncGuestMealsAfterSignIn(newUserId: String, context: ModelContext) async {
        guard let guestMeals = try? context.fetch(
            FetchDescriptor<Meal>(
                predicate: #Predicate { $0.userId == nil }
            )
        ), !guestMeals.isEmpty else { return }

        struct BatchItem: Encodable {
            let description: String
            let position: Int
            let consumed_at: String
            let calories: Double?
        }
        struct BatchMeal: Encodable {
            let local_id: String
            let meal_type: String
            let consumed_at: String
            let raw_input: String
            let items: [BatchItem]
        }
        struct BatchParams: Encodable { let p_meals: [BatchMeal] }

        let payload = guestMeals.map { meal in
            BatchMeal(
                local_id: meal.id,
                meal_type: meal.mealTypeRaw,
                consumed_at: meal.consumedAt.formatted(.iso8601),
                raw_input: meal.rawInput,
                items: meal.sortedItems.map { item in
                    BatchItem(
                        description: item.descriptionText,
                        position: item.position,
                        consumed_at: item.consumedAt.formatted(.iso8601),
                        calories: item.calories
                    )
                }
            )
        }

        struct SyncedRow: Decodable {
            let local_id: String
            let meal: MealDTO?
        }

        guard let rows: [SyncedRow] = try? await AppSupabase.client
            .rpc("create_meals_with_items_batch", params: BatchParams(p_meals: payload))
            .execute()
            .value
        else { return }

        for row in rows {
            guard let dto = row.meal else { continue }
            // Remove guest meal and insert server-owned one
            if let local = guestMeals.first(where: { $0.id == row.local_id }) {
                context.delete(local)
            }
            let serverMeal = Meal(
                id: dto.id,
                userId: dto.userId,
                consumedAt: dto.consumedAt,
                mealType: dto.mealType,
                rawInput: dto.rawInput,
                createdAt: dto.createdAt,
                updatedAt: dto.updatedAt
            )
            serverMeal.items = dto.mealItems.map { item in
                MealItem(
                    id: item.id,
                    descriptionText: item.description,
                    position: item.position,
                    consumedAt: item.consumedAt,
                    createdAt: item.createdAt,
                    calories: item.calories,
                    qty: item.qty
                )
            }
            serverMeal.pendingSync = false
            context.insert(serverMeal)
        }

        try? context.save()
        loadedDayKeys.removeAll()
        loadedWeekKeys.removeAll()
    }
}

// MARK: - Snapshot (for undo delete)

/// A value-type copy of a Meal used for the undo-delete pattern.
struct MealSnapshot {
    let id: String
    let userId: String?
    let consumedAt: Date
    let mealType: MealType
    let rawInput: String
    let createdAt: Date
    let updatedAt: Date
    let items: [ItemSnapshot]

    struct ItemSnapshot {
        let id: String
        let description: String
        let position: Int
        let consumedAt: Date
        let createdAt: Date
        let calories: Double?
        let qty: String?
    }

    init(meal: Meal) {
        id = meal.id
        userId = meal.userId
        consumedAt = meal.consumedAt
        mealType = meal.mealType
        rawInput = meal.rawInput
        createdAt = meal.createdAt
        updatedAt = meal.updatedAt
        items = meal.sortedItems.map {
            ItemSnapshot(
                id: $0.id,
                description: $0.descriptionText,
                position: $0.position,
                consumedAt: $0.consumedAt,
                createdAt: $0.createdAt,
                calories: $0.calories,
                qty: $0.qty
            )
        }
    }

    func toMeal() -> Meal {
        let meal = Meal(
            id: id,
            userId: userId,
            consumedAt: consumedAt,
            mealType: mealType,
            rawInput: rawInput,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
        meal.items = items.map { snap in
            MealItem(
                id: snap.id,
                descriptionText: snap.description,
                position: snap.position,
                consumedAt: snap.consumedAt,
                createdAt: snap.createdAt,
                calories: snap.calories,
                qty: snap.qty
            )
        }
        return meal
    }
}
