// Hand-authored types mirroring supabase/migrations/*.sql.
// Once the project is linked to a live Supabase project, regenerate with:
//   npx supabase gen types typescript --linked > src/types/database.ts
// and re-apply any manual additions below (this file is a drop-in replacement
// shape-compatible with the generated one: Database.public.Tables.<table>.Row).

export type UserRole = "Admin" | "Team" | "Client";
export type ClientType = "Seeds" | "Ag-Inputs/Bio" | "Distribution" | "Supplier" | "Other";
export type ClientStatus = "Active" | "Prospect" | "Dormant";
export type PriorityLevel = "High" | "Medium" | "Low";
export type CampaignStatus = "Planning" | "Building" | "Live" | "Paused" | "Done";
export type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Done";
export type ContentStage = "Idea" | "Scripting" | "Shooting" | "Editing" | "Review" | "Approved" | "Published";
export type ContentType = "Micro-drama" | "Reel" | "Video" | "Post" | "Ad-creative" | "Script";
export type InvoiceStatus = "Draft" | "Sent" | "Partial" | "Paid" | "Overdue";
export type ChannelType = "Meta" | "Truecaller" | "WhatsApp" | "Voice" | "YouTube" | "SEO" | "Google Ads" | "GMB";
export type CalendarEventType = "Meeting" | "Go-Live" | "Follow-up" | "Deadline" | "Reminder";
export type IntegrationProvider = "google" | "meta" | "whatsapp" | "voice_ai";
export type IntegrationStatus = "disconnected" | "connected" | "error";

type Relationships = [];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          client_id: string | null;
          avatar_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: Relationships;
      };
      clients: {
        Row: {
          id: string;
          name: string;
          type: ClientType;
          region: string | null;
          status: ClientStatus;
          priority: PriorityLevel;
          products_focus: string | null;
          payment_terms: string | null;
          credit_limit: number;
          notes: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Relationships: Relationships;
      };
      contacts: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          role: string | null;
          phone: string | null;
          email: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & { client_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: Relationships;
      };
      lanes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lanes"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["lanes"]["Row"]>;
        Relationships: Relationships;
      };
      playbooks: {
        Row: {
          id: string;
          lane_id: string | null;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["playbooks"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["playbooks"]["Row"]>;
        Relationships: Relationships;
      };
      playbook_steps: {
        Row: {
          id: string;
          playbook_id: string;
          title: string;
          description: string | null;
          default_owner_role: UserRole;
          offset_days: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["playbook_steps"]["Row"]> & { playbook_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["playbook_steps"]["Row"]>;
        Relationships: Relationships;
      };
      campaigns: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          crop: string | null;
          region: string | null;
          channels: ChannelType[];
          status: CampaignStatus;
          go_live_date: string | null;
          budget: number | null;
          lane_id: string | null;
          owner_id: string | null;
          description: string | null;
          playbook_id: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["campaigns"]["Row"]> & { client_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Relationships: Relationships;
      };
      tasks: {
        Row: {
          id: string;
          client_id: string;
          campaign_id: string | null;
          lane_id: string | null;
          title: string;
          description: string | null;
          owner_id: string | null;
          assignee_id: string | null;
          priority: PriorityLevel;
          status: TaskStatus;
          due_date: string | null;
          created_date: string;
          completed_at: string | null;
          sort_order: number;
          parent_task_id: string | null;
          depends_on: string[];
          is_critical_path: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & { client_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: Relationships;
      };
      content_items: {
        Row: {
          id: string;
          client_id: string;
          campaign_id: string | null;
          type: ContentType;
          title: string;
          stage: ContentStage;
          assignee_id: string | null;
          due_date: string | null;
          file_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["content_items"]["Row"]> & { client_id: string; title: string; type: ContentType };
        Update: Partial<Database["public"]["Tables"]["content_items"]["Row"]>;
        Relationships: Relationships;
      };
      invoices: {
        Row: {
          id: string;
          client_id: string;
          number: string;
          issue_date: string;
          due_date: string | null;
          status: InvoiceStatus;
          currency: string;
          subtotal: number;
          tax: number;
          total: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & { client_id: string; number: string };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: Relationships;
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          qty: number;
          unit_price: number;
          amount: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]> & { invoice_id: string; description: string };
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]>;
        Relationships: Relationships;
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          client_id: string;
          amount: number;
          paid_on: string;
          method: string | null;
          reference: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & { invoice_id: string; client_id: string; amount: number };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: Relationships;
      };
      calendar_events: {
        Row: {
          id: string;
          client_id: string | null;
          campaign_id: string | null;
          title: string;
          type: CalendarEventType;
          starts_at: string;
          ends_at: string | null;
          location: string | null;
          created_by: string | null;
          google_event_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]> & { title: string; starts_at: string };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]>;
        Relationships: Relationships;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          entity_type: string | null;
          entity_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & { user_id: string; type: string; title: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: Relationships;
      };
      comments: {
        Row: {
          id: string;
          entity_type: "task" | "content_item" | "campaign";
          entity_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]> & {
          entity_type: "task" | "content_item" | "campaign";
          entity_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Relationships: Relationships;
      };
      activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          meta: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Row"]>;
        Relationships: Relationships;
      };
      integration_connections: {
        Row: {
          id: string;
          provider: IntegrationProvider;
          status: IntegrationStatus;
          config: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["integration_connections"]["Row"]> & { provider: IntegrationProvider };
        Update: Partial<Database["public"]["Tables"]["integration_connections"]["Row"]>;
        Relationships: Relationships;
      };
    };
    Views: {
      client_finance_summary: {
        Row: {
          client_id: string;
          client_name: string;
          credit_limit: number;
          invoiced_total: number;
          paid_total: number;
          outstanding: number;
        };
        Relationships: Relationships;
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      client_type: ClientType;
      client_status: ClientStatus;
      priority_level: PriorityLevel;
      campaign_status: CampaignStatus;
      task_status: TaskStatus;
      content_stage: ContentStage;
      content_type: ContentType;
      invoice_status: InvoiceStatus;
      channel_type: ChannelType;
      calendar_event_type: CalendarEventType;
      integration_provider: IntegrationProvider;
      integration_status: IntegrationStatus;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
