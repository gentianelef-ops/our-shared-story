// Petit verrou local (PIN) — pas de sécurité réelle, juste un cache UX local.
const KEY = "nous.unlocked";

export function isUnlocked(memberId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === memberId;
}
export function unlock(memberId: string) {
  localStorage.setItem(KEY, memberId);
  window.dispatchEvent(new CustomEvent("nous:unlock"));
}
export function lock() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("nous:unlock"));
}
