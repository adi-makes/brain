export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_approval_records: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          owner_id: string;
          payload_hash: string;
          proposal_id: string;
          resource_versions: NonNullable<Json>;
          status: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          owner_id: string;
          payload_hash: string;
          proposal_id: string;
          resource_versions?: NonNullable<Json>;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          owner_id?: string;
          payload_hash?: string;
          proposal_id?: string;
          resource_versions?: NonNullable<Json>;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_approval_records_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          byte_size: number;
          created_at: string;
          deleted_at: string | null;
          event_id: string | null;
          id: string;
          mime_type: string;
          note_id: string | null;
          owner_id: string;
          storage_path: string;
          updated_at: string;
          version: number;
          work_item_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          byte_size: number;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          id?: string;
          mime_type: string;
          note_id?: string | null;
          owner_id: string;
          storage_path: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string | null;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          id?: string;
          mime_type?: string;
          note_id?: string | null;
          owner_id?: string;
          storage_path?: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_owner_id_event_id_fkey";
            columns: ["owner_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["owner_id", "id"];
          },
          {
            foreignKeyName: "attachments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_owner_id_note_id_fkey";
            columns: ["owner_id", "note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["owner_id", "id"];
          },
          {
            foreignKeyName: "attachments_owner_id_work_item_id_fkey";
            columns: ["owner_id", "work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      auto_surface_states: {
        Row: {
          created_at: string;
          dismissed_at: string | null;
          eligibility_signature: string;
          owner_id: string;
          restored_at: string | null;
          updated_at: string;
          version: number;
          work_item_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dismissed_at?: string | null;
          eligibility_signature?: string;
          owner_id: string;
          restored_at?: string | null;
          updated_at?: string;
          version?: number;
          work_item_id: string;
        };
        Update: {
          created_at?: string;
          dismissed_at?: string | null;
          eligibility_signature?: string;
          owner_id?: string;
          restored_at?: string | null;
          updated_at?: string;
          version?: number;
          work_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "auto_surface_states_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auto_surface_states_owner_id_work_item_id_fkey";
            columns: ["owner_id", "work_item_id"];
            isOneToOne: true;
            referencedRelation: "work_items";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      events: {
        Row: {
          all_day: boolean;
          body: string;
          category: string;
          created_at: string;
          deleted_at: string | null;
          ends_at: string | null;
          ends_on: string | null;
          id: string;
          location: string;
          occurrence_on: string | null;
          owner_id: string;
          series_id: string | null;
          starts_at: string | null;
          starts_on: string | null;
          timezone: string;
          title: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          all_day?: boolean;
          body?: string;
          category: string;
          created_at?: string;
          deleted_at?: string | null;
          ends_at?: string | null;
          ends_on?: string | null;
          id?: string;
          location?: string;
          occurrence_on?: string | null;
          owner_id: string;
          series_id?: string | null;
          starts_at?: string | null;
          starts_on?: string | null;
          timezone: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          all_day?: boolean;
          body?: string;
          category?: string;
          created_at?: string;
          deleted_at?: string | null;
          ends_at?: string | null;
          ends_on?: string | null;
          id?: string;
          location?: string;
          occurrence_on?: string | null;
          owner_id?: string;
          series_id?: string | null;
          starts_at?: string | null;
          starts_on?: string | null;
          timezone?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_owner_id_series_id_fkey";
            columns: ["owner_id", "series_id"];
            isOneToOne: false;
            referencedRelation: "recurrence_series";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          expires_at: string;
          key: string;
          owner_id: string;
          request_hash: string;
          response: Json | null;
          response_status: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          expires_at: string;
          key: string;
          owner_id: string;
          request_hash: string;
          response?: Json | null;
          response_status?: number | null;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          expires_at?: string;
          key?: string;
          owner_id?: string;
          request_hash?: string;
          response?: Json | null;
          response_status?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          body: string;
          created_at: string;
          deleted_at: string | null;
          event_id: string | null;
          id: string;
          owner_id: string;
          search_vector: unknown;
          title: string;
          updated_at: string;
          version: number;
          work_item_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          id?: string;
          owner_id: string;
          search_vector?: never;
          title: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          id?: string;
          owner_id?: string;
          search_vector?: never;
          title?: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notes_owner_id_event_id_fkey";
            columns: ["owner_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["owner_id", "id"];
          },
          {
            foreignKeyName: "notes_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_owner_id_work_item_id_fkey";
            columns: ["owner_id", "work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          attempt: number;
          created_at: string;
          error: string | null;
          id: string;
          outbox_id: string;
          owner_id: string;
          provider_message_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          attempt: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          outbox_id: string;
          owner_id: string;
          provider_message_id?: string | null;
          status: string;
        };
        Update: {
          attempt?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          outbox_id?: string;
          owner_id?: string;
          provider_message_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_deliveries_owner_id_outbox_id_fkey";
            columns: ["owner_id", "outbox_id"];
            isOneToOne: false;
            referencedRelation: "notification_outbox";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      notification_outbox: {
        Row: {
          attempt_count: number;
          available_at: string;
          channel: string;
          claim_token: string | null;
          claimed_at: string | null;
          created_at: string;
          id: string;
          idempotency_key: string;
          owner_id: string;
          payload: NonNullable<Json>;
          reminder_id: string | null;
          status: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          attempt_count?: number;
          available_at?: string;
          channel: string;
          claim_token?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          owner_id: string;
          payload?: NonNullable<Json>;
          reminder_id?: string | null;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          channel?: string;
          claim_token?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          owner_id?: string;
          payload?: NonNullable<Json>;
          reminder_id?: string | null;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "notification_outbox_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_outbox_owner_id_reminder_id_fkey";
            columns: ["owner_id", "reminder_id"];
            isOneToOne: false;
            referencedRelation: "reminders";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      operation_batch_items: {
        Row: {
          batch_id: string;
          created_at: string;
          id: string;
          journal_id: string;
          owner_id: string;
        };
        ComputedFields: never;
        Insert: {
          batch_id: string;
          created_at?: string;
          id?: string;
          journal_id: string;
          owner_id: string;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          id?: string;
          journal_id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operation_batch_items_owner_id_batch_id_fkey";
            columns: ["owner_id", "batch_id"];
            isOneToOne: false;
            referencedRelation: "operation_batches";
            referencedColumns: ["owner_id", "id"];
          },
          {
            foreignKeyName: "operation_batch_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operation_batch_items_owner_id_journal_id_fkey";
            columns: ["owner_id", "journal_id"];
            isOneToOne: false;
            referencedRelation: "operation_journal";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      operation_batches: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          owner_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          label?: string;
          owner_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          owner_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "operation_batches_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      operation_journal: {
        Row: {
          after_snapshot: Json | null;
          batch_id: string | null;
          before_snapshot: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          owner_id: string;
          undone_at: string | null;
          updated_at: string;
          version: number;
          version_after: number | null;
        };
        ComputedFields: never;
        Insert: {
          after_snapshot?: Json | null;
          batch_id?: string | null;
          before_snapshot?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          owner_id: string;
          undone_at?: string | null;
          updated_at?: string;
          version?: number;
          version_after?: number | null;
        };
        Update: {
          after_snapshot?: Json | null;
          batch_id?: string | null;
          before_snapshot?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          owner_id?: string;
          undone_at?: string | null;
          updated_at?: string;
          version?: number;
          version_after?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "operation_journal_owner_id_batch_id_fkey";
            columns: ["owner_id", "batch_id"];
            isOneToOne: false;
            referencedRelation: "operation_batches";
            referencedColumns: ["owner_id", "id"];
          },
          {
            foreignKeyName: "operation_journal_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      planning_blocks: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          ends_at: string;
          id: string;
          owner_id: string;
          starts_at: string;
          status: string;
          updated_at: string;
          version: number;
          work_item_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          ends_at: string;
          id?: string;
          owner_id: string;
          starts_at: string;
          status: string;
          updated_at?: string;
          version?: number;
          work_item_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          ends_at?: string;
          id?: string;
          owner_id?: string;
          starts_at?: string;
          status?: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planning_blocks_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planning_blocks_owner_id_work_item_id_fkey";
            columns: ["owner_id", "work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      profiles: {
        Row: {
          ai_permitted: boolean;
          created_at: string;
          deleted_at: string | null;
          density: string;
          display_name: string;
          id: string;
          timezone: string;
          updated_at: string;
          version: number;
          week_starts_on: number;
        };
        ComputedFields: never;
        Insert: {
          ai_permitted?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          density?: string;
          display_name?: string;
          id: string;
          timezone?: string;
          updated_at?: string;
          version?: number;
          week_starts_on?: number;
        };
        Update: {
          ai_permitted?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          density?: string;
          display_name?: string;
          id?: string;
          timezone?: string;
          updated_at?: string;
          version?: number;
          week_starts_on?: number;
        };
        Relationships: [];
      };
      recurrence_exceptions: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          occurrence_on: string;
          owner_id: string;
          series_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          occurrence_on: string;
          owner_id: string;
          series_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          occurrence_on?: string;
          owner_id?: string;
          series_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recurrence_exceptions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurrence_exceptions_owner_id_series_id_fkey";
            columns: ["owner_id", "series_id"];
            isOneToOne: false;
            referencedRelation: "recurrence_series";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      recurrence_series: {
        Row: {
          all_day: boolean;
          created_at: string;
          deleted_at: string | null;
          duration_minutes: number | null;
          frequency: string;
          id: string;
          interval_count: number;
          local_start_time: string | null;
          materialized_through: string | null;
          occurrence_count: number | null;
          owner_id: string;
          starts_on: string;
          timezone: string;
          until_on: string | null;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          all_day?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          duration_minutes?: number | null;
          frequency: string;
          id?: string;
          interval_count?: number;
          local_start_time?: string | null;
          materialized_through?: string | null;
          occurrence_count?: number | null;
          owner_id: string;
          starts_on: string;
          timezone: string;
          until_on?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          all_day?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          duration_minutes?: number | null;
          frequency?: string;
          id?: string;
          interval_count?: number;
          local_start_time?: string | null;
          materialized_through?: string | null;
          occurrence_count?: number | null;
          owner_id?: string;
          starts_on?: string;
          timezone?: string;
          until_on?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recurrence_series_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          channel: string;
          created_at: string;
          deleted_at: string | null;
          event_id: string | null;
          id: string;
          offset_minutes: number | null;
          owner_id: string;
          remind_at: string | null;
          remind_on: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
          work_item_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          channel: string;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          id?: string;
          offset_minutes?: number | null;
          owner_id: string;
          remind_at?: string | null;
          remind_on?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string | null;
        };
        Update: {
          channel?: string;
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          id?: string;
          offset_minutes?: number | null;
          owner_id?: string;
          remind_at?: string | null;
          remind_on?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_owner_id_event_id_fkey";
            columns: ["owner_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["owner_id", "id"];
          },
          {
            foreignKeyName: "reminders_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_owner_id_work_item_id_fkey";
            columns: ["owner_id", "work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      task_effort_logs: {
        Row: {
          created_at: string;
          ended_at: string;
          id: string;
          minutes: number;
          note: string;
          owner_id: string;
          started_at: string;
          updated_at: string;
          version: number;
          work_item_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ended_at: string;
          id?: string;
          minutes: number;
          note?: string;
          owner_id: string;
          started_at: string;
          updated_at?: string;
          version?: number;
          work_item_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string;
          id?: string;
          minutes?: number;
          note?: string;
          owner_id?: string;
          started_at?: string;
          updated_at?: string;
          version?: number;
          work_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_effort_logs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_effort_logs_owner_id_work_item_id_fkey";
            columns: ["owner_id", "work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["owner_id", "id"];
          },
        ];
      };
      user_devices: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          last_seen_at: string | null;
          owner_id: string;
          revoked_at: string | null;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          last_seen_at?: string | null;
          owner_id: string;
          revoked_at?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          last_seen_at?: string | null;
          owner_id?: string;
          revoked_at?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_devices_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      work_items: {
        Row: {
          body: string;
          category: string;
          completed_at: string | null;
          created_at: string;
          deleted_at: string | null;
          due_at: string | null;
          due_on: string | null;
          estimate_minutes: number | null;
          id: string;
          owner_id: string;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          category: string;
          completed_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          due_at?: string | null;
          due_on?: string | null;
          estimate_minutes?: number | null;
          id?: string;
          owner_id: string;
          severity: string;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          body?: string;
          category?: string;
          completed_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          due_at?: string | null;
          due_on?: string | null;
          estimate_minutes?: number | null;
          id?: string;
          owner_id?: string;
          severity?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "work_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clean_text: { Args: { p_value: string }; Returns: string };
      create_event: {
        Args: {
          p_all_day: boolean;
          p_body: string;
          p_category: string;
          p_count: number;
          p_ends_on: string;
          p_frequency: string;
          p_idempotency_key: string;
          p_interval: number;
          p_local_end: string;
          p_local_start: string;
          p_location: string;
          p_starts_on: string;
          p_timezone: string;
          p_title: string;
          p_until: string;
        };
        Returns: Json;
      };
      create_note: {
        Args: {
          p_body: string;
          p_event_id: string;
          p_idempotency_key: string;
          p_title: string;
          p_work_item_id: string;
        };
        Returns: Json;
      };
      create_reminder: {
        Args: {
          p_channel: string;
          p_event_id: string;
          p_idempotency_key: string;
          p_offset_minutes: number;
          p_remind_at: string;
          p_remind_on: string;
          p_title: string;
          p_work_item_id: string;
        };
        Returns: Json;
      };
      create_work_item: {
        Args: {
          p_body: string;
          p_category: string;
          p_due_at: string;
          p_due_on: string;
          p_estimate_minutes: number;
          p_idempotency_key: string;
          p_severity: string;
          p_title: string;
        };
        Returns: Json;
      };
      event_bounds: {
        Args: {
          p_all_day: boolean;
          p_ends_on: string;
          p_local_end: string;
          p_local_start: string;
          p_starts_on: string;
          p_timezone: string;
        };
        Returns: {
          duration_minutes: number;
          ends_at: string;
          ends_on: string;
          starts_at: string;
          starts_on: string;
        }[];
      };
      finish_idempotency: {
        Args: { p_entity_id: string; p_entity_type: string; p_key: string; p_response: Json };
        Returns: undefined;
      };
      list_events_between: { Args: { p_end: string; p_start: string }; Returns: Json };
      list_notes: { Args: { p_limit: number; p_query: string }; Returns: Json };
      list_reminders: { Args: { p_limit: number }; Returns: Json };
      list_work_items: {
        Args: { p_cursor_created: string; p_cursor_id: string; p_limit: number; p_status: string };
        Returns: Json;
      };
      materialize_series: {
        Args: {
          p_body?: string;
          p_category?: string;
          p_location?: string;
          p_series_id: string;
          p_title?: string;
        };
        Returns: number;
      };
      occurrence_date: {
        Args: { p_frequency: string; p_index: number; p_interval: number; p_start: string };
        Returns: string;
      };
      page_limit: { Args: { p_limit: number }; Returns: number };
      require_category: { Args: { p_value: string }; Returns: string };
      require_text: { Args: { p_label: string; p_max: number; p_value: string }; Returns: string };
      require_zone: { Args: { p_timezone: string }; Returns: string };
      restore_work_item: {
        Args: { p_expected_version: number; p_id: string; p_idempotency_key: string };
        Returns: Json;
      };
      set_work_item_status: {
        Args: {
          p_expected_version: number;
          p_id: string;
          p_idempotency_key: string;
          p_status: string;
        };
        Returns: Json;
      };
      soft_delete_event: {
        Args: {
          p_expected_version: number;
          p_id: string;
          p_idempotency_key: string;
          p_scope: string;
        };
        Returns: Json;
      };
      soft_delete_note: {
        Args: { p_expected_version: number; p_id: string; p_idempotency_key: string };
        Returns: Json;
      };
      soft_delete_reminder: {
        Args: { p_expected_version: number; p_id: string; p_idempotency_key: string };
        Returns: Json;
      };
      soft_delete_work_item: {
        Args: { p_expected_version: number; p_id: string; p_idempotency_key: string };
        Returns: Json;
      };
      take_idempotency: { Args: { p_hash: string; p_key: string }; Returns: Json };
      update_event: {
        Args: {
          p_all_day: boolean;
          p_body: string;
          p_category: string;
          p_ends_on: string;
          p_expected_version: number;
          p_id: string;
          p_idempotency_key: string;
          p_local_end: string;
          p_local_start: string;
          p_location: string;
          p_scope: string;
          p_starts_on: string;
          p_timezone: string;
          p_title: string;
        };
        Returns: Json;
      };
      update_note: {
        Args: {
          p_body: string;
          p_event_id: string;
          p_expected_version: number;
          p_id: string;
          p_idempotency_key: string;
          p_title: string;
          p_work_item_id: string;
        };
        Returns: Json;
      };
      update_reminder: {
        Args: {
          p_channel: string;
          p_event_id: string;
          p_expected_version: number;
          p_id: string;
          p_idempotency_key: string;
          p_offset_minutes: number;
          p_remind_at: string;
          p_remind_on: string;
          p_status: string;
          p_title: string;
          p_work_item_id: string;
        };
        Returns: Json;
      };
      update_work_item: {
        Args: {
          p_body: string;
          p_category: string;
          p_due_at: string;
          p_due_on: string;
          p_estimate_minutes: number;
          p_expected_version: number;
          p_id: string;
          p_idempotency_key: string;
          p_severity: string;
          p_title: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
