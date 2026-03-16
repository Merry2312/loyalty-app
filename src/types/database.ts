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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      contact_identifiers: {
        Row: {
          created_at: string
          id: string
          identifier: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      loyalty_cards: {
        Row: {
          contact_identifier_id: string
          created_at: string
          id: string
          last_stamped_at: string | null
          merchant_id: string
          stamp_count: number
        }
        Insert: {
          contact_identifier_id: string
          created_at?: string
          id?: string
          last_stamped_at?: string | null
          merchant_id: string
          stamp_count?: number
        }
        Update: {
          contact_identifier_id?: string
          created_at?: string
          id?: string
          last_stamped_at?: string | null
          merchant_id?: string
          stamp_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_contact_identifier_id_fkey"
            columns: ["contact_identifier_id"]
            isOneToOne: false
            referencedRelation: "contact_identifiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_staff: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          brand_color: string
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          stamp_icon_url: string | null
        }
        Insert: {
          brand_color?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          stamp_icon_url?: string | null
        }
        Update: {
          brand_color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          stamp_icon_url?: string | null
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          loyalty_card_id: string
          redeemed_at: string
          redeemed_by: string
          stamp_rule_id: string
        }
        Insert: {
          id?: string
          loyalty_card_id: string
          redeemed_at?: string
          redeemed_by: string
          stamp_rule_id: string
        }
        Update: {
          id?: string
          loyalty_card_id?: string
          redeemed_at?: string
          redeemed_by?: string
          stamp_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_stamp_rule_id_fkey"
            columns: ["stamp_rule_id"]
            isOneToOne: false
            referencedRelation: "stamp_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      stamp_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          reward_description: string
          stamps_required: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          reward_description: string
          stamps_required?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          reward_description?: string
          stamps_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "stamp_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      stamps: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          loyalty_card_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          loyalty_card_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          loyalty_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamps_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_stamps: {
        Args: { p_identifier: string; p_user_id: string }
        Returns: number
      }
      is_merchant_staff: { Args: { p_merchant_id: string }; Returns: boolean }
      issue_stamp: {
        Args: { p_identifier: string; p_merchant_id: string }
        Returns: Json
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
