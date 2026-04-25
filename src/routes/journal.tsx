import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSession } from "@/lib/use-couple-session";
import { useStorm } from "@/lib/use-storm";
import { isUnlocked, lock } from "@/lib/local-lock";
import { BottomNav } from "@/components/bottom-nav";
import { StormButton } from "@/components/storm-button";
import { NotificationBell } from "@/components/notification-bell";
import type { Entry, PactRule, Tag, Member } from "@/lib/types";
import { Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "JE — Nous" },
      { name: "description", content: "Dépose ce qui compte. Vendredi, on partage." },
    ],
  }),
  component: Journal,
});

const TAGS: { id: Tag; emoji: string; label: string; sub: string }[] = [
  { id: "positif", emoji: "💚", label: "+1", sub: "Un moment qui fait du bien" },
  {
    id: "pacte",
    emoji: "💡",
    label: "Idée pacte",
    sub: "Propose une nouvelle règle pour vendredi",
  },
  { id: "emotion", emoji: "🌊", label: "Émotion", sub: "À traduire en CNV" },
];

function Journal() {
  const { loading, member, couple } = useCoupleSession();
  const { storm } = useStorm(couple?.id);
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pact, setPact] = useState<PactRule[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!member) {
      navigate({ to: "/" });
      return;
    }
    if (!isUnlocked(member.id)) {
      navigate({ to: "/login" });
      return;
    }
    setUnlocked(true);
  }, [loading, member, navigate]);

  useEffect(() => {
    if (!unlocked || !couple || !member) return;
    void (async () => {
      const { data: ents } = await supabase
        .from("entries")
        .select("*")
        .eq("author_id", member.user_id)
        .order("created_at", { ascending: false });
      setEntries((ents as Entry[]) ?? []);
      const { data: rules } = await supabase
        .from("pact_rules")
        .select("*")
        .eq("couple_id", couple.id);
      setPact((rules as PactRule[]) ?? []);
    })();
  }, [unlocked, couple, member]);

  const refreshEntries = async () => {
    if (!member) return;
    const { data } = await supabase
      .from("entries")
      .select("*")
      .eq("author_id", member.user_id)
      .order("created_at", { ascending: false });
    setEntries((data as Entry[]) ?? []);
  };

  if (loading || !unlocked || !member || !couple) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-muted-foreground">…</div>
      </main>
    );
  }

  const counts = {
    positif: entries.filter((e) => e.tag === "positif").length,
    pacte: entries.filter((e) => e.tag === "pacte").length,
    emotion: entries.filter((e) => e.tag === "emotion").length,
  };

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-28">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="tracking-ritual text-muted-foreground">Bonjour</div>
          <h1 className="serif text-3xl text-ink">{member.display_name}.</h1>
        </div>
        <div className="flex items-center gap-2">
          <StormButton coupleId={couple.id} />
          <NotificationBell userId={member.user_id} coupleId={couple.id} />
          <button
            onClick={() => {
              lock();
              navigate({ to: "/login" });
            }}
            className="rounded-full border-2 border-ink p-2 text-ink"
            aria-label="Verrouiller"
          >
            <Lock className="size-4" />
          </button>
        </div>
      </header>

      {storm && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 mb-4 text-sm text-ink">
          💙 <strong>{storm.started_by === member.user_id ? "Toi" : "Ton/ta partenaire"}</strong> ne
          se sent pas bien en ce moment — mais ce n&apos;est pas de ta faute. Donne-lui un peu
          d&apos;espace. 🌿
        </div>
      )}

      <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-flat">
        <div className="tracking-ritual text-muted-foreground mb-3">Mon espace cette semaine</div>
        <div className="grid grid-cols-3 gap-3">
          <Counter emoji="💚" n={counts.positif} label="+1" />
          <Counter emoji="📜" n={counts.pacte} label="Pacte" />
          <Counter emoji="🌊" n={counts.emotion} label="Émo" />
        </div>
      </div>

      <h2 className="serif text-2xl text-ink mt-10 mb-4">Déposer</h2>
      <div className="space-y-3">
        {TAGS.map((t) => (
          <Composer
            key={t.id}
            tag={t}
            member={member}
            pactRules={pact.map((p) => p.text)}
            onSaved={refreshEntries}
          />
        ))}
      </div>

      <h2 className="serif text-2xl text-ink mt-10 mb-4">Tes dépôts</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Rien encore. La page est blanche, tant mieux.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onChange={refreshEntries} />
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          lock();
          navigate({ to: "/" });
        }}
        className="block w-full text-center mt-8 text-xs tracking-ritual text-muted-foreground"
      >
        Accueil
      </button>

      <BottomNav />
    </main>
  );
}

