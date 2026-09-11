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
      app_settings: {
        Row: {
          discord_invite_url: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          discord_invite_url?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          discord_invite_url?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      license_seats: {
        Row: {
          created_at: string
          first_used_at: string
          id: string
          last_used_at: string
          license_id: string
          player_key: string
          player_name: string | null
          player_user_id: string | null
        }
        Insert: {
          created_at?: string
          first_used_at?: string
          id?: string
          last_used_at?: string
          license_id: string
          player_key: string
          player_name?: string | null
          player_user_id?: string | null
        }
        Update: {
          created_at?: string
          first_used_at?: string
          id?: string
          last_used_at?: string
          license_id?: string
          player_key?: string
          player_name?: string | null
          player_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_seats_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "script_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          currency: string
          delivered_keys: Json
          discord_tag: string | null
          id: string
          items: Json
          paypal_order_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string
          delivered_keys?: Json
          discord_tag?: string | null
          id?: string
          items?: Json
          paypal_order_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string
          delivered_keys?: Json
          discord_tag?: string | null
          id?: string
          items?: Json
          paypal_order_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      player_bans: {
        Row: {
          appeal_url: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          ip_hash: string | null
          is_active: boolean
          license_id: string | null
          player_name: string | null
          player_user_id: string | null
          reason: string
          scope: Database["public"]["Enums"]["ban_scope"]
          script_id: string | null
          updated_at: string
        }
        Insert: {
          appeal_url?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          ip_hash?: string | null
          is_active?: boolean
          license_id?: string | null
          player_name?: string | null
          player_user_id?: string | null
          reason?: string
          scope?: Database["public"]["Enums"]["ban_scope"]
          script_id?: string | null
          updated_at?: string
        }
        Update: {
          appeal_url?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          ip_hash?: string | null
          is_active?: boolean
          license_id?: string | null
          player_name?: string | null
          player_user_id?: string | null
          reason?: string
          scope?: Database["public"]["Enums"]["ban_scope"]
          script_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_bans_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "script_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_bans_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      player_history: {
        Row: {
          connection_count: number
          created_at: string
          executor_name: string | null
          first_seen_at: string
          id: string
          ip_hash: string | null
          is_watchlisted: boolean
          job_id: string | null
          last_script_id: string | null
          last_seen_at: string
          notes: string | null
          pending_kick_reason: string | null
          pending_message: string | null
          place_id: string | null
          player_key: string
          player_name: string | null
          player_user_id: string | null
          presence_checked_at: string | null
          presence_last_location: string | null
          presence_type: number | null
          root_place_id: string | null
          universe_id: string | null
          updated_at: string
        }
        Insert: {
          connection_count?: number
          created_at?: string
          executor_name?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          is_watchlisted?: boolean
          job_id?: string | null
          last_script_id?: string | null
          last_seen_at?: string
          notes?: string | null
          pending_kick_reason?: string | null
          pending_message?: string | null
          place_id?: string | null
          player_key: string
          player_name?: string | null
          player_user_id?: string | null
          presence_checked_at?: string | null
          presence_last_location?: string | null
          presence_type?: number | null
          root_place_id?: string | null
          universe_id?: string | null
          updated_at?: string
        }
        Update: {
          connection_count?: number
          created_at?: string
          executor_name?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          is_watchlisted?: boolean
          job_id?: string | null
          last_script_id?: string | null
          last_seen_at?: string
          notes?: string | null
          pending_kick_reason?: string | null
          pending_message?: string | null
          place_id?: string | null
          player_key?: string
          player_name?: string | null
          player_user_id?: string | null
          presence_checked_at?: string | null
          presence_last_location?: string | null
          presence_type?: number | null
          root_place_id?: string | null
          universe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_history_last_script_id_fkey"
            columns: ["last_script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_licenses: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          label: string
          license_key: string
          redeemed_at: string | null
          redeemed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes: number
          id?: string
          label?: string
          license_key: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          label?: string
          license_key?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          cta_label: string
          cta_url: string | null
          currency: string
          emoji: string
          highlight: boolean
          id: string
          is_published: boolean
          license_duration_minutes: number | null
          name: string
          perks: string[]
          price_cents: number
          price_label: string
          requires_script_choice: boolean
          sort_order: number
          subtitle: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          cta_url?: string | null
          currency?: string
          emoji?: string
          highlight?: boolean
          id?: string
          is_published?: boolean
          license_duration_minutes?: number | null
          name: string
          perks?: string[]
          price_cents?: number
          price_label?: string
          requires_script_choice?: boolean
          sort_order?: number
          subtitle?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          cta_url?: string | null
          currency?: string
          emoji?: string
          highlight?: boolean
          id?: string
          is_published?: boolean
          license_duration_minutes?: number | null
          name?: string
          perks?: string[]
          price_cents?: number
          price_label?: string
          requires_script_choice?: boolean
          sort_order?: number
          subtitle?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          created_at: string
          display_name: string | null
          id: string
          loader_name: string | null
          premium_expires_at: string | null
          updated_at: string
          username: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          display_name?: string | null
          id: string
          loader_name?: string | null
          premium_expires_at?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          account_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          loader_name?: string | null
          premium_expires_at?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      script_licenses: {
        Row: {
          all_scripts: boolean
          bound_player_name: string | null
          bound_player_user_id: string | null
          created_at: string
          created_by: string
          duration_minutes: number | null
          expires_at: string | null
          first_used_at: string | null
          id: string
          label: string
          last_used_at: string | null
          license_key: string
          max_users: number | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          script_id: string
          seat_count: number
          status: Database["public"]["Enums"]["license_status"]
          updated_at: string
          usage_count: number
        }
        Insert: {
          all_scripts?: boolean
          bound_player_name?: string | null
          bound_player_user_id?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          expires_at?: string | null
          first_used_at?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          license_key: string
          max_users?: number | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          script_id: string
          seat_count?: number
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
          usage_count?: number
        }
        Update: {
          all_scripts?: boolean
          bound_player_name?: string | null
          bound_player_user_id?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          expires_at?: string | null
          first_used_at?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          license_key?: string
          max_users?: number | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          script_id?: string
          seat_count?: number
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_licenses_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          license_id: string | null
          message: string
          metadata: Json
          player_name: string | null
          player_user_id: string | null
          script_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          license_id?: string | null
          message?: string
          metadata?: Json
          player_name?: string | null
          player_user_id?: string | null
          script_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          license_id?: string | null
          message?: string
          metadata?: Json
          player_name?: string | null
          player_user_id?: string | null
          script_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_usage_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "script_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_usage_events_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_usage_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "script_usage_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      script_usage_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          executor_name: string | null
          id: string
          ip_hash: string | null
          job_id: string | null
          kick_reason: string | null
          last_seen_at: string
          license_id: string | null
          pending_message: string | null
          place_id: string | null
          player_name: string | null
          player_user_id: string | null
          script_id: string
          session_token: string
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          total_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          executor_name?: string | null
          id?: string
          ip_hash?: string | null
          job_id?: string | null
          kick_reason?: string | null
          last_seen_at?: string
          license_id?: string | null
          pending_message?: string | null
          place_id?: string | null
          player_name?: string | null
          player_user_id?: string | null
          script_id: string
          session_token?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          total_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          executor_name?: string | null
          id?: string
          ip_hash?: string | null
          job_id?: string | null
          kick_reason?: string | null
          last_seen_at?: string
          license_id?: string | null
          pending_message?: string | null
          place_id?: string | null
          player_name?: string | null
          player_user_id?: string | null
          script_id?: string
          session_token?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          total_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_usage_sessions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "script_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_usage_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          created_at: string
          created_by: string
          description: string
          game_url: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          place_id: string | null
          public_id: string
          require_license: boolean
          source_code: string
          universe_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          game_url?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          place_id?: string | null
          public_id?: string
          require_license?: boolean
          source_code?: string
          universe_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          game_url?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          place_id?: string | null
          public_id?: string
          require_license?: boolean
          source_code?: string
          universe_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          badge: string | null
          created_at: string
          currency: string
          description: string
          features: string[]
          id: string
          image_url: string | null
          is_published: boolean
          loader_command: string
          price_cents: number
          price_label: string
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string
          currency?: string
          description?: string
          features?: string[]
          id?: string
          image_url?: string | null
          is_published?: boolean
          loader_command?: string
          price_cents?: number
          price_label?: string
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string
          currency?: string
          description?: string
          features?: string[]
          id?: string
          image_url?: string | null
          is_published?: boolean
          loader_command?: string
          price_cents?: number
          price_label?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      site_faq: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_links: {
        Row: {
          created_at: string
          description: string
          id: string
          is_published: boolean
          label: string
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          label?: string
          platform?: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          label?: string
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      site_reviews: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_tabs: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          label: string
          section_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          label: string
          section_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          label?: string
          section_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_videos: {
        Row: {
          created_at: string
          description: string
          id: string
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          can_manage_bans: boolean
          can_manage_licenses: boolean
          can_manage_scripts: boolean
          can_manage_users: boolean
          can_view_logs: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_bans?: boolean
          can_manage_licenses?: boolean
          can_manage_scripts?: boolean
          can_manage_users?: boolean
          can_view_logs?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_bans?: boolean
          can_manage_licenses?: boolean
          can_manage_scripts?: boolean
          can_manage_users?: boolean
          can_view_logs?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "owner" | "staff" | "member"
      ban_scope: "script" | "global"
      license_status: "active" | "revoked" | "banned" | "expired"
      session_status: "active" | "ended" | "kicked" | "banned" | "error"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "staff", "member"],
      ban_scope: ["script", "global"],
      license_status: ["active", "revoked", "banned", "expired"],
      session_status: ["active", "ended", "kicked", "banned", "error"],
    },
  },
} as const
