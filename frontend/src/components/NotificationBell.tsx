import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CreditCard, BookOpen, Trophy, Check } from "lucide-react";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: number;
  created_at: string;
}

const ICON: Record<string, React.FC<{ className?: string }>> = {
  sub_expiry: CreditCard,
  new_chapter: BookOpen,
  quiz_waiting: Trophy,
};

function timeAgo(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 3.6e6;
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => setMounted(true), []);

  const { data } = useQuery<{ notifications: Notif[]; unread: number }>({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
    enabled: mounted && isAuthenticated(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id?: number) => api.post("/notifications/read", id ? { id } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!mounted || !isAuthenticated()) return null;

  const notifs = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative grid h-8 w-8 place-items-center rounded-full border border-border text-foreground/70 transition-all hover:text-bordeaux hover:border-bordeaux/40 hover:bg-bordeaux/5"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-bordeaux px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-elegant z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display text-sm font-bold text-foreground">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markRead.mutate(undefined)} className="flex items-center gap-1 text-xs text-bordeaux hover:underline">
                <Check className="h-3 w-3" /> Tout lire
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucune notification.</p>
              </div>
            ) : (
              notifs.map(n => {
                const Icon = ICON[n.type] ?? Bell;
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${n.is_read ? "" : "bg-bordeaux/5"}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bordeaux/10 text-bordeaux">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-bordeaux" />}
                  </div>
                );
                const onClick = () => { if (!n.is_read) markRead.mutate(n.id); setOpen(false); };
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={onClick} className="block border-b border-border last:border-0">{inner}</Link>
                ) : (
                  <button key={n.id} onClick={onClick} className="block w-full text-left border-b border-border last:border-0">{inner}</button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
