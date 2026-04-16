/**
 * Hand-written Supabase schema types for the meals redesign.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id kbdtcoyrspyjqjsgkwjl > src/types/database.ts
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink'

export type Database = {
  public: {
    Tables: {
      meals: {
        Row: {
          id: string
          user_id: string | null
          consumed_at: string
          meal_type: MealType
          raw_input: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          consumed_at?: string
          meal_type?: MealType
          raw_input?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          consumed_at?: string
          meal_type?: MealType
          raw_input?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          id: string
          meal_id: string
          description: string
          position: number
          created_at: string
          calories: number | null
        }
        Insert: {
          id?: string
          meal_id: string
          description: string
          position?: number
          created_at?: string
          calories?: number | null
        }
        Update: {
          description?: string
          position?: number
          calories?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'meal_items_meal_id_fkey'
            columns: ['meal_id']
            referencedRelation: 'meals'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      meal_type: MealType
    }
    CompositeTypes: Record<string, never>
  }
}

export type Meal = Database['public']['Tables']['meals']['Row']
export type MealInsert = Database['public']['Tables']['meals']['Insert']
export type MealUpdate = Database['public']['Tables']['meals']['Update']

export type MealItem = Database['public']['Tables']['meal_items']['Row']
export type MealItemInsert = Database['public']['Tables']['meal_items']['Insert']

/** A meal with its items eagerly loaded — the primary working type. */
export type MealWithItems = Meal & { items: MealItem[] }
