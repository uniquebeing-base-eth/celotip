import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cast {
  id: string;
  author: string;
  authorFid: number;
  authorPfp?: string;
  authorDisplayName?: string;
  content: string;
  timestamp: string;
  totalTips: number;
  topTippers: string[];
}

export const useTrendingCasts = () => {
  return useQuery({
    queryKey: ["trendingCasts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-trending-casts", {
        body: { limit: 20 },
      });

      if (error) throw error;
      return data.casts as Cast[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
