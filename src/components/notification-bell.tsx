import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/use-notifications";
import type { NotificationRow } from "@/lib/storm";

interface Props {
  userId: string | undefined;
  coupleId: string | undefined;
}

export function NotificationBell({ userId, coupleId }: Props) {
  const { items, unread, markAllRead } = useNotifications(userId, coupleId);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center size-10 rounded-full border-2 border-ink bg-card hover:bg-paper transition"
      >
        <Bell className="size-4 text-ink" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-coral text-[10px] text-accent-foreground font-semibold grid place-items-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-ink bg-card shadow-flat z-50 overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-ink/10 tracking-ritual text-muted-foreground text-xs">
              Vos signaux
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground italic text-center">
                  Rien à signaler. Tout va bien.
                </li>
              ) : (
                items.map((n) => <NotifRow key={n.id} n={n} />)
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function NotifRow({ n }: { n: NotificationRow }) {
  const name = (n.payload?.name as string) || "votre partenaire";
  let icon = "💬";
  let text = "";
  switch (n.kind) {
    case "storm_started":
      icon = "💙";
      text = `${name} a besoin de temps et de calme en ce moment.`;
      break;
    case "storm_ended":
      icon = "🌤️";
      text = `${name} se sent mieux. Le calme est revenu.`;
      break;
    default:
      text = JSON.stringify(n.payload);
  }
  return (
    <li className="px-4 py-3 border-b border-ink/5 last:border-0 flex gap-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[14px] text-ink leading-snug">{text}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </li>
  );
}
