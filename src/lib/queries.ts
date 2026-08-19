import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Company } from "@/lib/inventory";

/**
 * Consultas compartilhadas entre telas.
 *
 * Existe para garantir que uma mesma `queryKey` tenha sempre uma única
 * `queryFn`. Quando duas telas declaram a mesma chave com selects
 * diferentes, o React Query mantém o `queryFn` do observer mais recente —
 * e uma invalidação passa a devolver o shape errado para quem esperava o
 * outro. Centralizar aqui elimina essa classe de bug.
 *
 * Nenhuma consulta foi alterada: são exatamente as mesmas chaves, selects
 * e opções que já existiam nas telas.
 */

export function useCompanyQuery() {
  return useQuery({
    queryKey: ["company"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, plan, trial_ends_at, subscription_status")
        .maybeSingle();
      return data as Company | null;
    },
  });
}

export function useProfileQuery() {
  return useQuery({
    queryKey: ["profile"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });
}
