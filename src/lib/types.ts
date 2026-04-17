// Domain types for the Nous app (mirrors DB schema).
export type Tag = "positif" | "pacte" | "emotion";
export type MemberSlot = "a" | "b";

export interface Couple {
  id: string;
  code: string;
  started_at: string;
  created_at: string;
}
export interface Member {
  id: string;
  user_id: string;
  couple_id: string;
  display_name: string;
  pin: string;
  slot: MemberSlot;
}
export interface Entry {
  id: string;
  couple_id: string;
  author_id: string;
  tag: Tag;
  raw: string;
  reformulated: string | null;
  will_share: boolean;
  shared_at: string | null;
  created_at: string;
}
export interface PactRule {
  id: string;
  couple_id: string;
  text: string;
  created_by: string | null;
  created_at: string;
}
export interface FridayRitual {
  id: string;
  couple_id: string;
  week_key: string;
  question: string;
}
export interface FridayAnswer {
  id: string;
  ritual_id: string;
  author_id: string;
  question_answer: string;
  gratitude: string;
  submitted_at: string;
}
export interface MemoryMoment {
  id: string;
  couple_id: string;
  kind: "positive" | "ritual" | "milestone";
  title: string;
  body: string | null;
  created_at: string;
}
export interface TreeEvent {
  id: string;
  couple_id: string;
  kind: "flower" | "branch" | "milestone";
  created_at: string;
}
