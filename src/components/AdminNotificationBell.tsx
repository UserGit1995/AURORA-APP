import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Package, Palette, MessageCircle } from "lucide-react";
import { getAdminNotifications } from "@/lib/admin.functions";

const ICONS = { order: Package, customization: Palette, whatsapp: MessageCircle } as const;

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
}

// Campanella con contatore nella barra in alto del pannello admin:
// raccoglie ordini nuovi, richieste di personalizzazione nuove e
// messaggi WhatsApp non letti, senza dover controllare l'email.
export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const fetchNotifications = useServerFn(getAdminNotifications);

  const { data } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => fetchNotifications({ data: undefined }),
    refetchInterval: 30000,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input transition-colors hover:bg-accent"
        aria-label="Notifiche"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="card-elevated absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifiche</div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nessuna novità al momento.</p>
              ) : (
                items.map((item: any) => {
                  const Icon = ICONS[item.type as keyof typeof ICONS] || Bell;
                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.link}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 border-b border-border/50 px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-accent"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
