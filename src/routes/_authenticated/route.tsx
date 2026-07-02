import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Bloqueia acesso quando o teste expira — dados permanecem preservados.
    const { data: company } = await supabase
      .from("companies")
      .select("trial_ends_at, subscription_status")
      .maybeSingle();
    if (
      company &&
      company.subscription_status === "trialing" &&
      new Date(company.trial_ends_at).getTime() <= Date.now() &&
      location.pathname !== "/billing"
    ) {
      throw redirect({ to: "/billing" });
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
