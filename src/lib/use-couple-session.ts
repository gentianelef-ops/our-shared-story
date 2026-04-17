import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Member, Couple } from "@/lib/types";

interface SessionState {
  loading: boolean;
  userId: string | null;
  member: Member | null;
  couple: Couple | null;
  partner: Member | null;
}

export function useCoupleSession() {
  const [state, setState] = useState<SessionState>({
    loading: true,
    userId: null,
    member: null,
    couple: null,
    partner: null,
  });

  const refresh = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    if (!uid) {
      setState({ loading: false, userId: null, member: null, couple: null, partner: null });
      return;
    }
    const { data: me } = await supabase.from("members").select("*").eq("user_id", uid).maybeSingle();
    if (!me) {
      setState({ loading: false, userId: uid, member: null, couple: null, partner: null });
      return;
    }
    const { data: couple } = await supabase.from("couples").select("*").eq("id", me.couple_id).maybeSingle();
    const { data: members } = await supabase.from("members").select("*").eq("couple_id", me.couple_id);
    const partner = (members ?? []).find((m) => m.user_id !== uid) ?? null;
    setState({
      loading: false,
      userId: uid,
      member: me as Member,
      couple: (couple as Couple) ?? null,
      partner: partner as Member | null,
    });
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { ...state, refresh };
}
