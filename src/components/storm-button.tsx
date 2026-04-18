import { Link } from "@tanstack/react-router";
import { useStorm } from "@/lib/use-storm";

interface Props {
  coupleId: string | undefined;
}

export function StormButton({ coupleId }: Props) {
  const { storm } = useStorm(coupleId);
  const active = !!storm;

  return (
    <Link
      to="/tempete"
      aria-label={active ? "Tempête en cours" : "Demander un moment de calme"}
      className={`relative inline-flex items-center justify-center size-10 rounded-full border-2 border-ink transition ${
        active ? "bg-storm/30 animate-pulse" : "bg-card hover:bg-paper"
      }`}
    >
      <span className="text-lg">🌧️</span>
      {active && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-storm" />}
    </Link>
  );
}
