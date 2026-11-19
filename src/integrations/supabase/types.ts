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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      email_campaign_recipients: {
        Row: {
          attempts: number
          campaign_id: string
          created_at: string
          customer_name: string | null
          email: string
          id: string
          last_error: string | null
          lawful_basis: string
          provider_message_id: string | null
          sent_at: string | null
          service_type: string | null
          status: string
          unsubscribe_token: string
        }
        Insert: {
          attempts?: number
          campaign_id: string
          created_at?: string
          customer_name?: string | null
          email: string
          id?: string
          last_error?: string | null
          lawful_basis: string
          provider_message_id?: string | null
          sent_at?: string | null
          service_type?: string | null
          status?: string
          unsubscribe_token?: string
        }
        Update: {
          attempts?: number
          campaign_id?: string
          created_at?: string
          customer_name?: string | null
          email?: string
          id?: string
          last_error?: string | null
          lawful_basis?: string
          provider_message_id?: string | null
          sent_at?: string | null
          service_type?: string | null
          status?: string
          unsubscribe_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience: Json
          body_html: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          delivered_count: number | null
          failed_count: number
          id: string
          last_test_at: string | null
          last_test_to: string | null
          message_type: string
          name: string
          preview_text: string
          recipient_count: number
          sent_at: string | null
          sent_count: number
          signature_id: string | null
          status: string
          subject: string
          unsubscribed_count: number
          updated_at: string
        }
        Insert: {
          audience?: Json
          body_html?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivered_count?: number | null
          failed_count?: number
          id?: string
          last_test_at?: string | null
          last_test_to?: string | null
          message_type?: string
          name: string
          preview_text?: string
          recipient_count?: number
          sent_at?: string | null
          sent_count?: number
          signature_id?: string | null
          status?: string
          subject?: string
          unsubscribed_count?: number
          updated_at?: string
        }
        Update: {
          audience?: Json
          body_html?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          delivered_count?: number | null
          failed_count?: number
          id?: string
          last_test_at?: string | null
          last_test_to?: string | null
          message_type?: string
          name?: string
          preview_text?: string
          recipient_count?: number
          sent_at?: string | null
          sent_count?: number
          signature_id?: string | null
          status?: string
          subject?: string
          unsubscribed_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "email_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      email_consents: {
        Row: {
          consent_type: string
          consented_at: string
          email: string
          evidence: string | null
          expires_at: string | null
          id: string
          recorded_at: string
          recorded_by: string | null
          source: string
        }
        Insert: {
          consent_type: string
          consented_at: string
          email: string
          evidence?: string | null
          expires_at?: string | null
          id?: string
          recorded_at?: string
          recorded_by?: string | null
          source: string
        }
        Update: {
          consent_type?: string
          consented_at?: string
          email?: string
          evidence?: string | null
          expires_at?: string | null
          id?: string
          recorded_at?: string
          recorded_by?: string | null
          source?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          facebook_review_url: string | null
          google_review_url: string | null
          id: boolean
          mailing_address: string | null
          reply_to: string | null
          sender_email: string | null
          sender_name: string
          test_recipients: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          facebook_review_url?: string | null
          google_review_url?: string | null
          id?: boolean
          mailing_address?: string | null
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string
          test_recipients?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          facebook_review_url?: string | null
          google_review_url?: string | null
          id?: boolean
          mailing_address?: string | null
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string
          test_recipients?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_signatures: {
        Row: {
          address: string | null
          brand_color: string
          company_name: string | null
          created_at: string
          created_by: string | null
          custom_html: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_default: boolean
          job_title: string | null
          name: string
          phone: string | null
          sender_name: string | null
          show_logo: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          custom_html?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_default?: boolean
          job_title?: string | null
          name: string
          phone?: string | null
          sender_name?: string | null
          show_logo?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          custom_html?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_default?: boolean
          job_title?: string | null
          name?: string
          phone?: string | null
          sender_name?: string | null
          show_logo?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string
          reason: string
          source: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email: string
          reason: string
          source?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string
          reason?: string
          source?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          preview_text: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          preview_text?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          preview_text?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_report_versions: {
        Row: {
          change_note: string | null
          currency: string
          data: Json
          highlights: string
          id: string
          period_month: number
          period_year: number
          published_at: string
          published_by: string | null
          published_by_email: string | null
          report_id: string
          version: number
        }
        Insert: {
          change_note?: string | null
          currency: string
          data: Json
          highlights?: string
          id?: string
          period_month: number
          period_year: number
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          report_id: string
          version: number
        }
        Update: {
          change_note?: string | null
          currency?: string
          data?: Json
          highlights?: string
          id?: string
          period_month?: number
          period_year?: number
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          report_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "marketing_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_reports: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          currency: string
          current_version: number
          data: Json
          has_unpublished_changes: boolean
          highlights: string
          id: string
          period_month: number
          period_year: number
          published_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          updated_by_email: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          currency?: string
          current_version?: number
          data?: Json
          has_unpublished_changes?: boolean
          highlights?: string
          id?: string
          period_month: number
          period_year: number
          published_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          currency?: string
          current_version?: number
          data?: Json
          has_unpublished_changes?: boolean
          highlights?: string
          id?: string
          period_month?: number
          period_year?: number
          published_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Relationships: []
      }
      quote_conversion_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          new_status: string
          note: string | null
          previous_status: string | null
          quote_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_status: string
          note?: string | null
          previous_status?: string | null
          quote_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_status?: string
          note?: string | null
          previous_status?: string | null
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_conversion_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_files: {
        Row: {
          created_at: string
          file_category: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          quote_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_category?: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          quote_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_category?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          quote_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_files_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["quote_status"]
          note: string | null
          previous_status: Database["public"]["Enums"]["quote_status"] | null
          quote_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["quote_status"]
          note?: string | null
          previous_status?: Database["public"]["Enums"]["quote_status"] | null
          quote_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["quote_status"]
          note?: string | null
          previous_status?: Database["public"]["Enums"]["quote_status"] | null
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_submission_log: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          adas_required_review: boolean
          assigned_to: string | null
          best_contact_time: string | null
          contact_consent: boolean
          conversion_changed_at: string | null
          conversion_changed_by: string | null
          conversion_status: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          damage_cause: string | null
          damage_details: Json
          glass_area: string | null
          id: string
          insurance_details: Json
          insurance_method: string | null
          internal_notes: string | null
          landing_page: string | null
          licence_plate: string | null
          marketing_consent: boolean
          preferred_contact_method: string | null
          preferred_date: string | null
          preferred_time: string | null
          preferred_urgency: string | null
          priority: Database["public"]["Enums"]["quote_priority"]
          public_reference: string
          referrer: string | null
          requested_service: string | null
          service_address: Json
          service_location_type: string | null
          status: Database["public"]["Enums"]["quote_status"]
          submission_user_agent: string | null
          submitted_ip_hash: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vehicle_body_style: string | null
          vehicle_features: Json
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_year: string | null
          vin: string | null
        }
        Insert: {
          adas_required_review?: boolean
          assigned_to?: string | null
          best_contact_time?: string | null
          contact_consent?: boolean
          conversion_changed_at?: string | null
          conversion_changed_by?: string | null
          conversion_status?: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          damage_cause?: string | null
          damage_details?: Json
          glass_area?: string | null
          id?: string
          insurance_details?: Json
          insurance_method?: string | null
          internal_notes?: string | null
          landing_page?: string | null
          licence_plate?: string | null
          marketing_consent?: boolean
          preferred_contact_method?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          preferred_urgency?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"]
          public_reference: string
          referrer?: string | null
          requested_service?: string | null
          service_address?: Json
          service_location_type?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          submission_user_agent?: string | null
          submitted_ip_hash?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vehicle_body_style?: string | null
          vehicle_features?: Json
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: string | null
          vin?: string | null
        }
        Update: {
          adas_required_review?: boolean
          assigned_to?: string | null
          best_contact_time?: string | null
          contact_consent?: boolean
          conversion_changed_at?: string | null
          conversion_changed_by?: string | null
          conversion_status?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          damage_cause?: string | null
          damage_details?: Json
          glass_area?: string | null
          id?: string
          insurance_details?: Json
          insurance_method?: string | null
          internal_notes?: string | null
          landing_page?: string | null
          licence_plate?: string | null
          marketing_consent?: boolean
          preferred_contact_method?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          preferred_urgency?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"]
          public_reference?: string
          referrer?: string | null
          requested_service?: string | null
          service_address?: Json
          service_location_type?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          submission_user_agent?: string | null
          submitted_ip_hash?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vehicle_body_style?: string | null
          vehicle_features?: Json
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: string | null
          vin?: string | null
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
      filtered_reporting_quotes: {
        Args: { filters?: Json }
        Returns: {
          adas_required_review: boolean
          assigned_to: string | null
          best_contact_time: string | null
          contact_consent: boolean
          conversion_changed_at: string | null
          conversion_changed_by: string | null
          conversion_status: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          damage_cause: string | null
          damage_details: Json
          glass_area: string | null
          id: string
          insurance_details: Json
          insurance_method: string | null
          internal_notes: string | null
          landing_page: string | null
          licence_plate: string | null
          marketing_consent: boolean
          preferred_contact_method: string | null
          preferred_date: string | null
          preferred_time: string | null
          preferred_urgency: string | null
          priority: Database["public"]["Enums"]["quote_priority"]
          public_reference: string
          referrer: string | null
          requested_service: string | null
          service_address: Json
          service_location_type: string | null
          status: Database["public"]["Enums"]["quote_status"]
          submission_user_agent: string | null
          submitted_ip_hash: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vehicle_body_style: string | null
          vehicle_features: Json
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_year: string | null
          vin: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_operator: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      marketing_quote_stats: {
        Args: { _month: number; _year: number }
        Returns: Json
      }
      phone_region_code: { Args: { phone: string }; Returns: string }
      publish_marketing_report: {
        Args: { _note: string; _report_id: string }
        Returns: Json
      }
      quote_reporting: {
        Args: {
          filters?: Json
          report_mode?: string
          row_limit?: number
          row_offset?: number
          selected_ids?: string[]
        }
        Returns: Json
      }
      set_quote_conversion: {
        Args: { _new_status: string; _note?: string; _quote_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "marketing"
      quote_priority: "urgent" | "high" | "normal" | "low"
      quote_status:
        | "new"
        | "contacted"
        | "awaiting-information"
        | "estimating"
        | "quote-sent"
        | "appointment-requested"
        | "booked"
        | "completed"
        | "lost"
        | "spam"
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
      app_role: ["admin", "staff", "marketing"],
      quote_priority: ["urgent", "high", "normal", "low"],
      quote_status: [
        "new",
        "contacted",
        "awaiting-information",
        "estimating",
        "quote-sent",
        "appointment-requested",
        "booked",
        "completed",
        "lost",
        "spam",
      ],
    },
  },
} as const
