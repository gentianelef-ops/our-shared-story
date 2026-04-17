// Couple session helpers
import { supabase } from "@/integrations/supabase/client";
import type { Couple, Member } from "@/lib/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
function genCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Ensure we have an authenticated (anonymous) session. */
export async function ensureAuth(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signed.user!.id;
}

/** Get current member row for the logged-in user, or null. */
export async function getCurrentMember(): Promise<Member | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return null;
  const { data: row } = await supabase.from("members").select("*").eq("user_id", uid).maybeSingle();
  return (row as Member) ?? null;
}

export async function getCouple(coupleId: string): Promise<Couple | null> {
  const { data } = await supabase.from("couples").select("*").eq("id", coupleId).maybeSingle();
  return (data as Couple) ?? null;
}

export async function getCoupleMembers(coupleId: string): Promise<Member[]> {
  const { data } = await supabase.from("members").select("*").eq("couple_id", coupleId);
  return (data as Member[]) ?? [];
}

/** Create a new couple (slot 'a') with a fresh code. Retries on collision. */
export async function createCouple(displayName: string, pin: string): Promise<{ couple: Couple; member: Member }> {
  const uid = await ensureAuth();
  let lastError: unknown = null;
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const { data: couple, error: cErr } = await supabase
      .from("couples")
      .insert({ code })
      .select("*")
      .single();
    if (cErr) {
      lastError = cErr;
      continue;
    }
    const { data: member, error: mErr } = await supabase
      .from("members")
      .insert({
        user_id: uid,
        couple_id: couple.id,
        display_name: displayName.trim(),
        pin,
        slot: "a",
      })
      .select("*")
      .single();
    if (mErr) throw mErr;
    return { couple: couple as Couple, member: member as Member };
  }
  throw lastError ?? new Error("Impossible de créer un code unique");
}

/** Join an existing couple by code, claiming slot 'b'. */
export async function joinCouple(code: string, displayName: string, pin: string): Promise<{ couple: Couple; member: Member }> {
  const uid = await ensureAuth();
  const cleanCode = code.trim().toUpperCase();

  const { data: coupleId, error: rpcErr } = await supabase.rpc("join_couple_by_code", { _code: cleanCode });
  if (rpcErr) {
    if (rpcErr.message.includes("COUPLE_NOT_FOUND")) throw new Error("Ce code n'existe pas.");
    throw rpcErr;
  }

  // Check slot availability
  const { data: existing } = await supabase.from("members").select("slot,user_id").eq("couple_id", coupleId);
  if (existing && existing.some((m) => m.user_id === uid)) {
    // Already a member — fetch and return
    const { data: me } = await supabase.from("members").select("*").eq("user_id", uid).single();
    const { data: c } = await supabase.from("couples").select("*").eq("id", coupleId).single();
    return { couple: c as Couple, member: me as Member };
  }
  if ((existing?.length ?? 0) >= 2) throw new Error("Ce couple est déjà complet.");

  const takenA = existing?.some((m) => m.slot === "a");
  const slot = takenA ? "b" : "a";

  const { data: member, error: mErr } = await supabase
    .from("members")
    .insert({
      user_id: uid,
      couple_id: coupleId,
      display_name: displayName.trim(),
      pin,
      slot,
    })
    .select("*")
    .single();
  if (mErr) throw mErr;
  const { data: couple } = await supabase.from("couples").select("*").eq("id", coupleId).single();
  return { couple: couple as Couple, member: member as Member };
}

/** Sign out + clear local state. */
export async function leaveSession(): Promise<void> {
  await supabase.auth.signOut();
}

/** Compute current week key like 2025-W16 */
export function currentWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const WEEKLY_QUESTIONS = [
  "Cite un moment cette semaine où tu t'es senti·e bien grâce à l'autre.",
  "Qu'est-ce que ton/ta partenaire a fait cette semaine que tu n'as pas remarqué sur le moment ?",
  "Si tu pouvais rejouer un instant de la semaine avec elle/lui, lequel ?",
  "Une chose que l'autre a dite cette semaine qui t'a touché·e ?",
  "Un effort silencieux de l'autre que tu veux nommer aujourd'hui ?",
  "Quel petit geste t'a fait du bien cette semaine ?",
];

export function questionForWeek(weekKey: string): string {
  // Stable index from week_key
  let h = 0;
  for (const c of weekKey) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return WEEKLY_QUESTIONS[h % WEEKLY_QUESTIONS.length];
}

/** Determine tree stage from couple age + events count */
export type TreeStage = "seed" | "sprout" | "shrub" | "tree" | "blooming";
export function computeStage(startedAt: string, eventsCount: number): TreeStage {
  const days = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000);
  if (days < 7 && eventsCount < 3) return "seed";
  if (days < 30 && eventsCount < 10) return "sprout";
  if (days < 90 || eventsCount < 25) return "shrub";
  if (days < 180 || eventsCount < 60) return "tree";
  return "blooming";
}
