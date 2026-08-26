import { Badge } from "@/components/ui/badge";

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "muted"> = {
  High: "destructive",
  Medium: "warning",
  Low: "muted",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={PRIORITY_VARIANT[priority] ?? "muted"}>{priority}</Badge>;
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "muted" | "destructive" | "outline"> = {
  Active: "success",
  Live: "success",
  Done: "success",
  Published: "success",
  Approved: "success",
  Prospect: "outline",
  Planning: "outline",
  Idea: "outline",
  Draft: "outline",
  Dormant: "muted",
  Paused: "muted",
  "Not Started": "muted",
  Building: "secondary",
  "In Progress": "secondary",
  Scripting: "secondary",
  Shooting: "secondary",
  Editing: "secondary",
  Review: "warning",
  Sent: "secondary",
  Partial: "warning",
  Blocked: "destructive",
  Overdue: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</Badge>;
}
