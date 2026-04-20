import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSession } from "@/lib/use-couple-session";
import { isUnlocked } from "@/lib/local-lock";
import { currentWeekKey, questionForWeek } from "@/lib/couple";
import { BottomNav } from "@/components/bottom-nav";
import type { FridayRitual, FridayAnswer } from "@/lib/types";

export const Route = createFileRoute("/vendredi")({
  head: () => ({
    meta: [
      { title: "Vendredi — le rituel" },
      { name: "description", content: "Une question, une gratitude. Révélation simultanée." },
    ],
  }),
  component: Vendredi,
});

function Vendredi() {
  const { loading, member, couple, partner } = useCoupleSession();
  const navigate = useNavigate();
  const [ritual, setRitual] = useState<FridayRitual | null>(null);
  const [myAnswer, setMyAnswer] = useState<FridayAnswer | null>(null);
  const [partnerAnswer, setPartnerAnswer] = useState<FridayAnswer | null>(null);
  const [qInput, setQInput] = useState("");
  const [gInput, setGInput] = useState("");
  const [emotionRaw, setEmotionRaw] = useState("");
  const [emotionCnv, setEmotionCnv] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const weekKey = currentWeekKey();
  const question = questionForWeek(weekKey);

  // Get or create ritual for this week, then poll answers
  useEffect(() => {
    if (!couple || !member) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const ensureRitual = async () => {
      const { data: existing } = await supabase
        .from("friday_rituals")
        .select("*")
        .eq("couple_id", couple.id)
        .eq("week_key", weekKey)
        .maybeSingle();
      if (existing) return existing as FridayRitual;
      const { data: created } = await supabase
        .from("friday_rituals")
        .insert({ couple_id: couple.id, week_key: weekKey, question })
        .select("*")
        .single();
      return created as FridayRitual;
    };

    const loadAnswers = async (rid: string) => {
      const { data: mine } = await supabase
        .from("friday_answers")
        .select("*")
        .eq("ritual_id", rid)
        .eq("author_id", member.user_id)
        .maybeSingle();
      const { data: all } = await supabase.from("friday_answers").select("*").eq("ritual_id", rid);
      if (cancelled) return;
      setMyAnswer((mine as FridayAnswer) ?? null);
      const partnerA =
        (all as FridayAnswer[] | null)?.find((a) => a.author_id !== member.user_id) ?? null;
      setPartnerAnswer(partnerA);
    };

    void (async () => {
      const r = await ensureRitual();
      if (cancelled) return;
      setRitual(r);
      await loadAnswers(r.id);
      interval = setInterval(() => void loadAnswers(r.id), 4000);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [couple, member, weekKey, question]);

  if (loading || !member || !couple) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-muted-foreground">…</div>
      </main>
    );
  }

  if (!partner) {
    return (
      <main className="min-h-screen mx-auto max-w-lg px-6 pt-14 pb-28">
        <div className="text-center">
          <div className="text-5xl">🌙</div>
          <h1 className="serif text-3xl text-ink mt-6">Vendredi à deux.</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Le rituel s'ouvrira quand l'autre joueur aura rejoint avec le code{" "}
            <span className="serif text-emerald tracking-widest">{couple.code}</span>.
          </p>
        </div>
        <BottomNav />
      </main>
    );
  }

  const submit = async () => {
    if (!ritual || !qInput.trim() || !gInput.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("friday_answers")
        .insert({
          ritual_id: ritual.id,
          author_id: member.user_id,
          question_answer: qInput.trim(),
          gratitude: gInput.trim(),
          emotion_raw: emotionRaw.trim() ? emotionRaw.trim() : null,
          emotion_cnv: emotionRaw.trim() ? emotionCnv : null,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      setMyAnswer(data as FridayAnswer);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l'envoi.");
    } finally {
      setBusy(false);
    }
  };

  const reformulateEmotion = async () => {
    if (!emotionRaw.trim() || translating) return;
    setTranslating(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("translate-emotion", {
        body: { raw: emotionRaw.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEmotionCnv(data.reformulated ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de la reformulation.");
    } finally {
      setTranslating(false);
    }
  };

  // STATE 1: not yet submitted → show form
  if (!myAnswer) {
    return (
      <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-28">
        <header className="mb-8">
          <div className="tracking-ritual text-muted-foreground">Vendredi · {weekKey}</div>
          <h1 className="serif text-3xl text-ink mt-1">Le rituel.</h1>
          <p className="text-xs text-muted-foreground mt-2">
            Vous répondez chacun·e séparément. Personne ne voit l'autre tant que vous n'avez pas
            tous les deux répondu.
          </p>
        </header>

        <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-flat">
          <div className="tracking-ritual text-muted-foreground mb-2">Question commune</div>
          <p className="serif text-xl text-ink leading-snug">{question}</p>
          <textarea
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            rows={4}
            placeholder="Écris ta réponse…"
            className="mt-4 w-full rounded-xl border-2 border-ink bg-paper p-3 text-[15px] text-ink outline-none focus:shadow-flat resize-none"
          />
        </div>

        <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-flat mt-4">
          <div className="tracking-ritual text-muted-foreground mb-2">Gratitude</div>
          <p className="text-ink">Cette semaine, je suis reconnaissant·e pour…</p>
          <textarea
            value={gInput}
            onChange={(e) => setGInput(e.target.value)}
            rows={3}
            placeholder="Une chose, petite ou grande."
            className="mt-3 w-full rounded-xl border-2 border-ink bg-paper p-3 text-[15px] text-ink outline-none focus:shadow-flat resize-none"
          />
        </div>

        <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-flat mt-4">
          <div className="tracking-ritual text-muted-foreground mb-2">
            💬 Une émotion de la semaine à reformuler ?
          </div>
          <p className="text-xs text-muted-foreground">
            La Communication Non Violente (CNV) aide à exprimer un ressenti sans reproche.
            C&apos;est optionnel.
          </p>
          <textarea
            value={emotionRaw}
            onChange={(e) => {
              setEmotionRaw(e.target.value);
              setEmotionCnv(null);
            }}
            rows={3}
            placeholder="Qu'est-ce qui t'a pesé cette semaine ?"
            className="mt-3 w-full rounded-xl border-2 border-ink bg-paper p-3 text-[15px] text-ink outline-none focus:shadow-flat resize-none"
          />
          <button
            onClick={reformulateEmotion}
            disabled={!emotionRaw.trim() || translating}
            className="mt-3 text-xs tracking-ritual text-emerald disabled:opacity-30"
          >
            {translating ? "Reformulation…" : "Reformuler en CNV ✨"}
          </button>
          {emotionCnv && (
            <div className="mt-3 rounded-xl border-2 border-emerald bg-emerald/5 p-3 text-[15px] text-emerald italic">
              {emotionCnv}
            </div>
          )}
        </div>

        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

        <button
          onClick={submit}
          disabled={busy || !qInput.trim() || !gInput.trim()}
          className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-4 tracking-ritual mt-6 disabled:opacity-40"
        >
          {busy ? "Envoi…" : "Sceller ma réponse"}
        </button>

        <BottomNav />
      </main>
    );
  }

  // STATE 2: I answered, partner not yet → waiting screen
  if (!partnerAnswer) {
    return (
      <main className="min-h-screen mx-auto max-w-lg px-6 pt-14 pb-28">
        <div className="text-center">
          <div className="relative size-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-emerald animate-ping opacity-50" />
            <div className="absolute inset-0 rounded-full border-2 border-ink bg-emerald/20" />
          </div>
          <h1 className="serif text-3xl text-ink mt-8">En attente de {partner.display_name}…</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
            Ta réponse est scellée. Dès que {partner.display_name} a répondu, vous verrez tout en
            même temps.
          </p>
        </div>
        <BottomNav />
      </main>
    );
  }

  // STATE 3: both answered → reveal
  return (
    <Reveal
      weekKey={weekKey}
      question={question}
      me={member.display_name}
      partnerName={partner.display_name}
      myAnswer={myAnswer}
      partnerAnswer={partnerAnswer}
      coupleId={couple.id}
    />
  );
}

function Reveal({
  weekKey,
  question,
  me,
  partnerName,
  myAnswer,
  partnerAnswer,
  coupleId,
}: {
  weekKey: string;
  question: string;
  me: string;
  partnerName: string;
  myAnswer: FridayAnswer;
  partnerAnswer: FridayAnswer;
  coupleId: string;
}) {
  const [sealed, setSealed] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const seal = async () => {
    if (!sealed.trim() || saving) return;
    setSaving(true);
    try {
      await supabase.from("memory_moments").insert({
        couple_id: coupleId,
        kind: "ritual",
        title: sealed.trim(),
        body: `Vendredi ${weekKey}`,
      });
      await supabase.from("tree_events").insert({ couple_id: coupleId, kind: "branch" });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen mx-auto max-w-lg px-6 pt-8 pb-28">
      <header className="mb-6">
        <div className="tracking-ritual text-emerald">Révélation · {weekKey}</div>
        <h1 className="serif text-3xl text-ink mt-1">Vous y êtes.</h1>
      </header>

      <Block title="Question commune" emoji="❓">
        <p className="serif text-lg text-ink mb-4">{question}</p>
        <Side label={me} text={myAnswer.question_answer} mine />
        <Side label={partnerName} text={partnerAnswer.question_answer} />
      </Block>

      <Block title="Gratitudes" emoji="🌿">
        <Side label={me} text={myAnswer.gratitude} mine />
        <Side label={partnerName} text={partnerAnswer.gratitude} />
      </Block>

      {!done ? (
        <Block title="Une phrase à sceller, ensemble" emoji="🔒">
          <p className="text-xs text-muted-foreground mb-3">
            Une phrase courte qui résume ce vendredi. Elle rejoindra votre carnet.
          </p>
          <input
            value={sealed}
            onChange={(e) => setSealed(e.target.value)}
            placeholder="« Cette semaine, on a appris à… »"
            className="w-full rounded-xl border-2 border-ink bg-paper p-3 text-[15px] text-ink outline-none focus:shadow-flat"
          />
          <button
            onClick={seal}
            disabled={!sealed.trim() || saving}
            className="btn-flat w-full rounded-full bg-emerald text-accent-foreground py-3 tracking-ritual mt-4 disabled:opacity-40"
          >
            {saving ? "…" : "Sceller dans la mémoire"}
          </button>
        </Block>
      ) : (
        <div className="text-center mt-8">
          <div className="text-4xl">🌳</div>
          <p className="serif text-xl text-ink mt-3">Une nouvelle branche.</p>
          <Link
            to="/nous"
            className="inline-block mt-4 text-xs tracking-ritual text-emerald underline"
          >
            Voir l'arbre →
          </Link>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function Block({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border-2 border-ink bg-card p-5 shadow-flat mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <span className="tracking-ritual text-muted-foreground">{title}</span>
      </div>
      {children}
    </section>
  );
}

function Side({ label, text, mine }: { label: string; text: string; mine?: boolean }) {
  return (
    <div
      className={`mt-2 rounded-xl border-2 ${mine ? "border-emerald bg-emerald/5" : "border-ink bg-paper"} p-3`}
    >
      <div className={`tracking-ritual mb-1 ${mine ? "text-emerald" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="text-[15px] text-ink whitespace-pre-wrap">{text}</div>
    </div>
  );
}
