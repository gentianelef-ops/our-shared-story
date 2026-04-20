import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCoupleSession } from "@/lib/use-couple-session";
import { joinCouple } from "@/lib/couple";
import { unlock } from "@/lib/local-lock";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Rejoindre — Nous" },
      { name: "description", content: "Entre le code de couple et choisis ton avatar." },
    ],
  }),
  component: Login,
});

function Login() {
  const { loading, member } = useCoupleSession();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinPrompt, setPinPrompt] = useState("");

  if (loading) return <main className="min-h-screen grid place-items-center"><div className="text-muted-foreground">…</div></main>;

  if (member) {
    const submitPin = (e: React.FormEvent) => {
      e.preventDefault();
      if (pinPrompt !== member.pin) {
        setError("Code incorrect.");
        return;
      }
      unlock(member.id);
      navigate({ to: "/journal" });
    };
    return (
      <main className="min-h-screen mx-auto max-w-lg px-6 pt-14 pb-24">
        <div className="text-center">
          <div className="size-20 mx-auto rounded-full border-2 border-ink bg-emerald grid place-items-center serif text-3xl text-accent-foreground shadow-flat">
            {member.display_name[0]?.toUpperCase()}
          </div>
          <h1 className="serif text-4xl text-ink mt-6">Re, {member.display_name}.</h1>
          <p className="text-sm text-muted-foreground mt-2">Code à 4 chiffres pour accéder à ton espace.</p>
        </div>
        <form onSubmit={submitPin} className="mt-10">
          <input
            autoFocus
            value={pinPrompt}
            onChange={(e) => { setPinPrompt(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(null); }}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[22px] text-ink tracking-[0.6em] text-center outline-none focus:shadow-flat"
          />
          {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}
          <button
            type="submit"
            disabled={pinPrompt.length !== 4}
            className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual mt-8 disabled:opacity-40"
          >
            Entrer →
          </button>
        </form>
        <Link to="/" className="block text-center text-xs tracking-ritual text-muted-foreground mt-6">
          ← retour
        </Link>
      </main>
    );
  }

  const valid = code.trim().length === 6 && name.trim().length >= 2 && /^\d{4}$/.test(pin);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { member: m } = await joinCouple(code, name, pin);
      unlock(m.id);
      navigate({ to: "/journal" });
    } catch (e) {
      console.error("joinCouple failed:", e);
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      setError(`Impossible de rejoindre : ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-24">
      <div className="flex items-center gap-3 mb-10">
        <Link to="/" className="tracking-ritual text-muted-foreground">← Nous</Link>
      </div>

      <span className="inline-block rounded-full bg-ink px-3 py-1 tracking-ritual text-primary-foreground">
        Joueur 2
      </span>
      <h1 className="serif text-5xl text-ink mt-4 leading-[0.95]">
        Le code <span className="italic text-emerald">qu'on t'a donné.</span>
      </h1>

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-8">Code du couple</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
        placeholder="NOUS42"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[22px] text-ink tracking-[0.4em] text-center font-mono outline-none focus:shadow-flat"
      />

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-6">Ton prénom</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ton prénom"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[17px] text-ink outline-none focus:shadow-flat"
      />

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-6">Ton code à 4 chiffres</label>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        placeholder="••••"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[22px] text-ink tracking-[0.6em] text-center outline-none focus:shadow-flat"
      />

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
        {busy ? "Connexion…" : "Rejoindre →"}
      </button>
    </main>
  );
}
