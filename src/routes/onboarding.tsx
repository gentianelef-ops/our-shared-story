import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useNous } from "@/lib/nous-store";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Commencer — Nous" },
      { name: "description", content: "Créez vos deux profils et votre pacte de couple." },
    ],
  }),
  component: Onboarding,
});

type Step = "intro" | "profileA" | "profileB" | "pact" | "done";

const SUGGESTED_RULES = [
  "Pas de sarcasme.",
  "Exprimer une gratitude chaque jour.",
  "Ne jamais s'endormir fâchés.",
  "Se toucher, même brièvement, chaque jour.",
  "Écouter sans interrompre pendant 2 minutes.",
];

function Onboarding() {
  const { state, update } = useNous();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");

  // Profils
  const [nameA, setNameA] = useState("");
  const [pinA, setPinA] = useState("");
  const [nameB, setNameB] = useState("");
  const [pinB, setPinB] = useState("");

  // Pacte
  const [rules, setRules] = useState<string[]>(state.pact.length ? state.pact : []);
  const [draft, setDraft] = useState("");

  const addRule = (r: string) => {
    const clean = r.trim();
    if (!clean || rules.includes(clean)) return;
    setRules([...rules, clean]);
    setDraft("");
  };

  const finish = () => {
    update({
      onboarded: true,
      profiles: {
        a: { id: "a", name: nameA.trim(), pin: pinA },
        b: { id: "b", name: nameB.trim(), pin: pinB },
      },
      pact: rules,
      currentProfileId: null,
    });
    navigate({ to: "/login" });
  };

  return (
    <main className="min-h-screen max-w-lg mx-auto pb-24">
      <AppHeader eyebrow={stepLabel(step)} />

      <section className="px-8">
        {step === "intro" && (
          <div className="animate-in fade-in duration-700">
            <h1 className="serif italic text-5xl text-ink">Bienvenue.</h1>
            <div className="divider-gold my-6" />
            <p className="text-ink/80 leading-relaxed">
              Nous va vous accompagner en trois gestes&nbsp;:
            </p>
            <ol className="mt-6 space-y-4 text-ink/80">
              <li>
                <span className="serif italic text-2xl text-accent">I.</span>{" "}
                Créer vos deux profils.
              </li>
              <li>
                <span className="serif italic text-2xl text-accent">II.</span>{" "}
                Écrire votre pacte — vos règles à vous.
              </li>
              <li>
                <span className="serif italic text-2xl text-accent">III.</span>{" "}
                Déposer, chacun, votre première semaine.
              </li>
            </ol>
            <PrimaryButton onClick={() => setStep("profileA")}>Commencer</PrimaryButton>
          </div>
        )}

        {step === "profileA" && (
          <ProfileForm
            label="Premier profil"
            helper="Comment vous appelle-t-on ?"
            name={nameA}
            pin={pinA}
            onName={setNameA}
            onPin={setPinA}
            onNext={() => setStep("profileB")}
          />
        )}

        {step === "profileB" && (
          <ProfileForm
            label="Deuxième profil"
            helper={`Et votre partenaire ?`}
            name={nameB}
            pin={pinB}
            onName={setNameB}
            onPin={setPinB}
            onNext={() => setStep("pact")}
            onBack={() => setStep("profileA")}
          />
        )}

        {step === "pact" && (
          <div className="animate-in fade-in duration-700">
            <h2 className="serif italic text-4xl text-ink">Votre pacte</h2>
            <div className="divider-gold my-5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quelques phrases, écrites ensemble. Elles vous rappelleront, avec douceur,
              l'endroit que vous avez choisi d'habiter.
            </p>

            <div className="mt-6 space-y-2">
              {rules.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft"
                >
                  <span className="serif italic text-accent">{i + 1}.</span>
                  <span className="flex-1 text-ink/90 text-[15px]">{r}</span>
                  <button
                    onClick={() => setRules(rules.filter((_, j) => j !== i))}
                    className="text-muted-foreground text-xs hover:text-destructive"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire une règle…"
                rows={2}
                className="w-full rounded-2xl bg-card p-4 text-[15px] text-ink placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-accent/40 resize-none"
              />
              <button
                onClick={() => addRule(draft)}
                disabled={!draft.trim()}
                className="mt-2 text-sm tracking-ritual text-accent disabled:opacity-30"
              >
                + Ajouter
              </button>
            </div>

            {rules.length === 0 && (
              <div className="mt-6">
                <div className="tracking-ritual text-muted-foreground mb-2">Suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_RULES.map((r) => (
                    <button
                      key={r}
                      onClick={() => addRule(r)}
                      className="rounded-full border border-border bg-paper px-4 py-2 text-xs text-ink/80 hover:bg-secondary transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <PrimaryButton
              onClick={() => {
                setStep("done");
                setTimeout(finish, 1200);
              }}
              disabled={rules.length === 0}
            >
              Sceller notre pacte
            </PrimaryButton>
          </div>
        )}

        {step === "done" && (
          <div className="animate-in fade-in duration-1000 text-center mt-20">
            <div className="serif italic text-5xl text-accent">✦</div>
            <h2 className="serif italic text-3xl text-ink mt-6">Scellé.</h2>
            <p className="text-muted-foreground mt-3 text-sm">Nous vous ouvre la porte…</p>
          </div>
        )}
      </section>
    </main>
  );
}

function stepLabel(step: Step) {
  return (
    {
      intro: "Bienvenue",
      profileA: "I · Profil",
      profileB: "I · Profil",
      pact: "II · Pacte",
      done: "✦",
    } as const
  )[step];
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-primary text-primary-foreground py-4 tracking-ritual shadow-soft mt-10 disabled:opacity-40 transition"
    >
      {children}
    </button>
  );
}

function ProfileForm({
  label,
  helper,
  name,
  pin,
  onName,
  onPin,
  onNext,
  onBack,
}: {
  label: string;
  helper: string;
  name: string;
  pin: string;
  onName: (v: string) => void;
  onPin: (v: string) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const valid = name.trim().length >= 2 && /^\d{4}$/.test(pin);
  return (
    <div className="animate-in fade-in duration-700">
      <div className="tracking-ritual text-accent">{label}</div>
      <h2 className="serif italic text-4xl text-ink mt-3">{helper}</h2>
      <div className="divider-gold my-5" />

      <label className="block tracking-ritual text-muted-foreground mb-2">Prénom</label>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Gentiane"
        className="w-full rounded-2xl bg-card p-4 text-[17px] text-ink outline-none focus:ring-2 focus:ring-accent/40"
      />

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-6">
        Code intime · 4 chiffres
      </label>
      <input
        value={pin}
        onChange={(e) => onPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder="••••"
        className="w-full rounded-2xl bg-card p-4 text-[17px] text-ink tracking-[0.5em] outline-none focus:ring-2 focus:ring-accent/40"
      />
      <p className="text-xs text-muted-foreground mt-2 italic">
        Un petit secret, pour que seul·e vous ouvriez votre journal.
      </p>

      <div className="flex gap-3 mt-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 rounded-full border border-border py-4 tracking-ritual text-ink/70"
          >
            Retour
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex-[2] rounded-full bg-primary text-primary-foreground py-4 tracking-ritual shadow-soft disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
