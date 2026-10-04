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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_events: {
        Row: {
          action: string
          application_id: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous: string | null
          request: string
          sequence: number
          snapshot: string
        }
        Insert: {
          action: string
          application_id: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous?: string | null
          request: string
          sequence?: number
          snapshot: string
        }
        Update: {
          action?: string
          application_id?: string
          happened_at?: string
          local_date?: string
          operation_id?: string
          owner_id?: string
          previous?: string | null
          request?: string
          sequence?: number
          snapshot?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          checklist: string
          country: string
          created_at: string
          deadline: string | null
          id: string
          institution: string
          link: string
          next_action: string
          notes: string
          opportunity: string
          owner_id: string
          project_title: string
          stage: string
          submission_date: string | null
          submission_task_id: string | null
          supervisor: string
          updated_at: string
          version: number
        }
        Insert: {
          checklist?: string
          country?: string
          created_at: string
          deadline?: string | null
          id: string
          institution: string
          link?: string
          next_action?: string
          notes?: string
          opportunity?: string
          owner_id: string
          project_title?: string
          stage?: string
          submission_date?: string | null
          submission_task_id?: string | null
          supervisor?: string
          updated_at: string
          version?: number
        }
        Update: {
          checklist?: string
          country?: string
          created_at?: string
          deadline?: string | null
          id?: string
          institution?: string
          link?: string
          next_action?: string
          notes?: string
          opportunity?: string
          owner_id?: string
          project_title?: string
          stage?: string
          submission_date?: string | null
          submission_task_id?: string | null
          supervisor?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      day_plans: {
        Row: {
          data: string
          date: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          data: string
          date: string
          owner_id: string
          updated_at: string
          version?: number
        }
        Update: {
          data?: string
          date?: string
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      day_templates: {
        Row: {
          data: string
          id: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          data: string
          id: string
          owner_id: string
          updated_at: string
          version?: number
        }
        Update: {
          data?: string
          id?: string
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          action: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous: string | null
          request: string
          sequence: number
          snapshot: string
          task_id: string
        }
        Insert: {
          action: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous?: string | null
          request: string
          sequence?: number
          snapshot: string
          task_id: string
        }
        Update: {
          action?: string
          happened_at?: string
          local_date?: string
          operation_id?: string
          owner_id?: string
          previous?: string | null
          request?: string
          sequence?: number
          snapshot?: string
          task_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          active_key: string | null
          completion_date: string | null
          created_at: string
          duration_ms: number
          end_at: string | null
          id: string
          owner_id: string
          phone_free: number | null
          remaining_ms: number
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          active_key?: string | null
          completion_date?: string | null
          created_at: string
          duration_ms: number
          end_at?: string | null
          id: string
          owner_id: string
          phone_free?: number | null
          remaining_ms: number
          status: string
          updated_at: string
          version?: number
        }
        Update: {
          active_key?: string | null
          completion_date?: string | null
          created_at?: string
          duration_ms?: number
          end_at?: string | null
          id?: string
          owner_id?: string
          phone_free?: number | null
          remaining_ms?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      habit_events: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous: string | null
          request: string
          sequence: number
          snapshot: string
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous?: string | null
          request: string
          sequence?: number
          snapshot: string
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          happened_at?: string
          local_date?: string
          operation_id?: string
          owner_id?: string
          previous?: string | null
          request?: string
          sequence?: number
          snapshot?: string
        }
        Relationships: []
      }
      habit_records: {
        Row: {
          activity_date: string
          completion_date: string | null
          created_at: string
          data: string
          id: string
          kind: string
          owner_id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          activity_date: string
          completion_date?: string | null
          created_at: string
          data: string
          id: string
          kind: string
          owner_id: string
          status: string
          updated_at: string
          version?: number
        }
        Update: {
          activity_date?: string
          completion_date?: string | null
          created_at?: string
          data?: string
          id?: string
          kind?: string
          owner_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      motivation_settings: {
        Row: {
          data: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          data: string
          owner_id: string
          updated_at: string
          version?: number
        }
        Update: {
          data?: string
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      planning_events: {
        Row: {
          entity_id: string
          entity_type: string
          happened_at: string
          operation_id: string
          owner_id: string
          previous: string | null
          request: string
          sequence: number
          snapshot: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          happened_at: string
          operation_id: string
          owner_id: string
          previous?: string | null
          request: string
          sequence?: number
          snapshot: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          happened_at?: string
          operation_id?: string
          owner_id?: string
          previous?: string | null
          request?: string
          sequence?: number
          snapshot?: string
        }
        Relationships: []
      }
      points_awards: {
        Row: {
          active: number
          activity_date: string
          activity_key: string
          amount: number
          first_awarded_at: string
          id: string
          kind: string
          label: string
          owner_id: string
        }
        Insert: {
          active?: number
          activity_date: string
          activity_key: string
          amount: number
          first_awarded_at: string
          id: string
          kind: string
          label: string
          owner_id: string
        }
        Update: {
          active?: number
          activity_date?: string
          activity_key?: string
          amount?: number
          first_awarded_at?: string
          id?: string
          kind?: string
          label?: string
          owner_id?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          action: string
          activity_date: string | null
          activity_key: string
          delta: number
          event_key: string
          happened_at: string
          label: string
          local_date: string
          owner_id: string
          previous_date: string | null
          sequence: number
        }
        Insert: {
          action: string
          activity_date?: string | null
          activity_key: string
          delta: number
          event_key: string
          happened_at: string
          label: string
          local_date: string
          owner_id: string
          previous_date?: string | null
          sequence?: number
        }
        Update: {
          action?: string
          activity_date?: string | null
          activity_key?: string
          delta?: number
          event_key?: string
          happened_at?: string
          label?: string
          local_date?: string
          owner_id?: string
          previous_date?: string | null
          sequence?: number
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          cost: number
          created_at: string
          id: string
          local_date: string
          name: string
          owner_id: string
          refunded: number
          reward_id: string
          version: number
        }
        Insert: {
          cost: number
          created_at: string
          id: string
          local_date: string
          name: string
          owner_id: string
          refunded?: number
          reward_id: string
          version?: number
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          local_date?: string
          name?: string
          owner_id?: string
          refunded?: number
          reward_id?: string
          version?: number
        }
        Relationships: []
      }
      rewards: {
        Row: {
          archived: number
          cost: number
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          archived?: number
          cost: number
          created_at: string
          description?: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          version?: number
        }
        Update: {
          archived?: number
          cost?: number
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          application_action_key: string | null
          application_id: string | null
          completed_at: string | null
          completed_date: string | null
          created_at: string
          custom_points: number
          due_date: string
          goal: string
          habit_record_id: string | null
          id: string
          kind: string
          minutes: number
          owner_id: string
          title: string
          updated_at: string
          version: number
          workspace_record_id: string | null
        }
        Insert: {
          application_action_key?: string | null
          application_id?: string | null
          completed_at?: string | null
          completed_date?: string | null
          created_at: string
          custom_points?: number
          due_date: string
          goal: string
          habit_record_id?: string | null
          id: string
          kind: string
          minutes: number
          owner_id: string
          title: string
          updated_at: string
          version?: number
          workspace_record_id?: string | null
        }
        Update: {
          application_action_key?: string | null
          application_id?: string | null
          completed_at?: string | null
          completed_date?: string | null
          created_at?: string
          custom_points?: number
          due_date?: string
          goal?: string
          habit_record_id?: string | null
          id?: string
          kind?: string
          minutes?: number
          owner_id?: string
          title?: string
          updated_at?: string
          version?: number
          workspace_record_id?: string | null
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          data: string
          owner_id: string
          updated_at: string
          version: number
          week_start: string
        }
        Insert: {
          data: string
          owner_id: string
          updated_at: string
          version?: number
          week_start: string
        }
        Update: {
          data?: string
          owner_id?: string
          updated_at?: string
          version?: number
          week_start?: string
        }
        Relationships: []
      }
      workspace_catalog: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
          parent_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
          parent_id?: string | null
          updated_at: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      workspace_events: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous: string | null
          request: string
          sequence: number
          snapshot: string
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          happened_at: string
          local_date: string
          operation_id: string
          owner_id: string
          previous?: string | null
          request: string
          sequence?: number
          snapshot: string
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          happened_at?: string
          local_date?: string
          operation_id?: string
          owner_id?: string
          previous?: string | null
          request?: string
          sequence?: number
          snapshot?: string
        }
        Relationships: []
      }
      workspace_records: {
        Row: {
          created_at: string
          data: string
          followup_key: string | null
          id: string
          kind: string
          owner_id: string
          source_record_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at: string
          data: string
          followup_key?: string | null
          id: string
          kind: string
          owner_id: string
          source_record_id?: string | null
          updated_at: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: string
          followup_key?: string | null
          id?: string
          kind?: string
          owner_id?: string
          source_record_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          data: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          data: string
          owner_id: string
          updated_at: string
          version?: number
        }
        Update: {
          data?: string
          owner_id?: string
          updated_at?: string
          version?: number
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
    Enums: {},
  },
} as const
