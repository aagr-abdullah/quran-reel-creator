import { createServerFn } from "@tanstack/react-start";
import { fetchSurahArabic, fetchAyahRange, type AyahPayload } from "@/lib/quran-api";
import { normalizeArabic, tokenizeArabic, tokenLevenshtein } from "@/lib/arabic";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Detect which surah + ayah range was recited.
 * Strategy:
 *  1. Gemini transcribes the Arabic from the audio URL
 *  2. Normalize the transcription (strip diacritics)
 *  3. Sliding-window fuzzy match against the entire Quran corpus, ranked
 *  4. Return top 3 candidates with confidence
 */
export const detectVerses = createServerFn({ method: "POST" })
  .inputValidator((input: { audioUrl: string; reelId: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Step 1: download audio and convert to base64 for Gemini
    const audioRes = await fetch(data.audioUrl);
    if (!audioRes.ok) throw new Error(`Audio fetch failed: ${audioRes.status}`);
    const audioBuf = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get("content-type") || "audio/wav";
    const audioBase64 = Buffer.from(audioBuf).toString("base64");

    const transcriptionPrompt = `Listen to this Quran recitation. Transcribe the Arabic words you hear, exactly as recited, with full diacritics if you can. Respond with ONLY the Arabic transcription — no English, no commentary, no quotes, no surah names. Just the Arabic text of the verses recited.`;

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: transcriptionPrompt },
              { type: "input_audio", input_audio: { data: audioBase64, format: contentType.includes("mp3") ? "mp3" : "wav" } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`Transcription failed (${aiRes.status}): ${t.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const transcription: string = aiJson.choices?.[0]?.message?.content ?? "";
    if (!transcription.trim()) throw new Error("Empty transcription");

    const normalized = normalizeArabic(transcription);
    const tokens = tokenizeArabic(transcription);
    if (tokens.length < 2) throw new Error("Transcription too short to match");

    // Step 2: corpus matching. To stay within timeout, query candidate surahs.
    // Strategy: use the first 3 tokens as a "seed" and ask Gemini for the most
    // likely surah candidates, then do precise sliding-window matching there.
    const seedRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Given this Arabic Quran transcription, list the 3 most likely surah numbers (1-114) it could be from. Respond with ONLY a JSON array of numbers, e.g. [8, 2, 3]. Transcription: "${transcription.slice(0, 500)}"`,
          },
        ],
      }),
    });
    let candidateSurahs: number[] = [];
    if (seedRes.ok) {
      const seedJson = await seedRes.json();
      const raw: string = seedJson.choices?.[0]?.message?.content ?? "[]";
      const m = raw.match(/\[[\s\d,]+\]/);
      if (m) {
        try {
          candidateSurahs = JSON.parse(m[0]).filter((n: unknown) => typeof n === "number" && n >= 1 && n <= 114);
        } catch {}
      }
    }
    if (candidateSurahs.length === 0) candidateSurahs = [1, 2, 36, 55, 67, 112];

    // Step 3: for each candidate surah, fetch full text and sliding-window match
    type Cand = { surah: number; ayahStart: number; ayahEnd: number; score: number; text: string };
    const candidates: Cand[] = [];

    for (const sNum of candidateSurahs) {
      try {
        const surahData = await fetchSurahArabic(sNum);
        const ayahTokens = surahData.ayahs.map((a) => ({
          number: a.number,
          tokens: tokenizeArabic(a.text),
          text: a.text,
        }));
        // Sliding window across consecutive ayahs
        for (let i = 0; i < ayahTokens.length; i++) {
          let windowTokens: string[] = [];
          let windowText = "";
          for (let j = i; j < ayahTokens.length && j - i < 8; j++) {
            windowTokens = windowTokens.concat(ayahTokens[j].tokens);
            windowText += (windowText ? " " : "") + ayahTokens[j].text;
            // Only score windows of comparable size (±50%)
            if (windowTokens.length < tokens.length * 0.5) continue;
            if (windowTokens.length > tokens.length * 1.8) break;
            const dist = tokenLevenshtein(tokens, windowTokens);
            const score = 1 - dist / Math.max(tokens.length, windowTokens.length);
            candidates.push({
              surah: sNum,
              ayahStart: ayahTokens[i].number,
              ayahEnd: ayahTokens[j].number,
              score,
              text: windowText,
            });
          }
        }
      } catch (e) {
        console.error(`Surah ${sNum} fetch failed:`, e);
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 3);

    return {
      transcription,
      normalized,
      candidates: top.map((c) => ({
        surah: c.surah,
        ayahStart: c.ayahStart,
        ayahEnd: c.ayahEnd,
        confidence: Math.round(c.score * 100),
      })),
    };
  });

/** Fetch verses (Arabic + Khattab) for a confirmed range. */
export const fetchVerses = createServerFn({ method: "POST" })
  .inputValidator((input: { surah: number; ayahStart: number; ayahEnd: number }) => input)
  .handler(async ({ data }) => {
    const ayahs = await fetchAyahRange(data.surah, data.ayahStart, data.ayahEnd);
    return { ayahs };
  });

export type { AyahPayload };
