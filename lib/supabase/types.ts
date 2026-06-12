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
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          after: Json | null
          before: Json | null
          created_at: string | null
          id: string
          reason: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_emails: {
        Row: {
          created_at: string | null
          email: string
          invited_by: string | null
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          invited_by?: string | null
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          invited_by?: string | null
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "allowed_emails_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          base_points: number | null
          created_at: string | null
          id: string
          match_id: string | null
          odd_multiplier: number | null
          predicted_advancing_team_id: string | null
          predicted_away_score: number
          predicted_home_score: number
          total_points: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_points?: number | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          odd_multiplier?: number | null
          predicted_advancing_team_id?: string | null
          predicted_away_score: number
          predicted_home_score: number
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_points?: number | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          odd_multiplier?: number | null
          predicted_advancing_team_id?: string | null
          predicted_away_score?: number
          predicted_home_score?: number
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_predicted_advancing_team_id_fkey"
            columns: ["predicted_advancing_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      golden_tickets: {
        Row: {
          created_at: string
          id: string
          locked_at: string | null
          predictions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string | null
          predictions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string | null
          predictions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "golden_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          advancing_team_id: string | null
          away_score: number | null
          away_team_id: string | null
          away_tier_at_kickoff: number | null
          bracket_slot: number | null
          deadline_at: string | null
          external_id: string | null
          group_name: string | null
          home_score: number | null
          home_team_id: string | null
          home_tier_at_kickoff: number | null
          id: string
          kickoff_at: string
          last_synced_at: string | null
          manually_edited: boolean | null
          phase: string
          round_number: number | null
          status: string | null
        }
        Insert: {
          advancing_team_id?: string | null
          away_score?: number | null
          away_team_id?: string | null
          away_tier_at_kickoff?: number | null
          bracket_slot?: number | null
          deadline_at?: string | null
          external_id?: string | null
          group_name?: string | null
          home_score?: number | null
          home_team_id?: string | null
          home_tier_at_kickoff?: number | null
          id?: string
          kickoff_at: string
          last_synced_at?: string | null
          manually_edited?: boolean | null
          phase: string
          round_number?: number | null
          status?: string | null
        }
        Update: {
          advancing_team_id?: string | null
          away_score?: number | null
          away_team_id?: string | null
          away_tier_at_kickoff?: number | null
          bracket_slot?: number | null
          deadline_at?: string | null
          external_id?: string | null
          group_name?: string | null
          home_score?: number | null
          home_team_id?: string | null
          home_tier_at_kickoff?: number | null
          id?: string
          kickoff_at?: string
          last_synced_at?: string | null
          manually_edited?: boolean | null
          phase?: string
          round_number?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_advancing_team_id_fkey"
            columns: ["advancing_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          is_admin: boolean | null
          last_rank: number | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          is_admin?: boolean | null
          last_rank?: number | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          last_rank?: number | null
          name?: string
        }
        Relationships: []
      }
      push_queue: {
        Row: {
          created_at: string | null
          dedup_key: string | null
          id: string
          payload: Json
          sent_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dedup_key?: string | null
          id?: string
          payload: Json
          sent_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dedup_key?: string | null
          id?: string
          payload?: Json
          sent_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          current_tier: number
          eliminated: boolean | null
          flag_url: string | null
          id: string
          initial_tier: number
          name: string
        }
        Insert: {
          current_tier: number
          eliminated?: boolean | null
          flag_url?: string | null
          id: string
          initial_tier: number
          name: string
        }
        Update: {
          current_tier?: number
          eliminated?: boolean | null
          flag_url?: string | null
          id?: string
          initial_tier?: number
          name?: string
        }
        Relationships: []
      }
      tier_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          from_tier: number | null
          id: string
          reason: string | null
          team_id: string | null
          to_tier: number | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          from_tier?: number | null
          id?: string
          reason?: string | null
          team_id?: string | null
          to_tier?: number | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          from_tier?: number | null
          id?: string
          reason?: string | null
          team_id?: string | null
          to_tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_cancel_match: {
        Args: { p_admin_id: string; p_match_id: string; p_reason: string }
        Returns: undefined
      }
      admin_trigger_rebalancing: {
        Args: {
          p_admin_id: string
          p_dry_run?: boolean
          p_reason: string
          p_window: string
        }
        Returns: {
          out_avg_score: number
          out_current_tier: number
          out_delta: number
          out_new_tier: number
          out_team_id: string
          out_team_name: string
        }[]
      }
      admin_update_team_tier: {
        Args: {
          p_admin_id: string
          p_new_tier: number
          p_reason: string
          p_team_id: string
        }
        Returns: undefined
      }
      calculate_base_points: {
        Args: { p_bet_id: string; p_match_id: string }
        Returns: number
      }
      calculate_golden_ticket_points: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_odd: {
        Args: { p_away_tier: number; p_home_tier: number; p_result: string }
        Returns: number
      }
      check_deadline_reminders: { Args: never; Returns: number }
      check_email_allowed: { Args: { p_email: string }; Returns: boolean }
      check_signup_eligibility: { Args: { p_email: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      lock_all_golden_tickets: { Args: never; Returns: number }
      process_push_queue: {
        Args: never
        Returns: {
          auth_key: string
          body: string
          endpoint: string
          p256dh: string
          title: string
          url: string
          user_id: string
        }[]
      }
      queue_ranking_notifications: { Args: never; Returns: undefined }
      recalc_finished_bets: { Args: never; Returns: undefined }
      recalc_match_bets: { Args: { p_match_id: string }; Returns: undefined }
      sync_matches_from_api: { Args: never; Returns: undefined }
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
