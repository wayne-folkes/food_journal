/**
 * Hand-written Supabase schema types.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id kbdtcoyrspyjqjsgkwjl > src/types/database.ts
 * after running the migration.
 */
export type Database = {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string
          user_id: string | null
          description: string
          consumed_at: string
          raw_input: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          description: string
          consumed_at: string
          raw_input: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          description?: string
          consumed_at?: string
          raw_input?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Entry = Database['public']['Tables']['entries']['Row']
export type EntryInsert = Database['public']['Tables']['entries']['Insert']
export type EntryUpdate = Database['public']['Tables']['entries']['Update']
