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
  await ensureAuth();
  let lastError: unknown = null;
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const { data, error } = await supabase.rpc("create_couple", {
      _code: code,
      _display_name: displayName.trim(),
      _pin: pin,
    });
    if (error) {
      // unique violation on code — retry
      if (error.code === "23505") {
        lastError = error;
        continue;
      }
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Réponse vide du serveur");
    const { data: couple } = await supabase.from("couples").select("*").eq("id", row.couple_id).single();
    const { data: member } = await supabase.from("members").select("*").eq("id", row.member_id).single();
    return { couple: couple as Couple, member: member as Member };
  }
  throw lastError ?? new Error("Impossible de créer un code unique");
}

/** Join an existing couple by code, claiming slot 'b'. */
export async function joinCouple(code: string, displayName: string, pin: string): Promise<{ couple: Couple; member: Member }> {
  await ensureAuth();
  const cleanCode = code.trim().toUpperCase();

  const { data, error } = await supabase.rpc("join_couple", {
    _code: cleanCode,
    _display_name: displayName.trim(),
    _pin: pin,
  });
  if (error) {
    if (error.message.includes("COUPLE_NOT_FOUND")) throw new Error("Ce code n'existe pas.");
    if (error.message.includes("COUPLE_FULL")) throw new Error("Ce couple est déjà complet.");
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Réponse vide du serveur");
  const { data: couple } = await supabase.from("couples").select("*").eq("id", row.couple_id).single();
  const { data: member } = await supabase.from("members").select("*").eq("id", row.member_id).single();
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
