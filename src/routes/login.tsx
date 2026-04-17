import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useNous } from "@/lib/nous-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrer — Nous" }],
  }),
  component: Login,
});

function Login() {
  const { state, update, hydrated } = useNous();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && !state.onboarded) navigate({ to: "/" });
  }, [hydrated, state.onboarded, navigate]);

  if (!hydrated || !state.profiles.a || !state.profiles.b) return null;

  const profile = selected ? state.profiles[selected] : null;

  const tryUnlock = () => {
    if (!profile) return;
    if (pin === profile.pin) {
      update({ currentProfileId: profile.id });
      navigate({ to: "/journal" });
    } else {
      setError("Raté. Réessaie.");
      setPin("");
      setTimeout(() => setError(""), 1600);
    }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 pt-10 pb-16 flex flex-col">
      <Link to="/" className="tracking-ritual text-muted-foreground self-start">
        ← Nous
      </Link>

      {!selected ? (
        <div className="mt-16 animate-in fade-in duration-500">
          <span className="inline-block rounded-full bg-ink px-3 py-1 tracking-ritual text-primary-foreground">
            Qui joue ?
          </span>
          <h1 className="serif text-5xl text-ink mt-4 leading-[0.95]">
            Choisis ton <span className="italic text-emerald">avatar.</span>
          </h1>

          <div className="space-y-3 mt-10">
            {(["a", "b"] as const).map((id) => {
              const p = state.profiles[id]!;
              return (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className="btn-flat w-full rounded-2xl bg-card p-5 text-left flex items-center gap-4 hover:bg-sunshine transition"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald text-accent-foreground serif text-2xl font-medium border-2 border-ink">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="serif text-2xl text-ink">{p.name}</div>
                    <div className="text-xs text-muted-foreground tracking-ritual">
                      Joueur·se {id === "a" ? "1" : "2"}
                    </div>
                  </div>
                  <span className="text-2xl text-emerald">→</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-16 animate-in fade-in duration-500">
          <span className="inline-block rounded-full bg-ink px-3 py-1 tracking-ritual text-primary-foreground">
            Salut {profile!.name}
          </span>
          <h1 className="serif text-5xl text-ink mt-4 leading-[0.95]">
            Ton <span className="italic text-emerald">code.</span>
          </h1>
          <input
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            className="w-full rounded-2xl border-2 border-ink bg-card p-5 text-center text-[28px] text-ink tracking-[0.6em] outline-none focus:shadow-flat transition mt-8"
          />
          {error && (
            <p className="text-destructive text-sm mt-3 text-center font-semibold">{error}</p>
          )}
          <button
            onClick={tryUnlock}
            disabled={pin.length !== 4}
            className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual mt-8 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Entrer →
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setPin("");
            }}
            className="w-full py-3 tracking-ritual text-muted-foreground mt-2"
          >
            ← Changer d'avatar
          </button>
        </div>
      )}
    </main>
  );
}
