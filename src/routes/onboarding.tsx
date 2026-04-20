import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createCouple } from "@/lib/couple";
import { supabase } from "@/integrations/supabase/client";
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
  const [created, setCreated] = useState<{
    code: string;
    coupleId: string;
    createdBy: string;
  } | null>(null);
  const [pactRules, setPactRules] = useState<string[]>([]);
  const [draftRule, setDraftRule] = useState("");
  const [savingPact, setSavingPact] = useState(false);
  const [pactError, setPactError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && /^\d{4}$/.test(pin);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { couple, member } = await createCouple(name, pin);
      unlock(member.id);
      setCreated({ code: couple.code, coupleId: couple.id, createdBy: member.user_id });
    } catch (e) {
      console.error("createCouple failed:", e);
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      setError(`Échec : ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const addRule = () => {
    const rule = draftRule.trim();
    if (!rule) return;
    setPactRules((prev) => [...prev, rule]);
    setDraftRule("");
  };

  const removeRule = (idx: number) => {
    setPactRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const savePactAndContinue = async () => {
    if (!created || savingPact) return;
    setSavingPact(true);
    setPactError(null);
    try {
      if (pactRules.length > 0) {
        const payload = pactRules.map((text) => ({
          couple_id: created.coupleId,
          created_by: created.createdBy,
          text,
        }));
        const { error: insertError } = await supabase.from("pact_rules").insert(payload);
        if (insertError) throw insertError;
      }
      navigate({ to: "/journal" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Échec de l'enregistrement du pacte.";
      setPactError(msg);
    } finally {
      setSavingPact(false);
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

          <div className="mt-8 rounded-2xl border-2 border-ink bg-card p-4 text-left shadow-flat">
            <h2 className="serif text-2xl text-ink">Votre premier pacte 🤝</h2>
            <p className="mt-2 text-sm text-ink/70">
              Quelles sont vos règles à vous ? Tu peux en ajouter maintenant ou plus tard.
            </p>

            {pactRules.length > 0 && (
              <ul className="mt-4 space-y-2">
                {pactRules.map((rule, idx) => (
                  <li
                    key={`${rule}-${idx}`}
                    className="rounded-xl border-2 border-ink/20 bg-paper px-3 py-2 text-sm text-ink flex items-center gap-2"
                  >
                    <span className="flex-1">{rule}</span>
                    <button
                      onClick={() => removeRule(idx)}
                      className="text-muted-foreground text-lg leading-none"
                      aria-label="Supprimer la règle"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center gap-2">
              <input
                value={draftRule}
                onChange={(e) => setDraftRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRule();
                  }
                }}
                placeholder="Une règle à proposer…"
                className="flex-1 rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink outline-none"
              />
              <button
                onClick={addRule}
                className="btn-flat rounded-xl border-2 border-ink bg-paper px-4 py-3 text-sm tracking-ritual text-ink"
              >
                Ajouter
              </button>
            </div>

            {pactError && (
              <p className="mt-3 text-sm text-destructive bg-destructive/10 rounded-xl p-3 border-2 border-destructive">
                {pactError}
              </p>
            )}
          </div>

          <button
            onClick={savePactAndContinue}
            disabled={savingPact}
            className="btn-flat block w-full rounded-full bg-emerald text-accent-foreground py-4 mt-12 tracking-ritual disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingPact
              ? "Enregistrement…"
              : pactRules.length > 0
                ? "Enregistrer le pacte →"
                : "Passer pour l'instant →"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-24">
      <div className="flex items-center gap-3 mb-10">
        <Link to="/" className="tracking-ritual text-muted-foreground">
          ← Nous
        </Link>
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
        Pour que toi seul·e accèdes à ton espace sur cet appareil.
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
