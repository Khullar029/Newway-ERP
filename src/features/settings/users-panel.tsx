"use client";

import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAllProfiles, useUpdateProfile } from "./use-users";
import { useClients } from "@/features/clients/use-clients";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["Admin", "Team", "Client"];

export function UsersPanel() {
  const { data: profiles, isLoading } = useAllProfiles();
  const { data: clients } = useClients();
  const update = useUpdateProfile();

  async function handleRoleChange(id: string, role: UserRole, clientId: string | null) {
    if (role === "Client" && !clientId) {
      toast.error("A client-role user must be assigned to a client first");
      return;
    }
    try {
      await update.mutateAsync({ id, role, client_id: role === "Client" ? clientId : null });
      toast.success("Updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Client (if role = Client)</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(profiles ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.full_name ?? "—"}</TableCell>
              <TableCell>
                <Select value={p.role} onValueChange={(v) => handleRoleChange(p.id, v as UserRole, p.client_id)}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {p.role === "Client" ? (
                  <Select value={p.client_id ?? ""} onValueChange={(v) => handleRoleChange(p.id, "Client", v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground">{p.clients?.name ?? "—"}</span>
                )}
              </TableCell>
              <TableCell>
                <Switch checked={p.active} onCheckedChange={(v) => update.mutate({ id: p.id, active: v })} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
