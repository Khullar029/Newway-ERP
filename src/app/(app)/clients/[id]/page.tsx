"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useClient, useClientFinance, useContacts, useCreateContact } from "@/features/clients/use-clients";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { formatCurrencyINR, formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const { data: client, isLoading } = useClient(id);
  const { data: finance } = useClientFinance(id);
  const { data: contacts } = useContacts(id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const { data: campaigns } = useQuery({
    queryKey: ["client-campaigns", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("client_id", id).is("archived_at", null).order("go_live_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("client_id", id).neq("status", "Done").order("due_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: content } = useQuery({
    queryKey: ["client-content", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("*").eq("client_id", id).order("due_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["client-activity", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("*").eq("entity_type", "clients").eq("entity_id", id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !client) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const outstanding = finance?.outstanding ?? 0;
  const overCreditLimit = client.credit_limit > 0 && outstanding > client.credit_limit;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <StatusBadge status={client.status} />
            <PriorityBadge priority={client.priority} />
          </div>
          <p className="text-sm text-muted-foreground">{client.type} · {client.region ?? "No region set"}</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Credit limit</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrencyINR(client.credit_limit)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Outstanding</CardTitle></CardHeader>
          <CardContent className={`text-lg font-semibold ${overCreditLimit ? "text-destructive" : ""}`}>
            {formatCurrencyINR(outstanding)}
            {overCreditLimit && <Badge variant="destructive" className="ml-2 align-middle">Over limit</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open tasks</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{tasks?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active campaigns</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{campaigns?.filter((c) => c.status !== "Done").length ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setContactOpen(true)}><Plus className="h-4 w-4" /> Add</Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(contacts ?? []).length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
            {(contacts ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <div>
                  <p className="font-medium">{c.name} {c.is_primary && <Badge variant="secondary" className="ml-1">Primary</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  {c.phone && <a href={`tel:${c.phone}`}><Phone className="h-4 w-4" /></a>}
                  {c.email && <a href={`mailto:${c.email}`}><Mail className="h-4 w-4" /></a>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(campaigns ?? []).length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
            {(campaigns ?? []).map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between rounded-md border border-border p-2 text-sm hover:bg-accent">
                <span>{c.name}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(c.go_live_date)}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Open tasks</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(tasks ?? []).length === 0 && <p className="text-sm text-muted-foreground">No open tasks.</p>}
            {(tasks ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span className="truncate">{t.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Content in flight</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(content ?? []).length === 0 && <p className="text-sm text-muted-foreground">No content items.</p>}
            {(content ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span className="truncate">{c.title}</span>
                <StatusBadge status={c.stage} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(activity ?? []).length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
          {(activity ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span className="capitalize">{a.action} client</span>
              <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <AddContactDialog open={contactOpen} onOpenChange={setContactOpen} clientId={id} />
    </div>
  );
}

function AddContactDialog({ open, onOpenChange, clientId }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: string }) {
  const create = useCreateContact();
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", is_primary: false });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      await create.mutateAsync({ client_id: clientId, ...form });
      toast.success("Contact added");
      setForm({ name: "", role: "", phone: "", email: "", is_primary: false });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Role</Label><Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} /></div>
          <div className="flex flex-col gap-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div className="flex flex-col gap-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Add contact</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
