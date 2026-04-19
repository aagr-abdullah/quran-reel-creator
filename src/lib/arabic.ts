/**
 * Arabic normalization for constrained Quran corpus matching.
 * Strips diacritics (tashkil), normalizes alif forms, hamzas, etc.
 * The Quran is a closed corpus of 6,236 ayahs — we exploit that.
 */

export function normalizeArabic(text: string): string {
  if (!text) return "";
  return (
    text
      // Remove tatweel
      .replace(/\u0640/g, "")
      // Remove harakat / tashkil (U+064B–U+065F, U+0670, U+06D6–U+06ED)
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      // Remove Quranic annotation signs (small letters above)
      .replace(/[\u0610-\u061A]/g, "")
      // Normalize alif forms
      .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, "\u0627")
      // Normalize ya
      .replace(/\u0649/g, "\u064A")
      // Normalize ta marbuta -> ha
      .replace(/\u0629/g, "\u0647")
      // Normalize hamza variants on waw / ya
      .replace(/\u0624/g, "\u0648")
      .replace(/\u0626/g, "\u064A")
      // Standalone hamza
      .replace(/\u0621/g, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function tokenizeArabic(text: string): string[] {
  return normalizeArabic(text)
    .split(/\s+/)
    .filter(Boolean);
}

/** Levenshtein distance between two token arrays (fast path). */
export function tokenLevenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export interface VerseMatchCandidate {
  surah: number;
  ayahStart: number;
  ayahEnd: number;
  score: number; // 0-1, higher is better
  matchedText: string;
}
