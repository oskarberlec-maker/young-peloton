export const LOCAL_RACES_KEY = 'young-peloton-saved-races';
export function safeSavedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string =>
    typeof id === 'string' && id.length > 0 && id.length <= 180))].slice(0, 1000);
}
export function readLocalSavedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return safeSavedIds(JSON.parse(localStorage.getItem(LOCAL_RACES_KEY) || '[]')); }
  catch { return []; }
}
export function writeLocalSavedIds(ids: string[]): boolean {
  if (typeof window === 'undefined') return false;
  try { localStorage.setItem(LOCAL_RACES_KEY, JSON.stringify(safeSavedIds(ids))); return true; }
  catch { return false; }
}
