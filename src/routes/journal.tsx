import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNous, reformulateCNV, type EntryTag, type JournalEntry } from "@/lib/nous-store";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [{ title: "Mon journal — Nous" }],
  }),
  component: Journal,
});

const TAGS: { id: EntryTag; icon: string; label: string; hint: string }[] = [
  { id: "positif", icon: "💛", label: "Positif", hint: "Un moment de lumière." },
  { id: "pacte", icon: "🤍", label: "Pacte rompu", hint: "Une règle que nous avons oubliée." },
  { id: "emotion", icon: "🌊", label: "Émotion", hint: "Une vague qui est passée." },
];

function startOfWeek(ts: number) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function Journal() {
  const { state, update } = useNous();
  const navigate = useNavigate();

  const [tag, setTag] = useState<EntryTag>("positif");
  const [raw, setRaw] = useState("");
  const [reform, setReform] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!state.onboarded) navigate({ to: "/" });
    else if (!state.currentProfileId) navigate({ to: "/login" });
  }, [state.onboarded, state.currentProfileId, navigate]);

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

  const translate = () => {
    setReform(reformulateCNV(raw));
  };

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

  return (
    <main className="min-h-screen max-w-lg mx-auto pb-32">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 flex items-center justify-between">
        <div>
          <div className="tracking-ritual text-muted-foreground">{weekday} · {dayNum}</div>
          <h1 className="serif italic text-3xl text-ink mt-1">{me.name}</h1>
        </div>
        <button
          onClick={logout}
          className="tracking-ritual text-muted-foreground text-xs"
          aria-label="Fermer"
        >
          Fermer
        </button>
      </header>

      {/* Pacte rappel */}
      {state.pact.length > 0 && (
        <section className="mx-6 mb-6 rounded-2xl border border-border/60 bg-paper/60 p-5">
          <div className="tracking-ritual text-accent mb-2">Notre pacte</div>
          <ul className="space-y-1 text-[14px] text-ink/80 italic">
            {state.pact.slice(0, 3).map((r, i) => (
              <li key={i}>— {r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Compose */}
      <section className="px-6">
        <div className="rounded-3xl bg-card shadow-soft p-5">
          <div className="flex gap-2 mb-4">
            {TAGS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTag(t.id);
                  setReform(null);
                }}
                className={`flex-1 rounded-full py-2 px-3 text-xs tracking-ritual transition ${
                  tag === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground italic mb-3">
            {TAGS.find((t) => t.id === tag)?.hint}
          </p>

          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setReform(null);
            }}
            rows={4}
            placeholder={
              tag === "emotion"
                ? "Écris sans filtrer. Nous t'aiderons à traduire…"
                : "Dépose tes mots ici."
            }
            className="w-full bg-transparent text-ink placeholder:text-muted-foreground/60 outline-none resize-none text-[16px] leading-relaxed"
          />

          {reform && (
            <div className="mt-4 rounded-2xl bg-secondary/70 p-4 border-l-2 border-accent animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="tracking-ritual text-accent mb-2">Autrement dit</div>
              <p className="italic text-ink/90 leading-relaxed">{reform}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {canReformulate && (
              <button
                onClick={translate}
                className="flex-1 rounded-full border border-accent/40 text-accent py-3 tracking-ritual text-xs hover:bg-accent/10 transition"
              >
                Traduire avec douceur
              </button>
            )}
            <button
              onClick={addEntry}
              disabled={!raw.trim()}
              className="flex-[2] rounded-full bg-primary text-primary-foreground py-3 tracking-ritual text-xs shadow-soft disabled:opacity-30"
            >
              Déposer
            </button>
          </div>

          {saved && (
            <p className="text-center text-xs italic text-accent mt-3 animate-in fade-in duration-300">
              ✦ Déposé, en silence.
            </p>
          )}
        </div>
      </section>

      {/* Entries */}
      <section className="px-6 mt-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="serif italic text-2xl text-ink">Ma semaine</h2>
          <span className="tracking-ritual text-muted-foreground">
            {myWeekEntries.length} {myWeekEntries.length > 1 ? "moments" : "moment"}
          </span>
        </div>

        {myWeekEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Rien encore. La page est vierge, comme un matin.
          </p>
        ) : (
          <div className="space-y-3">
            {myWeekEntries.map((e) => {
              const t = TAGS.find((x) => x.id === e.tag)!;
              const d = new Date(e.createdAt);
              return (
                <article
                  key={e.id}
                  className="rounded-2xl bg-card p-5 shadow-soft animate-in fade-in duration-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="tracking-ritual text-muted-foreground">
                      {t.icon} {t.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("fr-FR", { weekday: "short" })} ·{" "}
                      {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <p className="text-ink/90 leading-relaxed text-[15px]">{e.raw}</p>
                  {e.reformulated && (
                    <p className="mt-3 text-[14px] italic text-ink/70 border-l-2 border-accent pl-3">
                      {e.reformulated}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <button
                      onClick={() => toggleShare(e.id)}
                      className={`text-xs tracking-ritual transition ${
                        e.willShare ? "text-accent" : "text-muted-foreground hover:text-ink"
                      }`}
                    >
                      {e.willShare ? "✓ À partager vendredi" : "+ Partager vendredi"}
                    </button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      aria-label="Retirer"
                    >
                      retirer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="text-center mt-16 text-xs text-muted-foreground italic px-8">
        Tes mots restent ici, avec toi, jusqu'à vendredi.
      </footer>
    </main>
  );
}
