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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          connected_address: string | null
          created_at: string
          custody_address: string | null
          display_name: string | null
          fid: number
          pfp_url: string | null
          updated_at: string
          username: string
        }
        Insert: {
          connected_address?: string | null
          created_at?: string
          custody_address?: string | null
          display_name?: string | null
          fid: number
          pfp_url?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          connected_address?: string | null
          created_at?: string
          custody_address?: string | null
          display_name?: string | null
          fid?: number
          pfp_url?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      super_tip_configs: {
        Row: {
          amount: number
          created_at: string
          fid: number
          id: string
          is_enabled: boolean
          token_address: string
          token_symbol: string
          trigger_phrase: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          fid: number
          id?: string
          is_enabled?: boolean
          token_address: string
          token_symbol: string
          trigger_phrase: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fid?: number
          id?: string
          is_enabled?: boolean
          token_address?: string
          token_symbol?: string
          trigger_phrase?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_tip_configs_fid_fkey"
            columns: ["fid"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["fid"]
          },
        ]
      }
      tip_configs: {
        Row: {
          amount: number
          created_at: string
          fid: number
          id: string
          interaction_type: string
          is_enabled: boolean
          token_address: string
          token_symbol: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          fid: number
          id?: string
          interaction_type: string
          is_enabled?: boolean
          token_address: string
          token_symbol: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fid?: number
          id?: string
          interaction_type?: string
          is_enabled?: boolean
          token_address?: string
          token_symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_configs_fid_fkey"
            columns: ["fid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["fid"]
          },
        ]
      }
      token_approvals: {
        Row: {
          approved_amount: number
          approved_at: string
          contract_address: string
          fid: number
          id: string
          spent_amount: number
          token_address: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          approved_amount: number
          approved_at?: string
          contract_address: string
          fid: number
          id?: string
          spent_amount?: number
          token_address: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number
          approved_at?: string
          contract_address?: string
          fid?: number
          id?: string
          spent_amount?: number
          token_address?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          cast_hash: string | null
          created_at: string
          error_message: string | null
          from_fid: number
          id: string
          interaction_type: string
          status: string
          to_fid: number
          token_address: string
          token_symbol: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cast_hash?: string | null
          created_at?: string
          error_message?: string | null
          from_fid: number
          id?: string
          interaction_type: string
          status?: string
          to_fid: number
          token_address: string
          token_symbol: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cast_hash?: string | null
          created_at?: string
          error_message?: string | null
          from_fid?: number
          id?: string
          interaction_type?: string
          status?: string
          to_fid?: number
          token_address?: string
          token_symbol?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
