import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCoupleSession } from "@/lib/use-couple-session";
import { isUnlocked } from "@/lib/local-lock";
import { useStorm } from "@/lib/use-storm";
import { startStorm, endStorm } from "@/lib/storm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tempete")({
  head: () => ({
    meta: [
      { title: "Calme — Nous" },
      { name: "description", content: "Un moment pour respirer." },
    ],
  }),
  component: Tempete,
});

type Phase = "in" | "hold" | "out";
const PHASE_DURATION: Record<Phase, number> = { in: 4, hold: 7, out: 8 };
const PHASE_LABEL: Record<Phase, string> = { in: "Inspire", hold: "Retiens", out: "Expire" };
const NEXT: Record<Phase, Phase> = { in: "hold", hold: "out", out: "in" };

function Tempete() {
  const { loading, member, couple, partner } = useCoupleSession();
  const navigate = useNavigate();
  const { storm, refresh } = useStorm(couple?.id);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!member) { navigate({ to: "/" }); return; }
    if (!isUnlocked(member.id)) { navigate({ to: "/login" }); return; }
  }, [loading, member, navigate]);

  // Auto-start storm if none active and current user opens this page
  useEffect(() => {
    if (loading || !member || !couple || storm || starting) return;
    void (async () => {
      setStarting(true);
      try {
        await startStorm(couple.id, member.user_id, partner?.user_id ?? null, member.display_name);
        await refresh();
      } finally {
        setStarting(false);
      }
    })();
  }, [loading, member, couple, partner, storm, starting, refresh]);

  if (loading || !member || !couple) {
    return <main className="min-h-screen grid place-items-center"><div className="text-muted-foreground">…</div></main>;
  }

  const isInitiator = storm?.started_by === member.user_id;

  const onEnd = async () => {
    if (!storm) return;
    await endStorm(storm.id);
    if (partner) {
      await supabase.from("notifications").insert({
        couple_id: couple.id,
        recipient_id: partner.user_id,
        kind: "storm_ended",
        payload: { name: member.display_name },
      });
    }
    await refresh();
    navigate({ to: "/journal" });
  };

  return (
    <main className="min-h-screen bg-storm/10">
      <div className="mx-auto max-w-lg px-6 pt-10 pb-12 min-h-screen flex flex-col">
        <header className="text-center mb-8">
          <div className="tracking-ritual text-muted-foreground">Un moment pour toi</div>
          <h1 className="serif text-3xl text-ink mt-2">Le calme.</h1>
          <p className="text-xs text-muted-foreground mt-3 max-w-xs mx-auto">
            On t'a entendu·e. L'autre sait que tu as besoin d'espace, sans détails.
          </p>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <Breath />
        </div>

        <div className="mt-8 space-y-3">
          {isInitiator && (
           <button
  type="button"
  onClick={(e) => {
    e.preventDefault()
    onEnd()
  }}
>
  Le calme est revenu
</button>
          <button
            onClick={() => navigate({ to: "/journal" })}
            className="w-full text-center text-xs tracking-ritual text-muted-foreground py-2"
          >
            Continuer en silence
          </button>
        </div>
      </div>
    </main>
  );
}

function Breath() {
  const [phase, setPhase] = useState<Phase>("in");
  const [seconds, setSeconds] = useState(PHASE_DURATION.in);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, PHASE_DURATION[phase] - elapsed);
      setSeconds(Math.ceil(remaining));
      if (remaining <= 0) {
        const next = NEXT[phase];
        setPhase(next);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  const scale = phase === "in" ? "scale-100" : phase === "hold" ? "scale-100" : "scale-50";
  const duration = phase === "in" ? "duration-[4000ms]" : phase === "out" ? "duration-[8000ms]" : "duration-700";

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative size-64 grid place-items-center">
        <div className={`absolute inset-0 rounded-full bg-storm/20 transition-transform ease-in-out ${duration} ${phase === "in" ? "scale-100" : phase === "hold" ? "scale-100" : "scale-50"}`} />
        <div className={`absolute inset-4 rounded-full border-2 border-storm/60 transition-transform ease-in-out ${duration} ${scale}`} />
        <div className="relative text-center">
          <div className="serif text-2xl text-ink italic">{PHASE_LABEL[phase]}</div>
          <div className="serif text-5xl text-storm mt-2">{seconds}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground tracking-ritual">4 — 7 — 8</p>
    </div>
  );
}
