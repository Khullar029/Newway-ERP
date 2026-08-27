"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ClientStatus, ClientType, PriorityLevel, Tables, TablesInsert, TablesUpdate } from "@/types/database";

export interface ClientFilters {
  search?: string;
  type?: ClientType | string;
  region?: string;
  status?: ClientStatus | string;
  priority?: PriorityLevel | string;
}

export function useClients(filters: ClientFilters = {}) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").is("archived_at", null).order("name");
      if (filters.search) query = query.ilike("name", `%${filters.search}%`);
      if (filters.type) query = query.eq("type", filters.type as ClientType);
      if (filters.status) query = query.eq("status", filters.status as ClientStatus);
      if (filters.priority) query = query.eq("priority", filters.priority as PriorityLevel);
      if (filters.region) query = query.ilike("region", `%${filters.region}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });
}

export function useClient(id: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["client", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Tables<"clients">;
    },
  });
}

export function useClientFinance(id: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["client-finance", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("client_finance_summary").select("*").eq("client_id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useContacts(clientId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["contacts", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("client_id", clientId!).order("is_primary", { ascending: false });
      if (error) throw error;
      return data as Tables<"contacts">[];
    },
  });
}

export function useCreateClient() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"clients">) => {
      const { data, error } = await supabase.from("clients").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"clients"> & { id: string }) => {
      const { data, error } = await supabase.from("clients").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", data.id] });
    },
  });
}

export function useCreateContact() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"contacts">) => {
      const { data, error } = await supabase.from("contacts").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["contacts", data.client_id] }),
  });
}
