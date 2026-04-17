// Store local pour Nous — basé sur localStorage, typé pour migration backend future.
import { useEffect, useState, useCallback } from "react";

export type EntryTag = "positif" | "pacte" | "emotion";

export interface Profile {
  id: "a" | "b";
  name: string;
  pin: string; // 4 chiffres — local uniquement, pas de sécurité réelle
}

export interface JournalEntry {
  id: string;
  authorId: "a" | "b";
  tag: EntryTag;
  raw: string;
  reformulated?: string;
  createdAt: number; // ms
  willShare: boolean;
}

export interface NousState {
  onboarded: boolean;
  profiles: { a: Profile | null; b: Profile | null };
  pact: string[]; // règles du pacte
  entries: JournalEntry[];
  currentProfileId: "a" | "b" | null;
}

const STORAGE_KEY = "nous.state.v1";

const initialState: NousState = {
  onboarded: false,
  profiles: { a: null, b: null },
  pact: [],
  entries: [],
  currentProfileId: null,
};

function read(): NousState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
}

function write(s: NousState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("nous:change"));
}

export function useNous() {
  const [state, setState] = useState<NousState>(initialState);

  useEffect(() => {
    setState(read());
    const handler = () => setState(read());
    window.addEventListener("nous:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("nous:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = useCallback((patch: Partial<NousState> | ((s: NousState) => NousState)) => {
    const current = read();
    const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
    write(next);
    setState(next);
  }, []);

  return { state, update };
}

export function resetNous() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("nous:change"));
}

/**
 * Traducteur CNV simple (heuristique locale).
 * Transforme une phrase brute en structure: "Je me sens X quand Y, parce que j'ai besoin de Z."
 */
export function reformulateCNV(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return "";

  const feelings: { match: RegExp; feel: string; need: string }[] = [
    { match: /\b(m'?énerve|agace|saoule|gonfle|exaspère)\b/, feel: "agacée", need: "de considération" },
    { match: /\b(triste|pleure|déprime|mal)\b/, feel: "triste", need: "de réconfort et de présence" },
    { match: /\b(seul|isolée?|abandonn)/, feel: "seule", need: "de connexion" },
    { match: /\b(peur|angoiss|stress|anxi)/, feel: "inquiète", need: "de sécurité" },
    { match: /\b(ignor|pas écout|pas entend|invisible|transparent)/, feel: "mise de côté", need: "d'être entendue" },
    { match: /\b(fatigu|épuis|crev|ras.le.bol)/, feel: "épuisée", need: "de repos et de soutien" },
    { match: /\b(déçu|trahi|promis|jamais)/, feel: "déçue", need: "de fiabilité" },
    { match: /\b(jaloux|jalouse)/, feel: "vulnérable", need: "de réassurance" },
    { match: /\b(colère|furieux|furieuse|rage)/, feel: "en colère", need: "de respect" },
  ];

  const match = feelings.find((f) => f.match.test(t));
  const feel = match?.feel ?? "touchée";
  const need = match?.need ?? "d'attention et de douceur";

  // Contexte: on garde la phrase brute en citation
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return `Je me sens ${feel} quand je pense à « ${cleaned} », parce que j'ai besoin ${need}.`;
}
