export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      couples: {
        Row: {
          code: string
          created_at: string
          id: string
          started_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          started_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          started_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          author_id: string
          couple_id: string
          created_at: string
          id: string
          raw: string
          reformulated: string | null
          shared_at: string | null
          tag: string
          will_share: boolean
        }
        Insert: {
          author_id: string
          couple_id: string
          created_at?: string
          id?: string
          raw: string
          reformulated?: string | null
          shared_at?: string | null
          tag: string
          will_share?: boolean
        }
        Update: {
          author_id?: string
          couple_id?: string
          created_at?: string
          id?: string
          raw?: string
          reformulated?: string | null
          shared_at?: string | null
          tag?: string
          will_share?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "entries_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      friday_answers: {
        Row: {
          author_id: string
          gratitude: string
          id: string
          question_answer: string
          ritual_id: string
          submitted_at: string
        }
        Insert: {
          author_id: string
          gratitude: string
          id?: string
          question_answer: string
          ritual_id: string
          submitted_at?: string
        }
        Update: {
          author_id?: string
          gratitude?: string
          id?: string
          question_answer?: string
          ritual_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friday_answers_ritual_id_fkey"
            columns: ["ritual_id"]
            isOneToOne: false
            referencedRelation: "friday_rituals"
            referencedColumns: ["id"]
          },
        ]
      }
      friday_rituals: {
        Row: {
          couple_id: string
          id: string
          question: string
          week_key: string
        }
        Insert: {
          couple_id: string
          id?: string
          question: string
          week_key: string
        }
        Update: {
          couple_id?: string
          id?: string
          question?: string
          week_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "friday_rituals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          couple_id: string
          created_at: string
          display_name: string
          id: string
          pin: string
          slot: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          display_name: string
          id?: string
          pin: string
          slot: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          display_name?: string
          id?: string
          pin?: string
          slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_moments: {
        Row: {
          body: string | null
          couple_id: string
          created_at: string
          id: string
          kind: string
          title: string
        }
        Insert: {
          body?: string | null
          couple_id: string
          created_at?: string
          id?: string
          kind: string
          title: string
        }
        Update: {
          body?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_moments_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      pact_rules: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string | null
          id: string
          text: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          text: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pact_rules_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_events: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          kind: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          kind: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      both_answered: { Args: { _ritual_id: string }; Returns: boolean }
      create_couple: {
        Args: { _code: string; _display_name: string; _pin: string }
        Returns: {
          code: string
          couple_id: string
          member_id: string
        }[]
      }
      current_couple_id: { Args: never; Returns: string }
      is_couple_member: { Args: { _couple_id: string }; Returns: boolean }
      join_couple: {
        Args: { _code: string; _display_name: string; _pin: string }
        Returns: {
          couple_id: string
          member_id: string
        }[]
      }
      join_couple_by_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
