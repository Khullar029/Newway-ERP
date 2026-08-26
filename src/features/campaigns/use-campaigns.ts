"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CampaignStatus, ChannelType, TablesInsert, TablesUpdate } from "@/types/database";

export interface CampaignRow {
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
  clients: { name: string } | null;
  lanes: { name: string; color: string } | null;
}

export interface CampaignFilters {
  clientId?: string;
  status?: CampaignStatus;
  search?: string;
}

const CAMPAIGN_SELECT =
  "id, client_id, name, crop, region, channels, status, go_live_date, budget, lane_id, owner_id, description, playbook_id, created_at, updated_at, clients(name), lanes(name, color)";

export function useCampaigns(filters: CampaignFilters = {}) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["campaigns", filters],
    queryFn: async () => {
      let q = supabase.from("campaigns").select(CAMPAIGN_SELECT).is("archived_at", null).order("go_live_date", { nullsFirst: false });
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.search) q = q.ilike("name", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CampaignRow[];
    },
  });
}

export function useCampaign(id: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select(CAMPAIGN_SELECT).eq("id", id!).single();
      if (error) throw error;
      return data as unknown as CampaignRow;
    },
  });
}

export function useCreateCampaign() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"campaigns">) => {
      const { data, error } = await supabase.from("campaigns").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"campaigns"> & { id: string }) => {
      const { data, error } = await supabase.from("campaigns").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", data.id] });
    },
  });
}
