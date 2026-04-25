import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSession } from "@/lib/use-couple-session";
import { useStorm } from "@/lib/use-storm";
import { isUnlocked } from "@/lib/local-lock";
import { BottomNav } from "@/components/bottom-nav";
import { StormButton } from "@/components/storm-button";
import { NotificationBell } from "@/components/notification-bell";
import type { PactRule, MemoryMoment } from "@/lib/types";

export const Route = createFileRoute("/nous")({
  head: () => ({
    meta: [
      { title: "Nous — votre espace partagé" },
      { name: "description", content: "L'arbre, les moments scellés, le pacte." },
    ],
  }),
  component: Nous,
});

function Nous() {
  const { loading, member, couple, partner } = useCoupleSession();
  const { storm } = useStorm(couple?.id);
  const navigate = useNavigate();
  const [pact, setPact] = useState<PactRule[]>([]);
  const [moments, setMoments] = useState<MemoryMoment[]>([]);
  const [positiveCount, setPositiveCount] = useState(0);
  const [defiCount, setDefiCount] = useState(0);
  const [fridayAnswersCount, setFridayAnswersCount] = useState(0);
  const [fridayWeekKeys, setFridayWeekKeys] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

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
  }, [loading, member, navigate]);

  useEffect(() => {
    if (!couple) return;
    void (async () => {
      const [
        { data: rules },
        { data: ms },
        { data: positives },
        { data: defis },
        { data: fridayRituals },
        { data: answers },
      ] = await Promise.all([
        supabase.from("pact_rules").select("*").eq("couple_id", couple.id).order("created_at"),
        supabase
          .from("memory_moments")
          .select("*")
          .eq("couple_id", couple.id)
          .order("created_at", { ascending: false }),
        supabase.from("entries").select("id").eq("couple_id", couple.id).eq("tag", "positif"),
        supabase.from("memory_moments").select("id").eq("couple_id", couple.id).eq("kind", "defi"),
        supabase
          .from("friday_rituals")
          .select("week_key")
          .eq("couple_id", couple.id)
          .order("week_key", { ascending: true }),
        supabase
          .from("friday_answers")
          .select("id, friday_rituals!inner(couple_id)")
          .eq("friday_rituals.couple_id", couple.id),
      ]);
      setPact((rules as PactRule[]) ?? []);
      setMoments((ms as MemoryMoment[]) ?? []);
      setPositiveCount(positives?.length ?? 0);
      setDefiCount(defis?.length ?? 0);
      setFridayAnswersCount(answers?.length ?? 0);
      setFridayWeekKeys(
        ((fridayRituals as { week_key: string }[] | null) ?? []).map((r) => r.week_key),
      );
    })();
  }, [couple]);

  if (loading || !member || !couple) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-muted-foreground">…</div>
      </main>
    );
  }

  const weeks = Math.max(
    1,
    Math.floor((Date.now() - new Date(couple.started_at).getTime()) / (7 * 86400000)),
  );
  const daysTogether = Math.max(
    0,
    Math.floor((Date.now() - new Date(couple.started_at).getTime()) / 86400000),
  );
  const durationBadge = getDurationBadge(daysTogether);
  const fridayStreak = longestConsecutiveWeekStreak(fridayWeekKeys);
  const actionBadges = [
    { emoji: "🎯", label: "Premier pacte", unlocked: pact.length >= 1 },
    { emoji: "🌙", label: "Premier vendredi", unlocked: fridayAnswersCount >= 1 },
    { emoji: "💚", label: "5 moments positifs", unlocked: positiveCount >= 5 },
    { emoji: "🎪", label: "Premier défi", unlocked: defiCount >= 1 },
    { emoji: "🔥", label: "3 vendredis de suite", unlocked: fridayStreak >= 3 },
  ];

  const addRule = async () => {
    if (!draft.trim()) return;
    const { data } = await supabase
      .from("pact_rules")
      .insert({
        couple_id: couple.id,
        created_by: member.user_id,
        text: draft.trim(),
      })
      .select("*")
      .single();
    if (data) setPact([...pact, data as PactRule]);
    setDraft("");
  };

  const removeRule = async (id: string) => {
    await supabase.from("pact_rules").delete().eq("id", id);
    setPact(pact.filter((p) => p.id !== id));
  };

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-28">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="tracking-ritual text-muted-foreground">Vous deux</div>
            <h1 className="serif text-3xl text-ink">
              {member.display_name} <span className="text-emerald">&</span>{" "}
              {partner?.display_name ?? "…"}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StormButton coupleId={couple.id} />
            <NotificationBell userId={member.user_id} coupleId={couple.id} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Vous cultivez votre relation depuis{" "}
          <span className="text-ink font-semibold">
            {weeks} semaine{weeks > 1 ? "s" : ""}
          </span>
          .
        </p>
        {!partner && (
          <div className="mt-4 rounded-2xl border-2 border-ink bg-sunshine/30 p-4 text-sm text-ink">
            En attente de l'autre. Donne le code{" "}
            <span className="serif text-emerald font-semibold tracking-widest">{couple.code}</span>{" "}
            à ton/ta partenaire.
          </div>
        )}
        {storm && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 mb-4 text-sm text-ink mt-4">
            💙{" "}
            <strong>{storm.started_by === member.user_id ? "Toi" : partner?.display_name}</strong>{" "}
            ne se sent pas bien en ce moment — mais ce n&apos;est pas de ta faute. Donne-lui un peu
            d&apos;espace. 🌿
          </div>
        )}
      </header>

      <section className="rounded-3xl border-2 border-ink bg-card p-6 shadow-flat">
        <div className="tracking-ritual text-muted-foreground mb-2">Progression du couple</div>
        <div className="rounded-2xl border-2 border-ink bg-paper p-4">
          <div className="text-sm text-muted-foreground">Niveau {durationBadge.level}</div>
          <div className="text-xl text-ink font-semibold mt-1">
            {durationBadge.levelLabel} — Vous êtes officiellement une{" "}
            {durationBadge.name.toLowerCase()} {durationBadge.emoji}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {daysTogether} jours ensemble · {weeks} semaine{weeks > 1 ? "s" : ""}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {actionBadges.map((badge) => (
            <div
              key={badge.label}
              className={`rounded-2xl border-2 p-3 text-sm ${badge.unlocked ? "border-emerald bg-emerald/10 text-ink" : "border-ink/20 bg-muted text-muted-foreground"}`}
            >
              <div className="font-semibold">
                {badge.unlocked ? `${badge.emoji} ${badge.label}` : `🔒 ${badge.label}`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="serif text-2xl text-ink mb-3">Moments marquants</h2>
        {moments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Vos +1 et rituels apparaîtront ici, comme un carnet partagé.
          </p>
        ) : (
          <ul className="space-y-2">
            {moments.slice(0, 30).map((m) => (
              <li key={m.id} className="rounded-2xl border-2 border-ink bg-card p-3 flex gap-3">
                <div className="text-xl">
                  {m.kind === "positive" ? "💚" : m.kind === "ritual" ? "🌙" : "✨"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-ink truncate">{m.title}</div>
                  {m.body && <div className="text-xs text-muted-foreground mt-0.5">{m.body}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(m.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="serif text-2xl text-ink mb-3">Le pacte</h2>
        <div className="space-y-2">
          {pact.map((p, i) => (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-card p-3"
            >
              <span className="serif text-xl text-emerald font-medium">{i + 1}.</span>
              <span className="flex-1 text-ink text-[15px]">{p.text}</span>
              {p.created_by === member.user_id && (
                <button
                  onClick={() => removeRule(p.id)}
                  className="text-muted-foreground text-lg leading-none"
                  aria-label="Retirer"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="rounded-2xl border-2 border-dashed border-ink bg-paper p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ajouter une règle qui compte pour vous deux…"
              rows={2}
              className="w-full bg-transparent p-2 text-[15px] text-ink placeholder:text-muted-foreground/60 outline-none resize-none"
            />
            <button
              onClick={addRule}
              disabled={!draft.trim()}
              className="text-xs tracking-ritual text-emerald disabled:opacity-30 px-2"
            >
              + Ajouter au pacte
            </button>
          </div>
        </div>
      </section>

      <Link
        to="/"
        className="block text-center mt-10 text-xs tracking-ritual text-muted-foreground"
      >
        Accueil
      </Link>
      <BottomNav />
    </main>
  );
}

function getDurationBadge(days: number) {
  if (days <= 6) return { emoji: "🌱", name: "Graine", level: 1, levelLabel: "Niveau 1" };
  if (days <= 29) return { emoji: "🌿", name: "Pousse", level: 2, levelLabel: "Niveau 2" };
  if (days <= 89) return { emoji: "🌳", name: "Arbuste", level: 3, levelLabel: "Niveau 3" };
  if (days <= 179) return { emoji: "🏡", name: "Nid solide", level: 4, levelLabel: "Niveau 4" };
  return {
    emoji: "💎",
    name: "Diamant",
    level: 5,
    levelLabel: "Niveau 5",
  };
}

function longestConsecutiveWeekStreak(weekKeys: string[]): number {
  let streak = 0;
  let best = 0;
  let prev: { year: number; week: number } | null = null;
  for (const key of weekKeys) {
    const [yearPart, weekPart] = key.split("-W");
    const year = Number(yearPart);
    const week = Number(weekPart);
    if (!Number.isFinite(year) || !Number.isFinite(week)) continue;
    if (!prev) {
      streak = 1;
    } else {
      const sameYearNext = year === prev.year && week === prev.week + 1;
      const crossYearNext = year === prev.year + 1 && prev.week >= 52 && week === 1;
      streak = sameYearNext || crossYearNext ? streak + 1 : 1;
    }
    prev = { year, week };
    best = Math.max(best, streak);
  }
  return best;
}
