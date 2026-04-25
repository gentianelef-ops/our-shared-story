import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [created, setCreated] = useState<{ code: string; coupleId: string; userId: string } | null>(
    null,
  );
  const [showPactStep, setShowPactStep] = useState(false);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [customRule, setCustomRule] = useState("");
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [savingPact, setSavingPact] = useState(false);

  const valid = name.trim().length >= 2 && /^\d{4}$/.test(pin);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { couple, member } = await createCouple(name, pin);
      unlock(member.id);
      setCreated({ code: couple.code, coupleId: couple.id, userId: member.user_id });
    } catch (e) {
      console.error("createCouple failed:", e);
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      setError(`Échec : ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = {
    Communication: [
      "Pas de sarcasme quand l'autre est sérieux",
      "Dire ce qu'on ressent plutôt que de bouder",
      "Ne pas couper la parole",
      "Ne pas s'endormir fâché·e",
    ],
    Tendresse: [
      "Un bisou le matin avant de partir",
      "Dire 'je t'aime' au moins une fois par jour",
      "Un câlin quand l'un de nous va pas bien",
    ],
    Respect: [
      "Pas de moqueries devant les autres",
      "Respecter le besoin de silence de l'autre",
      "Ne pas regarder son téléphone pendant qu'on mange ensemble",
    ],
  } as const;

  const toggleRule = (rule: string) => {
    setSelectedRules((prev) =>
      prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule],
    );
  };

  const addCustomRule = () => {
    const clean = customRule.trim();
    if (!clean || customRules.includes(clean)) return;
    setCustomRules((prev) => [...prev, clean]);
    setCustomRule("");
  };

  const removeCustomRule = (rule: string) => {
    setCustomRules((prev) => prev.filter((r) => r !== rule));
  };

  const sealPact = async () => {
    if (!created) return;
    const rulesToInsert = [...selectedRules, ...customRules];
    if (rulesToInsert.length === 0) {
      navigate({ to: "/journal" });
      return;
    }
    setSavingPact(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("pact_rules").insert(
        rulesToInsert.map((text) => ({
          couple_id: created.coupleId,
          created_by: created.userId,
          text,
        })),
      );
      if (insertError) throw insertError;
      navigate({ to: "/journal" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      setError(`Échec pacte : ${msg}`);
    } finally {
      setSavingPact(false);
    }
  };

  if (created && !showPactStep) {
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
            onClick={() => setShowPactStep(true)}
            className="btn-flat block w-full rounded-full bg-emerald text-accent-foreground py-4 mt-12 tracking-ritual"
          >
            Continuer vers le pacte →
          </button>
        </div>
      </main>
    );
  }

  if (created && showPactStep) {
    const allRulesCount = selectedRules.length + customRules.length;
    return (
      <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-24">
        <h1 className="serif text-4xl text-ink leading-tight">
          Votre pacte 🤝
          <span className="block text-emerald">Les règles du jeu.</span>
        </h1>
        <p className="text-ink/70 mt-3 text-sm">
          Choisissez ce qui vous ressemble. Vous pourrez en ajouter d&apos;autres plus tard.
        </p>

        {Object.entries(suggestions).map(([category, rules]) => (
          <section key={category} className="mt-7 rounded-2xl border-2 border-ink bg-card p-4">
            <h2 className="tracking-ritual text-ink mb-3">{category}</h2>
            <div className="space-y-2">
              {rules.map((rule) => (
                <label
                  key={rule}
                  className="flex items-start gap-3 text-sm text-ink cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule)}
                    onChange={() => toggleRule(rule)}
                    className="mt-0.5 size-4 accent-emerald"
                  />
                  <span>{rule}</span>
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-7 rounded-2xl border-2 border-ink bg-card p-4">
          <h2 className="tracking-ritual text-ink mb-3">Vos règles maison</h2>
          <div className="flex gap-2">
            <input
              value={customRule}
              onChange={(e) => setCustomRule(e.target.value)}
              placeholder="Écrire une règle à vous..."
              className="flex-1 rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink outline-none"
            />
            <button
              onClick={addCustomRule}
              disabled={!customRule.trim()}
              className="btn-flat rounded-xl bg-emerald px-4 text-accent-foreground disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
          {customRules.length > 0 && (
            <ul className="mt-3 space-y-2">
              {customRules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2 rounded-xl bg-paper p-3 text-sm text-ink"
                >
                  <span className="flex-1">{rule}</span>
                  <button
                    onClick={() => removeCustomRule(rule)}
                    className="text-muted-foreground leading-none"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p className="mt-6 text-sm text-destructive bg-destructive/10 rounded-xl p-3 border-2 border-destructive">
            {error}
          </p>
        )}

        <button
          onClick={sealPact}
          disabled={savingPact || allRulesCount === 0}
          className="btn-flat block w-full rounded-full bg-emerald text-accent-foreground py-4 mt-10 tracking-ritual disabled:opacity-40"
        >
          {savingPact ? "Scellement…" : "Sceller le pacte 🤝"}
        </button>
        <button
          onClick={() => navigate({ to: "/journal" })}
          className="block w-full text-center mt-4 text-xs tracking-ritual text-muted-foreground"
        >
          Passer pour l&apos;instant →
        </button>
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
