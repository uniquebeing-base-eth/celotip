import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "./useWalletAuth";

export interface TipConfig {
  id: string;
  fid: number;
  interaction_type: "like" | "comment" | "recast" | "quote" | "follow";
  token_address: string;
  token_symbol: string;
  amount: number;
  is_enabled: boolean;
}

export interface SuperTipConfig {
  id: string;
  fid: number;
  trigger_phrase: string;
  token_address: string;
  token_symbol: string;
  amount: number;
  is_enabled: boolean;
}

export const useTipConfig = () => {
  const { fid } = useWalletAuth();
  const queryClient = useQueryClient();

  const { data: tipConfigs, isLoading: isLoadingTips } = useQuery({
    queryKey: ["tipConfigs", fid],
    queryFn: async () => {
      if (!fid) return [];
      
      const { data, error } = await supabase
        .from("tip_configs")
        .select("*")
        .eq("fid", fid);

      if (error) throw error;
      return data as TipConfig[];
    },
    enabled: !!fid,
  });

  const { data: superTipConfig, isLoading: isLoadingSuperTip } = useQuery({
    queryKey: ["superTipConfig", fid],
    queryFn: async () => {
      if (!fid) return null;
      
      const { data, error } = await supabase
        .from("super_tip_configs")
        .select("*")
        .eq("fid", fid)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as SuperTipConfig | null;
    },
    enabled: !!fid,
  });

  const upsertTipConfig = useMutation({
    mutationFn: async (config: Omit<TipConfig, "id">) => {
      if (!fid) throw new Error("Wallet not connected");

      const { data, error } = await supabase
        .from("tip_configs")
        .upsert({
          ...config,
          fid,
        }, {
          onConflict: "fid,interaction_type"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipConfigs", fid] });
    },
  });

  const upsertSuperTipConfig = useMutation({
    mutationFn: async (config: Omit<SuperTipConfig, "id" | "fid">) => {
      if (!fid) throw new Error("Wallet not connected");

      const { data, error } = await supabase
        .from("super_tip_configs")
        .upsert({
          ...config,
          fid,
        }, {
          onConflict: "fid"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superTipConfig", fid] });
    },
  });

  const deleteSuperTipConfig = useMutation({
    mutationFn: async () => {
      if (!fid) throw new Error("Wallet not connected");

      const { error } = await supabase
        .from("super_tip_configs")
        .delete()
        .eq("fid", fid);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superTipConfig", fid] });
    },
  });

  return {
    tipConfigs: tipConfigs || [],
    superTipConfig,
    isLoading: isLoadingTips || isLoadingSuperTip,
    upsertTipConfig,
    upsertSuperTipConfig,
    deleteSuperTipConfig,
  };
};
