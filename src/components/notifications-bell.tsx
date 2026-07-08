import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, XCircle, PackageMinus, CheckCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  product_id: string | null;
  quantity_remaining: number | null;
  percent_remaining: number | null;
  read_at: string | null;
  created_at: string;
};

function iconFor(type: string) {
  if (type === "out_of_stock") return XCircle;
  if (type === "critical_stock") return AlertTriangle;
  return PackageMinus;
}

function toneFor(type: string) {
  if (type === "out_of_stock") return "text-destructive";
  if (type === "critical_stock") return "text-destructive";
  return "text-warning";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationsBell() {
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "unread"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, product_id, quantity_remaining, percent_remaining, read_at, created_at")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications", "unread"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications", "unread"] });
      const prev = qc.getQueryData<Notification[]>(["notifications", "unread"]) ?? [];
      qc.setQueryData<Notification[]>(["notifications", "unread"], prev.filter((n) => n.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications", "unread"], ctx.prev);
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = notifications.map((n) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications", "unread"] });
      const prev = qc.getQueryData<Notification[]>(["notifications", "unread"]) ?? [];
      qc.setQueryData<Notification[]>(["notifications", "unread"], []);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications", "unread"], ctx.prev);
    },
  });

  const count = notifications.length;
  const badge = count > 9 ? "9+" : String(count);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center leading-none">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold">Notificações</div>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAll.mutate()}>
              <CheckCheck className="size-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        {count === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            <Bell className="size-6 mx-auto mb-2 opacity-40" />
            Nenhuma notificação nova
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = iconFor(n.type);
                return (
                  <li key={n.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex gap-3">
                      <Icon className={`size-4 mt-0.5 shrink-0 ${toneFor(n.type)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium truncate">{n.title}</div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        {n.percent_remaining != null && (
                          <Badge variant="outline" className="mt-1.5 text-[10px] h-4 px-1.5">
                            {Math.round(Number(n.percent_remaining))}% restante
                          </Badge>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Link
                            to="/alerts"
                            className="text-xs text-primary hover:underline"
                          >
                            Ver detalhes
                          </Link>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => markOne.mutate(n.id)}
                          >
                            Marcar como lida
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
        <div className="border-t border-border">
          <Link to="/alerts" className="block px-4 py-2.5 text-xs text-center text-primary hover:bg-muted/50">
            Ver todos os alertas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
