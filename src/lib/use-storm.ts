import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStorm, type Storm } from "@/lib/storm";

export function useStorm(coupleId: string | undefined) {
  const [storm, setStorm] = useState<Storm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) { setLoading(false); return; }
    let active = true;
    void (async () => {
      const s = await getActiveStorm(coupleId);
      if (active) { setStorm(s); setLoading(false); }
    })();

    const channel = supabase
      .channel(`storms:${coupleId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "storms", filter: `couple_id=eq.${coupleId}` }, async () => {
        const s = await getActiveStorm(coupleId);
        if (active) setStorm(s);
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [coupleId]);

  return { storm, loading, refresh: async () => {
    if (!coupleId) return;
    setStorm(await getActiveStorm(coupleId));
  } };
}
