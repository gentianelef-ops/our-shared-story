import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNous } from "@/lib/nous-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { state } = useNous();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.onboarded && state.currentProfileId) {
      navigate({ to: "/journal" });
    }
  }, [state.onboarded, state.currentProfileId, navigate]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="max-w-sm w-full">
        <div className="tracking-ritual text-muted-foreground">un journal à deux</div>
        <h1 className="serif italic text-7xl text-ink mt-6">nous</h1>
        <div className="divider-gold mx-auto my-8" />
        <p className="text-ink/80 leading-relaxed text-[15px]">
          Chacun dépose sa semaine — ses lumières, ses silences, ses vagues.
          <br />
          <span className="italic">Vendredi soir,</span> vous l'ouvrez ensemble.
        </p>

        <div className="mt-14 flex flex-col gap-3">
          {state.onboarded ? (
            <Link
              to="/login"
              className="w-full rounded-full bg-primary text-primary-foreground py-4 tracking-ritual shadow-soft"
            >
              Entrer
            </Link>
          ) : (
            <Link
              to="/onboarding"
              className="w-full rounded-full bg-primary text-primary-foreground py-4 tracking-ritual shadow-soft"
            >
              Commencer
            </Link>
          )}
          <p className="text-xs text-muted-foreground mt-6 italic">
            « Ce qui n'est pas partagé ne se perd pas — il attend. »
          </p>
        </div>
      </div>
    </main>
  );
}
