"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useClients } from "@/features/clients/use-clients";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { formatCurrencyINR } from "@/lib/utils";

const TYPES = ["Seeds", "Ag-Inputs/Bio", "Distribution", "Supplier", "Other"];
const STATUSES = ["Active", "Prospect", "Dormant"];
const PRIORITIES = ["High", "Medium", "Low"];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: clients, isLoading } = useClients({
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
    priority: priority || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients?.length ?? 0} clients</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> Add client
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterSelect label="Type" value={type} onChange={setType} options={TYPES} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUSES} />
        <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Credit limit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clients ?? []).map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/clients/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell className="max-w-48 truncate">{c.region ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell><PriorityBadge priority={c.priority} /></TableCell>
                  <TableCell>{formatCurrencyINR(c.credit_limit)}</TableCell>
                </TableRow>
              ))}
              {(clients ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No clients match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
      <SelectTrigger className="w-40"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
