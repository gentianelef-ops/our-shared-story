import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSession } from "@/lib/use-couple-session";
import { isUnlocked, lock } from "@/lib/local-lock";
import { BottomNav } from "@/components/bottom-nav";
import { StormButton } from "@/components/storm-button";
import { NotificationBell } from "@/components/notification-bell";
import type { Entry, PactRule, Tag, Member } from "@/lib/types";
import { Lock, LogOut } from "lucide-react";

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
  { id: "emotion", emoji: "🌊", label: "Émotion", sub: "Ce que tu ressens, sans filtre" },
];

function Journal() {
  const { loading, member, couple } = useCoupleSession();
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

  const positives = entries.filter((e) => e.tag === "positif").length;
  const emotions = entries.filter((e) => e.tag === "emotion").length;
  const total = entries.length;
  const score = total === 0 ? 0 : (positives - emotions) / total;
  const meterPos = 50 + Math.max(-1, Math.min(1, score)) * 40;

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

      <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-flat">
        <div className="tracking-ritual text-muted-foreground mb-3">
          Ta semaine en un coup d'œil
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl">😔</span>
          <div className="relative flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-storm/40 via-emerald/20 to-emerald/40" />
            <div
              className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-2 border-ink bg-paper shadow-flat transition-all"
              style={{ left: `calc(${meterPos}% - 8px)` }}
            />
          </div>
          <span className="text-xl">😊</span>
        </div>
      </div>

      <h2 className="serif text-2xl text-ink mt-10 mb-4">Déposer</h2>
      <div className="space-y-3">
        {TAGS.map((t) => (
          <Composer key={t.id} tag={t} member={member} onSaved={refreshEntries} />
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
        <LogOut className="inline size-3 mr-1" /> Se déconnecter
      </button>

      <BottomNav />
    </main>
  );
}

function Composer({
  tag,
  member,
  onSaved,
}: {
  tag: { id: Tag; emoji: string; label: string; sub: string };
  member: Member;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setShare(true);
    setErr(null);
    setOpen(false);
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
        reformulated: null,
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
        onChange={(e) => setText(e.target.value)}
        placeholder={
          tag.id === "emotion"
            ? "Dis-le comme tu le ressens. Brut."
            : tag.id === "pacte"
              ? "Une nouvelle règle à proposer pour votre pacte…"
              : "Un moment qui t'a fait du bien."
        }
        rows={3}
        className="w-full bg-transparent p-2 text-[15px] text-ink placeholder:text-muted-foreground/60 outline-none resize-none border-b-2 border-ink/10"
      />

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
