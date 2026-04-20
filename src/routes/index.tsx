import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCoupleSession } from "@/lib/use-couple-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nous — le jeu dont votre couple a besoin" },
      {
        name: "description",
        content: "Parce que lire dans les pensées, c'est épuisant. Chacun joue sa partie. Vendredi, vous comparez les scores.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { loading, member } = useCoupleSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && member) navigate({ to: "/journal" });
  }, [loading, member, navigate]);

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-12">
        <span className="inline-block size-3 rounded-full bg-emerald" />
        <span className="tracking-ritual text-ink">Nous</span>
      </div>

      <h1 className="serif text-5xl text-ink leading-[0.95]">
        Ton couple mérite mieux
        <span className="italic text-emerald"> qu'un silence awkward.</span>
      </h1>
      <p className="mt-6 text-ink/70 text-[16px] leading-relaxed">
        Chaque jour tu déposes ce qui s'est passé. Vendredi soir, vous ouvrez tout en même temps. Spoiler : ça surprend toujours.
      </p>

      <div className="mt-10 space-y-3">
        <Pill emoji="💚" label="+1" sub="un moment qui fait du bien" />
        <Pill emoji="💡" label="Idées" sub="proposer une nouvelle règle ensemble" />
        <Pill emoji="🌊" label="Émotion" sub="dit en CNV, pas en reproche" />
      </div>

      <div className="mt-12 grid gap-3">
        <Link
          to="/onboarding"
          className="btn-flat block rounded-full bg-emerald text-accent-foreground py-4 text-center tracking-ritual"
        >
          Créer un couple ✨
        </Link>
        <Link
          to="/login"
          className="btn-flat block rounded-full bg-paper text-ink py-4 text-center tracking-ritual"
        >
          J'ai un code →
        </Link>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground italic">
        « L'amour c'est bien. L'amour qui se comprend, c'est mieux. »
      </p>
    </main>
  );
}

function Pill({ emoji, label, sub }: { emoji: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-card p-4 shadow-flat">
      <div className="text-3xl">{emoji}</div>
      <div>
        <div className="font-semibold text-ink">{label}</div>
        <div className="text-sm text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
