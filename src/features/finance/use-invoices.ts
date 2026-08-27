"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { InvoiceStatus, Tables, TablesInsert, TablesUpdate } from "@/types/database";

export interface InvoiceRow extends Tables<"invoices"> {
  clients: { name: string } | null;
}

export interface InvoiceFilters {
  clientId?: string;
  status?: InvoiceStatus;
}

export function useInvoices(filters: InvoiceFilters = {}) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      let q = supabase.from("invoices").select("*, clients(name)").order("issue_date", { ascending: false });
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: invoice, error: invErr }, { data: items, error: itemsErr }, { data: payments, error: payErr }] = await Promise.all([
        supabase.from("invoices").select("*, clients(name, region)").eq("id", id!).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", id!).order("sort_order"),
        supabase.from("payments").select("*").eq("invoice_id", id!).order("paid_on"),
      ]);
      if (invErr) throw invErr;
      if (itemsErr) throw itemsErr;
      if (payErr) throw payErr;
      return { invoice: invoice as unknown as InvoiceRow & { clients: { name: string; region: string | null } | null }, items: items ?? [], payments: payments ?? [] };
    },
  });
}

export function useClientFinanceSummaries() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["client-finance-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_finance_summary").select("*").order("outstanding", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoice() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoice,
      items,
    }: {
      invoice: TablesInsert<"invoices">;
      items: { description: string; qty: number; unit_price: number }[];
    }) => {
      const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
      const { data: created, error } = await supabase
        .from("invoices")
        .insert({ ...invoice, subtotal, tax: 0, total: subtotal })
        .select()
        .single();
      if (error) throw error;
      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from("invoice_items").insert(
          items.map((i, idx) => ({ invoice_id: created.id, description: i.description, qty: i.qty, unit_price: i.unit_price, sort_order: idx }))
        );
        if (itemsErr) throw itemsErr;
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["client-finance-summaries"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { error } = await supabase.from("invoices").update({ status } as TablesUpdate<"invoices">).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
      qc.invalidateQueries({ queryKey: ["client-finance-summaries"] });
    },
  });
}

export function useRecordPayment() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"payments"> & { invoiceTotal: number; alreadyPaid: number }) => {
      const { invoiceTotal, alreadyPaid, ...payment } = input;
      const { error } = await supabase.from("payments").insert(payment);
      if (error) throw error;
      const newPaid = alreadyPaid + payment.amount;
      const status = newPaid >= invoiceTotal ? "Paid" : "Partial";
      const { error: updErr } = await supabase.from("invoices").update({ status }).eq("id", payment.invoice_id);
      if (updErr) throw updErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice", vars.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["client-finance-summaries"] });
    },
  });
}
