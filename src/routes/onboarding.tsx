import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useNous } from "@/lib/nous-store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "On joue — Nous" },
      { name: "description", content: "Créez vos deux profils et vos règles du jeu." },
    ],
  }),
  component: Onboarding,
});

type Step = "intro" | "profileA" | "profileB" | "pact" | "done";

const SUGGESTED_RULES = [
  "Pas de sarcasme déguisé en humour.",
  "Une gratitude par jour, minimum.",
  "On ne s'endort pas fâché·es.",
  "On s'écoute 2 minutes sans couper.",
  "Le téléphone reste loin au dîner.",
  "On s'embrasse avant de partir.",
];

function Onboarding() {
  const { update } = useNous();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");

  const [nameA, setNameA] = useState("");
  const [pinA, setPinA] = useState("");
  const [nameB, setNameB] = useState("");
  const [pinB, setPinB] = useState("");

  const [rules, setRules] = useState<string[]>([]);
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

  const progress =
    step === "intro" ? 0 : step === "profileA" ? 33 : step === "profileB" ? 66 : 100;

  return (
    <main className="min-h-screen max-w-lg mx-auto pb-24 px-6 pt-8">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-10">
        <Link to="/" className="tracking-ritual text-muted-foreground">
          ← Nous
        </Link>
        <div className="flex-1 h-2 rounded-full border-2 border-ink overflow-hidden bg-card">
          <div
            className="h-full bg-emerald transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="tracking-ritual text-muted-foreground">{progress}%</span>
      </div>

      {step === "intro" && (
        <div className="animate-in fade-in duration-500">
          <Badge>Niveau 0 · Tutoriel</Badge>
          <h1 className="serif text-5xl text-ink mt-4 leading-[0.95]">
            Bienvenue dans <span className="italic text-emerald">votre partie.</span>
          </h1>
          <p className="text-ink/70 mt-5 text-[16px] leading-relaxed">
            3 étapes, 90 secondes. Après, vous jouez.
          </p>

          <div className="space-y-3 mt-8">
            <RuleCard icon="👤" title="Deux profils" sub="Un prénom, un code à 4 chiffres. C'est tout." />
            <RuleCard icon="📜" title="Vos règles" sub="Quelques phrases signées par vous deux." />
            <RuleCard icon="🎮" title="Puis, on joue" sub="Chacun dépose sa semaine. Vendredi, on révèle." />
          </div>

          <Primary onClick={() => setStep("profileA")}>C'est parti →</Primary>
        </div>
      )}

      {step === "profileA" && (
        <ProfileForm
          badge="Joueur 1"
          helper="Toi, d'abord."
          name={nameA}
          pin={pinA}
          onName={setNameA}
          onPin={setPinA}
          onNext={() => setStep("profileB")}
        />
      )}

      {step === "profileB" && (
        <ProfileForm
          badge="Joueur 2"
          helper="Et l'autre moitié ?"
          name={nameB}
          pin={pinB}
          onName={setNameB}
          onPin={setPinB}
          onNext={() => setStep("pact")}
          onBack={() => setStep("profileA")}
        />
      )}

      {step === "pact" && (
        <div className="animate-in fade-in duration-500">
          <Badge>Niveau 3 · Règles du jeu</Badge>
          <h2 className="serif text-4xl text-ink mt-4 leading-[0.95]">
            Le pacte. <span className="italic text-emerald">Vos règles.</span>
          </h2>
          <p className="text-sm text-ink/70 mt-4 leading-relaxed">
            Écrivez ce qui compte <em>vraiment</em> pour vous deux. Ni trop, ni moralisant.
            Juste ce qui vous fait du bien.
          </p>

          <div className="mt-6 space-y-2">
            {rules.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-card p-4 shadow-flat"
              >
                <span className="serif text-xl text-emerald font-medium">{i + 1}.</span>
                <span className="flex-1 text-ink text-[15px]">{r}</span>
                <button
                  onClick={() => setRules(rules.filter((_, j) => j !== i))}
                  className="text-muted-foreground text-lg hover:text-destructive leading-none"
                  aria-label="Retirer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border-2 border-ink bg-card p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire votre règle…"
              rows={2}
              className="w-full bg-transparent p-2 text-[15px] text-ink placeholder:text-muted-foreground/60 outline-none resize-none"
            />
            <button
              onClick={() => addRule(draft)}
              disabled={!draft.trim()}
              className="text-xs tracking-ritual text-emerald disabled:opacity-30 px-2"
            >
              + Ajouter
            </button>
          </div>

          <div className="mt-6">
            <div className="tracking-ritual text-muted-foreground mb-2">Inspirations</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_RULES.filter((r) => !rules.includes(r)).map((r) => (
                <button
                  key={r}
                  onClick={() => addRule(r)}
                  className="rounded-full border-2 border-ink bg-paper px-3 py-1.5 text-xs text-ink hover:bg-sunshine transition"
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>

          <Primary
            onClick={() => {
              setStep("done");
              setTimeout(finish, 1200);
            }}
            disabled={rules.length === 0}
          >
            Signer le pacte ✓
          </Primary>
        </div>
      )}

      {step === "done" && (
        <div className="animate-in fade-in duration-1000 text-center mt-24">
          <div className="text-6xl">🎉</div>
          <h2 className="serif text-4xl text-ink mt-6">Signé.</h2>
          <p className="text-muted-foreground mt-3 text-sm">Le plateau est prêt…</p>
        </div>
      )}
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-ink px-3 py-1 tracking-ritual text-primary-foreground">
      {children}
    </span>
  );
}

function RuleCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-card p-4 shadow-flat">
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="font-semibold text-ink">{title}</div>
        <div className="text-sm text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Primary({
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
      className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual mt-10 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function ProfileForm({
  badge,
  helper,
  name,
  pin,
  onName,
  onPin,
  onNext,
  onBack,
}: {
  badge: string;
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
    <div className="animate-in fade-in duration-500">
      <Badge>{badge}</Badge>
      <h2 className="serif text-5xl text-ink mt-4 leading-[0.95]">{helper}</h2>
      <p className="text-sm text-ink/60 mt-3">Deux infos. Ni plus, ni moins.</p>

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-8">Prénom</label>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Ton prénom"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[17px] text-ink outline-none focus:shadow-flat transition"
      />

      <label className="block tracking-ritual text-muted-foreground mb-2 mt-6">
        Code secret · 4 chiffres
      </label>
      <input
        value={pin}
        onChange={(e) => onPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        placeholder="••••"
        className="w-full rounded-2xl border-2 border-ink bg-card p-4 text-[22px] text-ink tracking-[0.6em] text-center outline-none focus:shadow-flat transition"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Pour que toi seul·e ouvres ton journal. Même pas l'autre.
      </p>

      <div className="flex gap-3 mt-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 rounded-full border-2 border-ink py-4 tracking-ritual text-ink"
          >
            ← Retour
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!valid}
          className="btn-flat flex-[2] rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}
