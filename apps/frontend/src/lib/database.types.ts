export type Database = {
  public: {
    Tables: {
      profiles: Table;
      user_devices: Table;
      work_items: Table;
      recurrence_series: Table;
      events: Table;
      recurrence_exceptions: Table;
      notes: Table;
      reminders: Table;
      planning_blocks: Table;
      task_effort_logs: Table;
      auto_surface_states: Table;
      operation_batches: Table;
      operation_journal: Table;
      operation_batch_items: Table;
      notification_outbox: Table;
      notification_deliveries: Table;
      idempotency_keys: Table;
      ai_approval_records: Table;
      attachments: Table;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

type Table = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};
