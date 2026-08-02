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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
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
    Enums: {
      app_role: ["admin", "staff"],
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
