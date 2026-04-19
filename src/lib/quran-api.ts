/**
 * AlQuran.cloud / api.alquran.cloud client.
 * Fetches Arabic (Uthmani) + Khattab translation by surah/ayah range.
 * Public, free API. No key required.
 *
 * Endpoint reference: https://alquran.cloud/api
 */

export interface AyahPayload {
  number: number;            // global ayah number (1..6236)
  numberInSurah: number;
  surah: number;
  surahName: string;
  surahNameEnglish: string;
  arabic: string;
  translation: string;
}

interface AlQuranAyah {
  number: number;
  text: string;
  numberInSurah: number;
  surah?: { number: number; name: string; englishName: string; englishNameTranslation: string };
}

interface AlQuranResponse<T> {
  code: number;
  status: string;
  data: T;
}

const BASE = "https://api.alquran.cloud/v1";
// Khattab edition identifier on alquran.cloud
const KHATTAB_EDITION = "en.clearquran";
const UTHMANI_EDITION = "quran-uthmani";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`alquran.cloud ${res.status}: ${url}`);
  return (await res.json()) as T;
}

/** Fetch a single ayah by surah:ayah in both Arabic and Khattab. */
export async function fetchAyah(surah: number, ayah: number): Promise<AyahPayload> {
  const ref = `${surah}:${ayah}`;
  const [ar, en] = await Promise.all([
    fetchJson<AlQuranResponse<AlQuranAyah>>(`${BASE}/ayah/${ref}/${UTHMANI_EDITION}`),
    fetchJson<AlQuranResponse<AlQuranAyah>>(`${BASE}/ayah/${ref}/${KHATTAB_EDITION}`),
  ]);
  return {
    number: ar.data.number,
    numberInSurah: ar.data.numberInSurah,
    surah,
    surahName: ar.data.surah?.name ?? "",
    surahNameEnglish: ar.data.surah?.englishName ?? "",
    arabic: ar.data.text,
    translation: en.data.text,
  };
}

/** Fetch a range of ayahs from a single surah. */
export async function fetchAyahRange(
  surah: number,
  ayahStart: number,
  ayahEnd: number,
): Promise<AyahPayload[]> {
  const ayahs: number[] = [];
  for (let a = ayahStart; a <= ayahEnd; a++) ayahs.push(a);
  return Promise.all(ayahs.map((a) => fetchAyah(surah, a)));
}

/** Fetch full surah Arabic text (used for corpus matching at runtime). */
export async function fetchSurahArabic(surah: number): Promise<{ surah: number; ayahs: { number: number; text: string }[] }> {
  const data = await fetchJson<AlQuranResponse<{ ayahs: AlQuranAyah[] }>>(
    `${BASE}/surah/${surah}/${UTHMANI_EDITION}`,
  );
  return {
    surah,
    ayahs: data.data.ayahs.map((a) => ({ number: a.numberInSurah, text: a.text })),
  };
}
