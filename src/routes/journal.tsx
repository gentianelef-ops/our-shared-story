import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNous, reformulateCNV, type EntryTag, type JournalEntry } from "@/lib/nous-store";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [{ title: "Ma manche — Nous" }],
  }),
  component: Journal,
});

const TAGS: {
  id: EntryTag;
  icon: string;
  label: string;
  hint: string;
  bg: string;
}[] = [
  { id: "positif", icon: "💛", label: "+1", hint: "Un truc cool. Un geste qui t'a touché·e. Note-le avant de l'oublier.", bg: "bg-sunshine" },
  { id: "pacte", icon: "🎯", label: "Pacte", hint: "Une règle qu'on a (un peu ou beaucoup) zappée cette fois.", bg: "bg-emerald-soft" },
  { id: "emotion", icon: "🔥", label: "Émotion", hint: "Écris brut. On t'aide à traduire après.", bg: "bg-coral/70" },
];

function startOfWeek(ts: number) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function Journal() {
  const { state, update, hydrated } = useNous();
  const navigate = useNavigate();

  const [tag, setTag] = useState<EntryTag>("positif");
  const [raw, setRaw] = useState("");
  const [reform, setReform] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboarded) navigate({ to: "/" });
    else if (!state.currentProfileId) navigate({ to: "/login" });
  }, [hydrated, state.onboarded, state.currentProfileId, navigate]);

  const me = state.currentProfileId ? state.profiles[state.currentProfileId] : null;
  const weekStart = useMemo(() => startOfWeek(Date.now()), []);

  const myWeekEntries = useMemo(
    () =>
      state.entries
        .filter((e) => e.authorId === state.currentProfileId && e.createdAt >= weekStart)
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.entries, state.currentProfileId, weekStart],
  );

  if (!me) return null;

  const canReformulate = tag === "emotion" && raw.trim().length > 3;

  const translate = () => setReform(reformulateCNV(raw));

  const addEntry = () => {
    const text = raw.trim();
    if (!text) return;
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      authorId: me.id,
      tag,
      raw: text,
      reformulated: reform ?? undefined,
      createdAt: Date.now(),
      willShare: false,
    };
    update((s) => ({ ...s, entries: [entry, ...s.entries] }));
    setRaw("");
    setReform(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const toggleShare = (id: string) => {
    update((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === id ? { ...e, willShare: !e.willShare } : e)),
    }));
  };

  const deleteEntry = (id: string) => {
    update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
  };

  const logout = () => {
    update({ currentProfileId: null });
    navigate({ to: "/login" });
  };

  const now = new Date();
  const weekday = now.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayNum = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const toShareCount = myWeekEntries.filter((e) => e.willShare).length;

  return (
    <main className="min-h-screen max-w-lg mx-auto pb-32 px-6">
      {/* Header */}
      <header className="pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald text-accent-foreground serif text-xl font-medium border-2 border-ink">
            {me.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="font-semibold text-ink leading-tight">{me.name}</div>
            <div className="tracking-ritual text-muted-foreground">
              {weekday} · {dayNum}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-full border-2 border-ink px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunshine transition"
        >
          Sortir
        </button>
      </header>

      {/* Score bar */}
      <section className="mt-2 rounded-2xl border-2 border-ink bg-ink text-primary-foreground p-4 flex items-center justify-between">
        <div>
          <div className="tracking-ritual opacity-60">Ma manche</div>
          <div className="serif text-2xl">
            {myWeekEntries.length}{" "}
            <span className="opacity-60 text-base">
              {myWeekEntries.length > 1 ? "dépôts" : "dépôt"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="tracking-ritual opacity-60">À partager</div>
          <div className="serif text-2xl text-emerald">
            {toShareCount}{" "}
            <span className="opacity-60 text-base text-primary-foreground">/ ven.</span>
          </div>
        </div>
      </section>

      {/* Pacte rappel */}
      {state.pact.length > 0 && (
        <section className="mt-4 rounded-2xl border-2 border-ink bg-card p-4">
          <div className="tracking-ritual text-emerald mb-2">📜 Le pacte</div>
          <ul className="space-y-1 text-[14px] text-ink">
            {state.pact.slice(0, 3).map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald font-semibold">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Compose */}
      <section className="mt-6">
        <div className="rounded-3xl border-2 border-ink bg-card shadow-flat p-5">
          <div className="tracking-ritual text-muted-foreground mb-3">Nouveau dépôt</div>

          <div className="flex gap-2 mb-4">
            {TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTag(t.id);
                  setReform(null);
                }}
                className={`flex-1 rounded-2xl border-2 border-ink py-3 px-2 text-xs font-semibold transition ${
                  tag === t.id ? `${t.bg} shadow-flat` : "bg-paper hover:bg-sunshine/40"
                }`}
              >
                <div className="text-xl mb-0.5">{t.icon}</div>
                {t.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-ink/60 mb-3">{TAGS.find((t) => t.id === tag)?.hint}</p>

          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setReform(null);
            }}
            rows={4}
            placeholder={
              tag === "emotion"
                ? "Lâche tout. « il m'a soûlé·e quand… »"
                : tag === "positif"
                ? "Exemple : café apporté sans un mot, mardi matin."
                : "Exemple : on a eu LA petite pique au dîner."
            }
            className="w-full bg-paper rounded-2xl border-2 border-ink p-3 text-ink placeholder:text-muted-foreground/60 outline-none focus:shadow-flat resize-none text-[15px] leading-relaxed transition"
          />

          {reform && (
            <div className="mt-4 rounded-2xl border-2 border-ink bg-emerald-soft p-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="tracking-ritual text-ink mb-2">✨ Version diplomatique</div>
              <p className="text-ink/90 leading-relaxed">{reform}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {canReformulate && (
              <button
                onClick={translate}
                className="flex-1 rounded-full border-2 border-ink bg-paper py-3 tracking-ritual text-ink hover:bg-sunshine transition"
              >
                ✨ Traduire
              </button>
            )}
            <button
              onClick={addEntry}
              disabled={!raw.trim()}
              className="btn-flat flex-[2] rounded-full bg-emerald text-accent-foreground py-3 tracking-ritual disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Déposer +
            </button>
          </div>

          {saved && (
            <p className="text-center text-xs font-semibold text-emerald mt-3 animate-in fade-in duration-300">
              ✓ Dans ta boîte, au chaud.
            </p>
          )}
        </div>
      </section>

      {/* Entries */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="serif text-3xl text-ink">Cette semaine</h2>
          <span className="tracking-ritual text-muted-foreground">
            {myWeekEntries.length} {myWeekEntries.length > 1 ? "dépôts" : "dépôt"}
          </span>
        </div>

        {myWeekEntries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/30 bg-transparent p-8 text-center">
            <div className="text-4xl mb-2">🎲</div>
            <p className="text-sm text-ink/70 font-medium">
              Plateau vierge. La partie commence dès ton premier dépôt.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myWeekEntries.map((e) => {
              const t = TAGS.find((x) => x.id === e.tag)!;
              const d = new Date(e.createdAt);
              return (
                <article
                  key={e.id}
                  className={`rounded-2xl border-2 border-ink bg-card p-5 shadow-flat animate-in fade-in duration-500`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink ${t.bg} px-2.5 py-0.5 text-xs font-semibold text-ink`}
                    >
                      <span>{t.icon}</span>
                      {t.label}
                    </span>
                    <div className="tracking-ritual text-muted-foreground">
                      {d.toLocaleDateString("fr-FR", { weekday: "short" })} ·{" "}
                      {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <p className="text-ink leading-relaxed text-[15px]">{e.raw}</p>
                  {e.reformulated && (
                    <p className="mt-3 text-[14px] italic text-ink/70 border-l-4 border-emerald pl-3">
                      {e.reformulated}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t-2 border-dashed border-ink/20">
                    <button
                      onClick={() => toggleShare(e.id)}
                      className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-semibold transition ${
                        e.willShare
                          ? "bg-emerald text-accent-foreground shadow-flat"
                          : "bg-paper text-ink hover:bg-sunshine"
                      }`}
                    >
                      {e.willShare ? "✓ Partagé vendredi" : "+ Partager vendredi"}
                    </button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      aria-label="Retirer"
                    >
                      supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="text-center mt-12 text-xs text-muted-foreground px-6">
        🔒 Tout reste ici, avec toi, jusqu'à vendredi 21h.
      </footer>
    </main>
  );
}
