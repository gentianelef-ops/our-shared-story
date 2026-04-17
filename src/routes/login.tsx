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
      setError("Pas tout à fait.");
      setTimeout(() => setError(""), 1500);
    }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto px-8 py-16 flex flex-col">
      <Link to="/" className="tracking-ritual text-muted-foreground">
        Nous
      </Link>

      {!selected ? (
        <div className="mt-20 animate-in fade-in duration-700">
          <h1 className="serif italic text-4xl text-ink">Qui revient ?</h1>
          <div className="divider-gold my-5" />
          <div className="space-y-3 mt-8">
            {(["a", "b"] as const).map((id) => {
              const p = state.profiles[id]!;
              return (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className="w-full rounded-2xl bg-card p-5 shadow-soft text-left flex items-center gap-4 hover:bg-secondary transition"
                >
                  <span className="serif italic text-3xl text-accent">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="serif italic text-2xl text-ink">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-20 animate-in fade-in duration-700">
          <h1 className="serif italic text-4xl text-ink">Bonsoir, {profile!.name}.</h1>
          <div className="divider-gold my-5" />
          <label className="block tracking-ritual text-muted-foreground mb-3 mt-8">
            Votre code
          </label>
          <input
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            className="w-full rounded-2xl bg-card p-5 text-center text-[24px] text-ink tracking-[0.8em] outline-none focus:ring-2 focus:ring-accent/40"
          />
          {error && <p className="text-destructive text-sm mt-3 italic text-center">{error}</p>}
          <button
            onClick={tryUnlock}
            disabled={pin.length !== 4}
            className="w-full rounded-full bg-primary text-primary-foreground py-4 tracking-ritual shadow-soft mt-8 disabled:opacity-40"
          >
            Ouvrir mon journal
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setPin("");
            }}
            className="w-full py-4 tracking-ritual text-muted-foreground mt-2"
          >
            Retour
          </button>
        </div>
      )}
    </main>
  );
}
