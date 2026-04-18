import { supabase } from "@/integrations/supabase/client";

export interface Storm {
  id: string;
  couple_id: string;
  started_by: string;
  started_at: string;
  ended_at: string | null;
}

export interface NotificationRow {
  id: string;
  couple_id: string;
  recipient_id: string;
  kind: "storm_started" | "storm_ended" | string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function getActiveStorm(coupleId: string): Promise<Storm | null> {
  const { data } = await supabase
    .from("storms")
    .select("*")
    .eq("couple_id", coupleId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Storm) ?? null;
}

export async function startStorm(coupleId: string, userId: string, partnerUserId: string | null, initiatorName: string): Promise<Storm | null> {
  const existing = await getActiveStorm(coupleId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("storms")
    .insert({ couple_id: coupleId, started_by: userId })
    .select("*")
    .single();
  if (error) throw error;

  if (partnerUserId) {
    await supabase.from("notifications").insert({
      couple_id: coupleId,
      recipient_id: partnerUserId,
      kind: "storm_started",
      payload: { name: initiatorName },
    });
  }
  return data as Storm;
}

export async function endStorm(stormId: string): Promise<void> {
  await supabase.from("storms").update({ ended_at: new Date().toISOString() }).eq("id", stormId);
}
