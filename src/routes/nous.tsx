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

type FeelGoodTag = "🌿 calme" | "⚡ aventure" | "🔥 complicité" | "💆 douceur";
type FeelGoodItem = { id: string; text: string; tag: FeelGoodTag; pinned: boolean };
const FEEL_GOOD_STORAGE_KEY = "feel_good_items";
const WEEKLY_CHALLENGES = [
  "Cuisinez un plat que vous n'avez jamais fait ensemble",
  "Éteignez vos téléphones 2h et faites quelque chose ensemble",
  "Écrivez chacun 3 choses que vous aimez chez l'autre et lisez-les à voix haute",
  "Faites une balade dans un endroit que vous n'avez jamais exploré",
  "Regardez un film que ni l'un ni l'autre n'a vu",
  "Faites un pique-nique improvisé",
  "Apprenez quelque chose ensemble en 30 minutes",
  "Faites une soirée sans écrans",
  "Cuisinez le plat préféré de l'autre",
  "Écrivez une lettre à votre couple dans 1 an",
  "Faites une activité que l'autre adore mais pas vous",
  "Prenez des photos de votre journée et partagez-les le soir",
  "Faites un massage de 10 minutes chacun",
  "Planifiez votre prochaine aventure ensemble",
  "Dansez dans votre salon",
  "Faites un jeu de société ensemble",
  "Visitez un endroit de votre ville que vous ne connaissez pas",
  "Préparez le petit-déjeuner au lit",
  "Regardez les étoiles ensemble",
  "Faites une randonée ou balade en forêt",
] as const;
const DEFAULT_FEEL_GOOD_ITEMS: Array<{ text: string; tag: FeelGoodTag }> = [
  { text: "Balade en forêt 🌲", tag: "🌿 calme" },
  { text: "Cuisine ensemble 🍳", tag: "🔥 complicité" },
  { text: "Soirée film 🎬", tag: "💆 douceur" },
  { text: "Massage 💆", tag: "💆 douceur" },
  { text: "Jeu de société 🎲", tag: "🔥 complicité" },
  { text: "Pique-nique 🧺", tag: "🌿 calme" },
  { text: "Randonnée 🥾", tag: "⚡ aventure" },
  { text: "Marché du dimanche ☕", tag: "🌿 calme" },
];

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
  const [challengeOffset, setChallengeOffset] = useState(0);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [feelGoodItems, setFeelGoodItems] = useState<FeelGoodItem[]>([]);
  const [feelGoodTag, setFeelGoodTag] = useState<FeelGoodTag>("🌿 calme");
  const [feelGoodDraft, setFeelGoodDraft] = useState("");
  const [feelGoodMode, setFeelGoodMode] = useState<"db" | "local">("db");

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

      const seeded = DEFAULT_FEEL_GOOD_ITEMS.map((item, idx) => ({
        id: `seed-${idx}`,
        text: item.text,
        tag: item.tag,
        pinned: false,
      }));
      const { data: fgRows, error: fgError } = await supabase
        .from("feel_good_items")
        .select("id, text, tag, pinned")
        .eq("couple_id", couple.id)
        .order("created_at");
      if (fgError) {
        const stored = readFeelGoodFromStorage(couple.id);
        setFeelGoodMode("local");
        setFeelGoodItems(stored.length ? stored : seeded);
      } else {
        setFeelGoodMode("db");
        const dbItems = ((fgRows as FeelGoodItem[] | null) ?? []).map((row) => ({
          id: row.id,
          text: row.text,
          tag: normalizeTag(row.tag),
          pinned: !!row.pinned,
        }));
        setFeelGoodItems(dbItems.length ? mergeSeededWithExisting(dbItems, seeded) : seeded);
      }
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
  const mondayChallengeIndex =
    (getIsoWeekNumber(new Date()) - 1 + challengeOffset) % WEEKLY_CHALLENGES.length;
  const currentChallenge =
    WEEKLY_CHALLENGES[(mondayChallengeIndex + WEEKLY_CHALLENGES.length) % WEEKLY_CHALLENGES.length];

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

  const completeChallenge = async () => {
    setChallengeBusy(true);
    setChallengeError(null);
    try {
      await supabase.from("memory_moments").insert({
        couple_id: couple.id,
        kind: "defi",
        title: currentChallenge,
        body: null,
      });
      await supabase.from("tree_events").insert({ couple_id: couple.id, kind: "flower" });
      setDefiCount((n) => n + 1);
      setMoments((prev) => [
        {
          id: `local-defi-${Date.now()}`,
          couple_id: couple.id,
          kind: "milestone",
          title: `🎯 ${currentChallenge}`,
          body: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setChallengeOffset((n) => n + 1);
    } catch (e) {
      setChallengeError(e instanceof Error ? e.message : "Impossible d'enregistrer ce défi.");
    } finally {
      setChallengeBusy(false);
    }
  };

  const saveFeelGoodLocal = (items: FeelGoodItem[]) => {
    if (!couple || typeof window === "undefined") return;
    const payload = { ...readAllFeelGoodStorage(), [couple.id]: items };
    window.localStorage.setItem(FEEL_GOOD_STORAGE_KEY, JSON.stringify(payload));
  };

  const pinFeelGood = async (item: FeelGoodItem) => {
    const nextPinned = !item.pinned;
    if (feelGoodMode === "local") {
      const next = feelGoodItems.map((fg) =>
        fg.id === item.id ? { ...fg, pinned: nextPinned } : fg,
      );
      setFeelGoodItems(next);
      saveFeelGoodLocal(next);
      return;
    }

    if (item.id.startsWith("seed-")) {
      const { data, error } = await supabase
        .from("feel_good_items")
        .insert({
          couple_id: couple.id,
          text: item.text,
          tag: item.tag,
          pinned: nextPinned,
        })
        .select("id, text, tag, pinned")
        .single();
      if (error) {
        setFeelGoodMode("local");
        const next = feelGoodItems.map((fg) =>
          fg.id === item.id ? { ...fg, pinned: nextPinned } : fg,
        );
        setFeelGoodItems(next);
        saveFeelGoodLocal(next);
        return;
      }
      setFeelGoodItems((prev) =>
        prev.map((fg) =>
          fg.id === item.id
            ? {
                id: (data as { id: string }).id,
                text: item.text,
                tag: item.tag,
                pinned: nextPinned,
              }
            : fg,
        ),
      );
      return;
    }

    const { error } = await supabase
      .from("feel_good_items")
      .update({ pinned: nextPinned })
      .eq("id", item.id);
    if (!error) {
      setFeelGoodItems((prev) =>
        prev.map((fg) => (fg.id === item.id ? { ...fg, pinned: nextPinned } : fg)),
      );
    }
  };

  const addFeelGood = async () => {
    const text = feelGoodDraft.trim();
    if (!text) return;
    if (feelGoodMode === "local") {
      const next = [
        ...feelGoodItems,
        { id: `local-${Date.now()}`, text, tag: feelGoodTag, pinned: false },
      ];
      setFeelGoodItems(next);
      setFeelGoodDraft("");
      saveFeelGoodLocal(next);
      return;
    }
    const { data, error } = await supabase
      .from("feel_good_items")
      .insert({ couple_id: couple.id, text, tag: feelGoodTag, pinned: false })
      .select("id, text, tag, pinned")
      .single();
    if (error) {
      const next = [
        ...feelGoodItems,
        { id: `local-${Date.now()}`, text, tag: feelGoodTag, pinned: false },
      ];
      setFeelGoodMode("local");
      setFeelGoodItems(next);
      setFeelGoodDraft("");
      saveFeelGoodLocal(next);
      return;
    }
    setFeelGoodItems((prev) => [
      ...prev,
      {
        id: (data as { id: string }).id,
        text,
        tag: feelGoodTag,
        pinned: false,
      },
    ]);
    setFeelGoodDraft("");
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

      <section className="mt-8 rounded-3xl border-2 border-ink bg-card p-6 shadow-flat">
        <h2 className="serif text-2xl text-ink">Défis du couple 🎯</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Juste une proposition fun de la semaine, jamais une obligation.
        </p>
        <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4">
          <div className="text-sm text-muted-foreground">Défi de cette semaine</div>
          <div className="text-ink mt-1 font-medium">{currentChallenge}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={completeChallenge}
              disabled={challengeBusy}
              className="btn-flat rounded-full bg-emerald px-4 py-2 text-sm text-accent-foreground disabled:opacity-40"
            >
              {challengeBusy ? "Enregistrement…" : "✅ On l'a fait !"}
            </button>
            <button
              onClick={() => setChallengeOffset((n) => n + 1)}
              className="rounded-full border-2 border-ink bg-card px-4 py-2 text-sm text-ink"
            >
              Passer ce défi →
            </button>
          </div>
          {challengeError && <p className="mt-3 text-sm text-destructive">{challengeError}</p>}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border-2 border-ink bg-card p-6 shadow-flat">
        <h2 className="serif text-2xl text-ink">Ce qui nous ressource 🌿</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Une liste douce d&apos;idées qui vous font du bien, à piocher quand vous voulez.
        </p>
        {feelGoodMode === "local" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Mode local activé (fallback), la table Supabase n&apos;est pas disponible.
          </p>
        )}
        <div className="mt-4 space-y-2">
          {feelGoodItems.map((item) => (
            <div key={item.id} className="rounded-2xl border-2 border-ink bg-paper p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-ink text-sm">{item.text}</div>
                  <div className="text-xs text-muted-foreground mt-1">{item.tag}</div>
                </div>
                <button
                  onClick={() => pinFeelGood(item)}
                  className={`rounded-full px-3 py-1 text-xs border-2 ${item.pinned ? "border-emerald bg-emerald/10 text-emerald" : "border-ink text-ink"}`}
                >
                  {item.pinned ? "📌 Prévu" : "📌 Ce week-end !"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={feelGoodDraft}
            onChange={(e) => setFeelGoodDraft(e.target.value)}
            placeholder="Ajouter une activité qui vous ressource..."
            className="flex-1 min-w-56 rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink outline-none"
          />
          <select
            value={feelGoodTag}
            onChange={(e) => setFeelGoodTag(e.target.value as FeelGoodTag)}
            className="rounded-xl border-2 border-ink bg-paper p-3 text-sm text-ink"
          >
            <option value="🌿 calme">🌿 calme</option>
            <option value="⚡ aventure">⚡ aventure</option>
            <option value="🔥 complicité">🔥 complicité</option>
            <option value="💆 douceur">💆 douceur</option>
          </select>
          <button
            onClick={addFeelGood}
            disabled={!feelGoodDraft.trim()}
            className="btn-flat rounded-xl bg-emerald px-4 text-accent-foreground disabled:opacity-40"
          >
            Ajouter
          </button>
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

function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function normalizeTag(tag: string): FeelGoodTag {
  const allowed: FeelGoodTag[] = ["🌿 calme", "⚡ aventure", "🔥 complicité", "💆 douceur"];
  return allowed.includes(tag as FeelGoodTag) ? (tag as FeelGoodTag) : "🌿 calme";
}

function readAllFeelGoodStorage(): Record<string, FeelGoodItem[]> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(FEEL_GOOD_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, FeelGoodItem[]>;
  } catch {
    return {};
  }
}

function readFeelGoodFromStorage(coupleId: string): FeelGoodItem[] {
  const all = readAllFeelGoodStorage();
  return all[coupleId] ?? [];
}

function mergeSeededWithExisting(existing: FeelGoodItem[], seeded: FeelGoodItem[]): FeelGoodItem[] {
  const lowerExisting = new Set(existing.map((i) => i.text.toLowerCase()));
  const missingSeeded = seeded.filter((s) => !lowerExisting.has(s.text.toLowerCase()));
  return [...existing, ...missingSeeded];
}
