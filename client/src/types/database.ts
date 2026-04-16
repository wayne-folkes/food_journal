/**
 * Hand-written Supabase schema types for the meals redesign.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id kbdtcoyrspyjqjsgkwjl > src/types/database.ts
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          consumed_at: string
          created_at: string
          calories: number | null
        }
        Insert: {
          id?: string
          meal_id: string
          description: string
          position?: number
          consumed_at?: string
          created_at?: string
          calories?: number | null
        }
        Update: {
          description?: string
          position?: number
          consumed_at?: string
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
      food_lookup: {
        Row: {
          description_key: string
          description: string
          calories_per_100g: number | null
          source: string
          usda_fdc_id: number | null
          created_at: string
        }
        Insert: {
          description_key: string
          description: string
          calories_per_100g?: number | null
          source?: string
          usda_fdc_id?: number | null
          created_at?: string
        }
        Update: {
          description?: string
          calories_per_100g?: number | null
          source?: string
          usda_fdc_id?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_meals_with_items_batch: {
        Args: {
          p_meals: Json
        }
        Returns: Json
      }
      create_meal_with_items: {
        Args: {
          p_meal_type: MealType
          p_consumed_at: string
          p_raw_input: string
          p_items: Json
        }
        Returns: Json
      }
      search_meals: {
        Args: {
          p_query: string
        }
        Returns: {
          id: string
          user_id: string | null
          consumed_at: string
          meal_type: MealType
          raw_input: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      update_meal_with_items: {
        Args: {
          p_meal_id: string
          p_meal_type: MealType
          p_consumed_at: string
          p_raw_input: string
          p_items: Json
        }
        Returns: Json
      }
    }
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

export type FoodLookup = Database['public']['Tables']['food_lookup']['Row']
