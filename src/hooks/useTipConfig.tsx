import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFarcasterAuth } from "./useFarcasterAuth";

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
  const { user } = useFarcasterAuth();
  const queryClient = useQueryClient();

  const { data: tipConfigs, isLoading: isLoadingTips } = useQuery({
    queryKey: ["tipConfigs", user?.fid],
    queryFn: async () => {
      if (!user?.fid) return [];
      
      const { data, error } = await supabase
        .from("tip_configs")
        .select("*")
        .eq("fid", user.fid);

      if (error) throw error;
      return data as TipConfig[];
    },
    enabled: !!user?.fid,
  });

  const { data: superTipConfig, isLoading: isLoadingSuperTip } = useQuery({
    queryKey: ["superTipConfig", user?.fid],
    queryFn: async () => {
      if (!user?.fid) return null;
      
      const { data, error } = await supabase
        .from("super_tip_configs")
        .select("*")
        .eq("fid", user.fid)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as SuperTipConfig | null;
    },
    enabled: !!user?.fid,
  });

  const upsertTipConfig = useMutation({
    mutationFn: async (config: Omit<TipConfig, "id">) => {
      if (!user?.fid) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("tip_configs")
        .upsert({
          ...config,
          fid: user.fid,
        }, {
          onConflict: "fid,interaction_type"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipConfigs", user?.fid] });
    },
  });

  const upsertSuperTipConfig = useMutation({
    mutationFn: async (config: Omit<SuperTipConfig, "id" | "fid">) => {
      if (!user?.fid) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("super_tip_configs")
        .upsert({
          ...config,
          fid: user.fid,
        }, {
          onConflict: "fid"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superTipConfig", user?.fid] });
    },
  });

  const deleteSuperTipConfig = useMutation({
    mutationFn: async () => {
      if (!user?.fid) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("super_tip_configs")
        .delete()
        .eq("fid", user.fid);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superTipConfig", user?.fid] });
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


