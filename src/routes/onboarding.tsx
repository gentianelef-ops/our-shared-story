import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createCouple } from "@/lib/couple";
import { unlock } from "@/lib/local-lock";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Créer un couple — Nous" },
      { name: "description", content: "Démarre la partie. Tu obtiens un code à partager." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string } | null>(null);

  const valid = name.trim().length >= 2 && /^\d{4}$/.test(pin);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { couple, member } = await createCouple(name, pin);
      unlock(member.id);
      setCreated({ code: couple.code });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la création.");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <main className="min-h-screen mx-auto max-w-lg px-6 pt-14 pb-24">
        <div className="text-center animate-in fade-in duration-500">
          <div className="text-5xl">🎉</div>
          <h1 className="serif text-4xl text-ink mt-6">Votre couple existe.</h1>
          <p className="text-ink/70 mt-3 text-sm">
            Donne ce code à l'autre joueur. Il/elle l'entrera pour vous connecter.
          </p>

          <div className="mt-8 mx-auto inline-block rounded-3xl border-2 border-ink bg-card px-10 py-6 shadow-flat">
            <div className="tracking-ritual text-muted-foreground mb-2">Votre code</div>
            <div className="serif text-5xl tracking-[0.3em] text-emerald">{created.code}</div>
          </div>

          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(created.code);
              } catch {
                /* ignore */
              }
            }}
            className="mt-6 text-xs tracking-ritual text-ink underline"
          >
            Copier le code
          </button>

          <button
            onClick={() => navigate({ to: "/journal" })}
            className="btn-flat block w-full rounded-full bg-emerald text-accent-foreground py-4 mt-12 tracking-ritual"
          >
            Entrer dans ma manche →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-24">
      <div className="flex items-center gap-3 mb-10">
        <Link to="/" className="tracking-ritual text-muted-foreground">← Nous</Link>
      </div>

      <span className="inline-block rounded-full bg-ink px-3 py-1 tracking-ritual text-primary-foreground">
        Joueur 1
      </span>
      <h1 className="serif text-5xl text-ink mt-4 leading-[0.95]">
        Toi, <span className="italic text-emerald">d'abord.</span>
      </h1>
      <p className="text-sm text-ink/60 mt-3">Deux infos. Tu obtiendras un code à transmettre.</p>

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-8">Prénom</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ton prénom"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[17px] text-ink outline-none focus:shadow-flat transition"
      />

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-6">
        Code secret · 4 chiffres
      </label>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        placeholder="••••"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[22px] text-ink tracking-[0.6em] text-center outline-none focus:shadow-flat transition"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Pour que toi seul·e ouvres ta manche sur cet appareil.
      </p>

      {error && (
        <p className="mt-6 text-sm text-destructive bg-destructive/10 rounded-xl p-3 border-2 border-destructive">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!valid || busy}
        className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual mt-10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? "Création…" : "Créer le couple →"}
      </button>
    </main>
  );
}
