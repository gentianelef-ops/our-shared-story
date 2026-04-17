import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNous } from "@/lib/nous-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { state, hydrated } = useNous();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (state.onboarded && state.currentProfileId) {
      navigate({ to: "/journal" });
    }
  }, [hydrated, state.onboarded, state.currentProfileId, navigate]);

  return (
    <main className="min-h-screen flex flex-col px-6 py-10">
      {/* Top badge */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald" />
          <span className="tracking-ritual text-primary-foreground">NOUS · v1</span>
        </div>
        <span className="tracking-ritual text-muted-foreground">2 joueurs</span>
      </div>

      <section className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto text-center py-12">
        {/* Floating game pills */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Pill className="bg-sunshine">💛 +1</Pill>
          <Pill className="bg-emerald-soft">🎯 pacte</Pill>
          <Pill className="bg-coral/80 text-primary-foreground">🔥 émotion</Pill>
        </div>

        <h1 className="serif text-5xl sm:text-6xl text-ink leading-[0.95] tracking-tight">
          Parce que lire dans les pensées,
          <br />
          <span className="italic text-emerald">c'est épuisant.</span>
        </h1>

        <p className="mt-6 text-ink/75 leading-relaxed text-[17px] max-w-sm mx-auto">
          Chacun joue sa partie de la semaine en solo. <br />
          Vendredi soir, vous comparez les scores.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          {state.onboarded ? (
            <Link
              to="/login"
              className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual"
            >
              Reprendre la partie →
            </Link>
          ) : (
            <Link
              to="/onboarding"
              className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual"
            >
              On joue ? →
            </Link>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            2 minutes par jour. Pas d'inscription. Pas de pub.
          </p>
        </div>
      </section>

      {/* How it works mini */}
      <section className="max-w-md w-full mx-auto grid grid-cols-3 gap-2 pb-4">
        <Step n="1" label="Tu notes" sub="en solo" />
        <Step n="2" label="Il/elle note" sub="en solo" />
        <Step n="3" label="Vendredi" sub="réveillon" />
      </section>

      <footer className="text-center text-xs text-muted-foreground mt-6 italic">
        « Les couples qui parlent durent. Les autres aussi, mais moins bien. »
      </footer>
    </main>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 text-xs font-semibold text-ink shadow-flat ${className}`}
    >
      {children}
    </span>
  );
}

function Step({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-3 text-center">
      <div className="serif text-2xl text-emerald font-medium">{n}</div>
      <div className="text-xs font-semibold text-ink mt-1">{label}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{sub}</div>
    </div>
  );
}