function Counter({ emoji, n, label }: { emoji: string; n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-paper border-2 border-ink p-3 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="serif text-2xl text-emerald mt-1">{n}</div>
      <div className="tracking-ritual text-muted-foreground">{label}</div>
    </div>
  );
}

function Composer({
  tag,
  member,
  pactRules,
  onSaved,
}: {
  tag: { id: Tag; emoji: string; label: string; sub: string };
  member: Member;
  pactRules: string[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setTranslated(null);
    setShare(true);
    setErr(null);
    setOpen(false);
  };

  const translate = async () => {
    if (!text.trim()) return;
    setTranslating(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("translate-emotion", {
        body: { raw: text, pactRules },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTranslated(data.reformulated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de la traduction.");
    } finally {
      setTranslating(false);
    }
  };

  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase.from("entries").insert({
        couple_id: member.couple_id,
        author_id: member.user_id,
        tag: tag.id,
        raw: text.trim(),
        reformulated: translated,
        will_share: share,
      });
      if (error) throw error;
      if (tag.id === "positif") {
        await supabase.from("tree_events").insert({ couple_id: member.couple_id, kind: "flower" });
        await supabase.from("memory_moments").insert({
          couple_id: member.couple_id,
          kind: "positive",
          title: text.trim().slice(0, 80),
          body: null,
        });
      }
      reset();
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left flex items-center gap-4 rounded-2xl border-2 border-ink bg-card p-4 shadow-flat hover:bg-paper transition"
      >
        <div className="text-3xl">{tag.emoji}</div>
        <div>
          <div className="font-semibold text-ink">{tag.label}</div>
          <div className="text-sm text-muted-foreground">{tag.sub}</div>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-flat">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{tag.emoji}</div>
        <div className="font-semibold text-ink flex-1">{tag.label}</div>
        <button onClick={reset} className="text-muted-foreground text-xl leading-none">
          ×
        </button>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setTranslated(null);
        }}
        placeholder={
          tag.id === "emotion"
            ? "Dis-le brut. On le reformulera ensemble."
            : tag.id === "pacte"
              ? "Une nouvelle règle à proposer pour votre pacte…"
              : "Un moment qui t'a fait du bien."
        }
        rows={3}
        className="w-full bg-transparent p-2 text-[15px] text-ink placeholder:text-muted-foreground/60 outline-none resize-none border-b-2 border-ink/10"
      />

      {tag.id === "emotion" && (
        <div className="mt-3">
          <button
            onClick={translate}
            disabled={translating || !text.trim()}
            className="text-xs tracking-ritual text-emerald inline-flex items-center gap-1 disabled:opacity-30"
          >
            <Sparkles className="size-3" />
            {translating ? "Traduction…" : "Version CNV"}
          </button>
          {translated && (
            <div className="mt-3 rounded-xl border-2 border-emerald bg-emerald/5 p-3 text-[15px] text-ink italic">
              {translated}
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 mt-4 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={share}
          onChange={(e) => setShare(e.target.checked)}
          className="size-4 accent-emerald"
        />
        Partager vendredi
      </label>

      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

      <button
        onClick={save}
        disabled={!text.trim() || busy}
        className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-3 tracking-ritual mt-4 disabled:opacity-40"
      >
        {busy ? "…" : "Déposer"}
      </button>
    </div>
  );
}

function EntryCard({ entry, onChange }: { entry: Entry; onChange: () => void }) {
  const tagInfo = TAGS.find((t) => t.id === entry.tag)!;
  const remove = async () => {
    await supabase.from("entries").delete().eq("id", entry.id);
    onChange();
  };
  return (
    <li className="rounded-2xl border-2 border-ink bg-card p-4 shadow-flat">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{tagInfo.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] text-ink">{entry.raw}</div>
          {entry.reformulated && (
            <div className="mt-2 text-[14px] italic text-emerald border-l-2 border-emerald pl-3">
              {entry.reformulated}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {new Date(entry.created_at).toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            {entry.will_share && <span className="tracking-ritual text-emerald">• vendredi</span>}
          </div>
        </div>
        <button
          onClick={remove}
          className="text-muted-foreground text-lg leading-none"
          aria-label="Supprimer"
        >
          ×
        </button>
      </div>
    </li>
  );
}
