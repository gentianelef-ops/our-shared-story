import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSession } from "@/lib/use-couple-session";
import { useStorm } from "@/lib/use-storm";
import { isUnlocked } from "@/lib/local-lock";
import { computeStage, type TreeStage } from "@/lib/couple";
import { BottomNav } from "@/components/bottom-nav";
import { StormButton } from "@/components/storm-button";
import { NotificationBell } from "@/components/notification-bell";
import type { PactRule, MemoryMoment, TreeEvent } from "@/lib/types";

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
  const [events, setEvents] = useState<TreeEvent[]>([]);
  const [draft, setDraft] = useState("");
  const [challengeOffset, setChallengeOffset] = useState(0);
  const [feelGoodItems, setFeelGoodItems] = useState<
    Array<{ id: string; text: string; tag: string; pinned: boolean }>
  >([]);
  const [feelGoodDraft, setFeelGoodDraft] = useState("");
  const [feelGoodTag, setFeelGoodTag] = useState("🌿 calme");
  const [useLocalFeelGood, setUseLocalFeelGood] = useState(false);

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
      const [{ data: rules }, { data: ms }, { data: evs }] = await Promise.all([
        supabase.from("pact_rules").select("*").eq("couple_id", couple.id).order("created_at"),
        supabase
          .from("memory_moments")
          .select("*")
          .eq("couple_id", couple.id)
          .order("created_at", { ascending: false }),
        supabase.from("tree_events").select("*").eq("couple_id", couple.id),
      ]);
      setPact((rules as PactRule[]) ?? []);
      setMoments((ms as MemoryMoment[]) ?? []);
      setEvents((evs as TreeEvent[]) ?? []);
    })();
  }, [couple]);

  useEffect(() => {
    if (!couple) return;
    const localKey = `feel_good_items:${couple.id}`;
    void (async () => {
      const { data, error } = await supabase
        .from("feel_good_items")
        .select("*")
        .eq("couple_id", couple.id)
        .order("created_at");
      if (error) {
        setUseLocalFeelGood(true);
        const local = localStorage.getItem(localKey);
        if (local) {
          setFeelGoodItems(
            JSON.parse(local) as Array<{ id: string; text: string; tag: string; pinned: boolean }>,
          );
          return;
        }
        const defaults = defaultFeelGoodItems();
        setFeelGoodItems(defaults);
        localStorage.setItem(localKey, JSON.stringify(defaults));
        return;
      }
      const rows = (
        (data ?? []) as Array<{ id: string; text: string; tag: string; pinned: boolean }>
      ).map((i) => ({
        id: i.id,
        text: i.text,
        tag: i.tag,
        pinned: i.pinned,
      }));
      setFeelGoodItems(rows);
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
  const stage = computeStage(couple.started_at, events.length);
  const flowers = events.filter((e) => e.kind === "flower").length;
  const branches = events.filter((e) => e.kind === "branch").length;

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

  const challenges = weeklyChallenges();
  const weekNumber = isoWeekNumber(new Date());
  const challengeIndex = (weekNumber - 1 + challengeOffset + challenges.length) % challenges.length;
  const challenge = challenges[challengeIndex];

  const markChallengeDone = async () => {
    await supabase.from("memory_moments").insert({
      couple_id: couple.id,
      kind: "defi",
      title: challenge,
      body: null,
    } as never);
    await supabase.from("tree_events").insert({ couple_id: couple.id, kind: "flower" });
    setEvents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        couple_id: couple.id,
        kind: "flower",
        created_at: new Date().toISOString(),
      } as TreeEvent,
    ]);
  };

  const saveFeelGood = async (
    items: Array<{ id: string; text: string; tag: string; pinned: boolean }>,
  ) => {
    const localKey = `feel_good_items:${couple.id}`;
    if (useLocalFeelGood) {
      localStorage.setItem(localKey, JSON.stringify(items));
      setFeelGoodItems(items);
      return;
    }
    const { error } = await supabase.from("feel_good_items").upsert(
      items.map((i) => ({
        id: i.id,
        couple_id: couple.id,
        text: i.text,
        tag: i.tag,
        pinned: i.pinned,
      })),
    );
    if (error) {
      setUseLocalFeelGood(true);
      localStorage.setItem(localKey, JSON.stringify(items));
    }
    setFeelGoodItems(items);
  };

  const togglePinned = async (id: string) => {
    const next = feelGoodItems.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i));
    await saveFeelGood(next);
  };

  const addFeelGoodItem = async () => {
    if (!feelGoodDraft.trim()) return;
    const next = [
      ...feelGoodItems,
      {
        id: crypto.randomUUID(),
        text: feelGoodDraft.trim(),
        tag: feelGoodTag,
        pinned: false,
      },
    ];
    setFeelGoodDraft("");
    await saveFeelGood(next);
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
          <div className="mt-4 rounded-2xl border-2 border-storm bg-storm-soft/40 p-4 text-sm text-ink flex items-center gap-3">
            <span className="text-2xl">🌧️</span>
            <div className="flex-1">
              <div className="font-semibold">
                {storm.started_by === member.user_id
                  ? "Tu as demandé un peu de calme."
                  : `${partner?.display_name ?? "L'autre"} a besoin d'espace.`}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Pas de détails. Juste le signal.
              </div>
            </div>
          </div>
        )}
      </header>

      <section
        className={`rounded-3xl border-2 border-ink p-6 shadow-flat transition-colors ${storm ? "bg-storm-soft/30" : "bg-card"}`}
      >
        <div className="tracking-ritual text-muted-foreground mb-2">L'Arbre du couple</div>
        <div className="flex justify-center my-4">
          <Tree stage={stage} flowers={Math.min(flowers, 12)} rainy={!!storm} />
        </div>
        <div className="text-center text-xs text-muted-foreground">
          {storm
            ? "🌧️ Le ciel pleure un peu en ce moment."
            : `${labelStage(stage)} · ${flowers} fleur${flowers > 1 ? "s" : ""} · ${branches} branche${branches > 1 ? "s" : ""}`}
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

      <section className="mt-8 rounded-3xl border-2 border-ink bg-card p-5 shadow-flat">
        <h2 className="serif text-2xl text-ink mb-2">Défis du couple 🎯</h2>
        <p className="text-sm text-muted-foreground">Le défi change chaque lundi.</p>
        <div className="mt-4 rounded-2xl border-2 border-ink bg-paper p-4 text-ink">
          {challenge}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={markChallengeDone}
            className="btn-flat rounded-full bg-emerald text-accent-foreground py-3 text-sm tracking-ritual"
          >
            ✅ On l&apos;a fait !
          </button>
          <button
            onClick={() => setChallengeOffset((v) => v + 1)}
            className="btn-flat rounded-full bg-paper text-ink py-3 text-sm tracking-ritual"
          >
            Passer ce défi →
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border-2 border-ink bg-card p-5 shadow-flat">
        <h2 className="serif text-2xl text-ink mb-3">Ce qui nous ressource 🌿</h2>
        <div className="space-y-2">
          {feelGoodItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border-2 border-ink bg-paper p-3 flex items-center gap-2"
            >
              <span className="text-sm tracking-ritual text-muted-foreground">{item.tag}</span>
              <span className="flex-1 text-sm text-ink">{item.text}</span>
              <button
                onClick={() => togglePinned(item.id)}
                className={`text-xs tracking-ritual px-3 py-1 rounded-full border-2 ${item.pinned ? "border-emerald text-emerald bg-emerald/10" : "border-ink text-ink"}`}
              >
                📌 Ce week-end !
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border-2 border-dashed border-ink bg-paper p-3">
          <input
            value={feelGoodDraft}
            onChange={(e) => setFeelGoodDraft(e.target.value)}
            placeholder="Ajouter une activité à vous…"
            className="w-full bg-transparent p-2 text-[15px] text-ink outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <select
              value={feelGoodTag}
              onChange={(e) => setFeelGoodTag(e.target.value)}
              className="rounded-xl border-2 border-ink bg-paper px-2 py-1 text-xs text-ink"
            >
              <option>🌿 calme</option>
              <option>⚡ aventure</option>
              <option>🔥 complicité</option>
              <option>💆 douceur</option>
            </select>
            <button
              onClick={addFeelGoodItem}
              disabled={!feelGoodDraft.trim()}
              className="text-xs tracking-ritual text-emerald disabled:opacity-30 px-2"
            >
              + Ajouter
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

function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function weeklyChallenges() {
  return [
    "Cuisinez un plat jamais fait ensemble",
    "Éteignez vos téléphones 2h et faites quelque chose ensemble",
    "Écrivez chacun 3 choses que vous aimez chez l'autre et lisez-les à voix haute",
    "Faites une balade dans un endroit nouveau",
    "Regardez un film que ni l'un ni l'autre n'a vu",
    "Prenez un café dehors sans parler du quotidien",
    "Faites un mini pique-nique improvisé",
    "Inventez une tradition de 10 minutes pour le soir",
    "Testez une activité créative à deux",
    "Prenez 20 minutes de silence ensemble",
    "Échangez vos playlists préférées",
    "Faites une soirée jeu de société",
    "Préparez le petit-déjeuner de l'autre demain",
    "Marchez main dans la main sans destination",
    "Essayez une nouvelle recette de dessert",
    "Écrivez une carte douce à l'autre",
    "Faites une séance d'étirements ou yoga à deux",
    "Planifiez une micro-aventure du week-end",
    "Racontez votre meilleur souvenir à deux",
    "Faites une heure sans écrans, juste vous deux",
  ];
}

function defaultFeelGoodItems() {
  return [
    { id: "fg-1", text: "Balade en forêt", tag: "🌿 calme", pinned: false },
    { id: "fg-2", text: "Cuisine ensemble", tag: "🔥 complicité", pinned: false },
    { id: "fg-3", text: "Soirée film", tag: "💆 douceur", pinned: false },
    { id: "fg-4", text: "Massage", tag: "💆 douceur", pinned: false },
    { id: "fg-5", text: "Jeu de société", tag: "🔥 complicité", pinned: false },
    { id: "fg-6", text: "Pique-nique", tag: "⚡ aventure", pinned: false },
    { id: "fg-7", text: "Randonnée", tag: "⚡ aventure", pinned: false },
    { id: "fg-8", text: "Marché du dimanche", tag: "🌿 calme", pinned: false },
  ];
}

function labelStage(s: TreeStage) {
  return {
    seed: "Une graine",
    sprout: "Une jeune pousse",
    shrub: "Un arbuste",
    tree: "Un arbre",
    blooming: "Un arbre en fleurs",
  }[s];
}

function Tree({
  stage,
  flowers,
  rainy = false,
}: {
  stage: TreeStage;
  flowers: number;
  rainy?: boolean;
}) {
  // Minimal SVG line-art tree, evolves with stage
  const showSprout = stage !== "seed";
  const showTrunk = stage === "shrub" || stage === "tree" || stage === "blooming";
  const showCanopy = stage === "tree" || stage === "blooming";
  const showBlossom = stage === "blooming" && !rainy;

  return (
    <svg viewBox="0 0 200 220" className="w-48 h-56">
      {rainy && (
        <g className="text-storm">
          {Array.from({ length: 14 }).map((_, i) => (
            <line
              key={i}
              x1={15 + i * 13}
              y1={0}
              x2={12 + i * 13}
              y2={8}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="rain-drop"
              style={
                {
                  animationDelay: `${(i % 5) * 0.3}s`,
                  transformOrigin: `${15 + i * 13}px 0px`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      )}
      {/* Ground */}
      <line
        x1="20"
        y1="200"
        x2="180"
        y2="200"
        stroke="currentColor"
        strokeWidth="2"
        className="text-ink"
        strokeLinecap="round"
      />
      {/* Seed */}
      <circle cx="100" cy="200" r="4" fill="currentColor" className="text-ink" />
      {/* Sprout */}
      {showSprout && (
        <>
          <path
            d="M100 200 Q100 180 100 160"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-ink"
            strokeLinecap="round"
          />
          <path
            d="M100 175 Q90 170 85 178"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-emerald"
            strokeLinecap="round"
          />
          <path
            d="M100 170 Q110 165 115 173"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-emerald"
            strokeLinecap="round"
          />
        </>
      )}
      {/* Trunk + branches */}
      {showTrunk && (
        <>
          <path
            d="M100 200 L100 110"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-ink"
            strokeLinecap="round"
          />
          <path
            d="M100 150 Q80 140 70 120"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-ink"
            strokeLinecap="round"
          />
          <path
            d="M100 135 Q125 125 135 105"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-ink"
            strokeLinecap="round"
          />
        </>
      )}
      {/* Canopy */}
      {showCanopy && (
        <>
          <circle
            cx="100"
            cy="90"
            r="35"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-emerald"
          />
          <circle
            cx="75"
            cy="100"
            r="20"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-emerald"
          />
          <circle
            cx="130"
            cy="95"
            r="22"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-emerald"
          />
        </>
      )}
      {/* Blossoms (extra flowers) */}
      {showBlossom &&
        Array.from({ length: 6 }).map((_, i) => (
          <circle
            key={i}
            cx={70 + i * 12}
            cy={75 + (i % 2 === 0 ? 0 : 8)}
            r="3"
            fill="currentColor"
            className="text-coral"
          />
        ))}
      {/* Flowers from positives */}
      {Array.from({ length: flowers }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = showCanopy ? 38 : showSprout ? 18 : 10;
        const cx = 100 + Math.cos(angle) * radius;
        const cy = (showCanopy ? 90 : 175) + Math.sin(angle) * radius;
        return (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="currentColor" className="text-coral" />
        );
      })}
    </svg>
  );
}
