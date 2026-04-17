import { Link, useLocation } from "@tanstack/react-router";
import { Heart, Trees, Sparkles } from "lucide-react";

export function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    { to: "/journal", icon: Heart, label: "Ma manche" },
    { to: "/nous", icon: Trees, label: "Nous" },
    { to: "/vendredi", icon: Sparkles, label: "Vendredi" },
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t-2 border-ink bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <ul className="mx-auto max-w-lg grid grid-cols-3">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-3 text-xs ${
                  active ? "text-emerald" : "text-ink/60"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className={`tracking-ritual ${active ? "text-emerald" : ""}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
