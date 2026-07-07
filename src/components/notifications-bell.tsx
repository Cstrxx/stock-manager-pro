import { useEffect, useMemo } from "react";
import { Bell, Check, CheckCheck, AlertTriangle, XCircle, PackageX } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: "low_stock" | "critical_stock" | "out_of_stock";
  title: string;
  message: string;
  quantity_remaining: number | null;
  percent_remaining: number | null;
  read_at: string | null;
  created_at: string;
  product_id: string | null;
};

const NOTIFY_KEY = ["notifications"] as const;

export function NotificationsBell() {
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: NOTIFY_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, quantity_remaining, percent_remaining, read_at, created_at, product_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  // Realtime: escuta INSERTs e atualiza cache + toast
  useEffect(() => {
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          qc.setQueryData<Notification[]>(NOTIFY_KEY, (old) =>
            old ? [n, ...old].slice(0, 50) : [n],
          );
          toast(n.title, {
            description: n.message,
            icon:
              n.type === "out_of_stock" ? "📦" : n.type === "critical_stock" ? "🚨" : "⚠️",
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: NOTIFY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const unread = useMemo(() => notifications.filter((n) => !n.read_at), [notifications]);

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFY_KEY });
      const prev = qc.getQueryData<Notification[]>(NOTIFY_KEY);
      qc.setQueryData<Notification[]>(NOTIFY_KEY, (old) =>
        old?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(NOTIFY_KEY, ctx.prev);
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFY_KEY }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center leading-none">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <div className="text-sm font-semibold">Notificações</div>
            <div className="text-[11px] text-muted-foreground">
              {unread.length > 0 ? `${unread.length} não lida${unread.length === 1 ? "" : "s"}` : "Tudo em dia"}
            </div>
          </div>
          {unread.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="size-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onRead={() => !n.read_at && markOne.mutate(n.id)}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ n, onRead }: { n: Notification; onRead: () => void }) {
  const Icon =
    n.type === "out_of_stock" ? PackageX : n.type === "critical_stock" ? XCircle : AlertTriangle;
  const tone =
    n.type === "out_of_stock"
      ? "text-muted-foreground"
      : n.type === "critical_stock"
        ? "text-destructive"
        : "text-warning";

  return (
    <li
      className={`px-4 py-3 flex gap-3 transition-colors hover:bg-accent/40 ${!n.read_at ? "bg-primary/5" : ""}`}
    >
      <Icon className={`size-4 mt-0.5 shrink-0 ${tone}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium truncate">{n.title}</div>
          {!n.read_at && <span className="size-2 rounded-full bg-primary shrink-0" />}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {new Date(n.created_at).toLocaleString("pt-BR")}
          </div>
          {!n.read_at && (
            <button
              type="button"
              onClick={onRead}
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              <Check className="size-3" /> Marcar lida
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
