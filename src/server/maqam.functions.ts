import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MAQAM_PALETTES: Record<string, { mood: string; palette: string[]; description: string }> = {
  Saba: { mood: "mournful, reverent, deeply moving", palette: ["#1a1a3e", "#3d3d6b", "#7a7aa8"], description: "muted indigo and slate, slow drifting" },
  Hijaz: { mood: "longing, exotic, warm", palette: ["#5c2a14", "#a06030", "#e8b870"], description: "warm amber and burgundy with golden light" },
  Bayati: { mood: "gentle, devotional, soft", palette: ["#2a4a4f", "#7aa6a6", "#e8e0c8"], description: "soft teal and cream, breathing motion" },
  Rast: { mood: "majestic, balanced, stable", palette: ["#1f3a2a", "#5a8a5c", "#c9a84c"], description: "deep green and gold, geometric stability" },
  Nahawand: { mood: "tender, romantic, contemplative", palette: ["#3a2a4a", "#9b72cf", "#f8c5d0"], description: "lavender and soft rose" },
  Sikah: { mood: "joyful, bright, pure", palette: ["#3d2a14", "#c98a4c", "#f8e4b8"], description: "warm honey and amber" },
  Ajam: { mood: "celebratory, hopeful, clear", palette: ["#1a3c5c", "#5a8ec9", "#e8f0f8"], description: "bright sky blue and white" },
  Kurd: { mood: "introspective, gentle, melancholic", palette: ["#2a3a4a", "#6a7a8a", "#c8d0d8"], description: "cool grey-blue, contemplative" },
};

/**
 * Detect maqam (musical mode) of the recitation via Gemini audio analysis.
 * Returns maqam name, mood description, and recommended palette.
 */
export const detectMaqam = createServerFn({ method: "POST" })
  .inputValidator((input: { audioUrl: string; reelId: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const audioRes = await fetch(data.audioUrl);
    if (!audioRes.ok) throw new Error(`Audio fetch failed: ${audioRes.status}`);
    const audioBuf = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get("content-type") || "audio/wav";
    const audioBase64 = Buffer.from(audioBuf).toString("base64");

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Listen to this Quran recitation and identify the maqam (Arabic musical mode). The maqam is determined by the pitch contour, melodic intervals, and characteristic phrases.

Choose ONE maqam from: Saba, Hijaz, Bayati, Rast, Nahawand, Sikah, Ajam, Kurd.

Also rate emotional intensity from 1 (very still) to 10 (very intense).

Respond with ONLY a single line of JSON: {"maqam":"<name>","intensity":<1-10>,"reasoning":"<one short sentence>"}`,
              },
              { type: "input_audio", input_audio: { data: audioBase64, format: contentType.includes("mp3") ? "mp3" : "wav" } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`Maqam detection failed (${aiRes.status}): ${t.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";
    const m = raw.match(/\{[^{}]*\}/);
    let maqam = "Bayati";
    let intensity = 5;
    let reasoning = "";
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (typeof parsed.maqam === "string" && MAQAM_PALETTES[parsed.maqam]) maqam = parsed.maqam;
        if (typeof parsed.intensity === "number") intensity = Math.max(1, Math.min(10, parsed.intensity));
        if (typeof parsed.reasoning === "string") reasoning = parsed.reasoning;
      } catch {}
    }

    const palette = MAQAM_PALETTES[maqam];
    const result = { maqam, mood: palette.mood, palette: palette.palette, description: palette.description, intensity, reasoning };

    await supabaseAdmin
      .from("reels")
      .update({ maqam, maqam_mood: palette.mood, meta: { ...result } as never })
      .eq("id", data.reelId);

    return result;
  });

/**
 * Analyze the meaning of each ayah for visual choreography.
 * Returns mood, dominant imagery, key concepts, color hint.
 */
export const analyzeVerseMeaning = createServerFn({ method: "POST" })
  .inputValidator((input: { ayahs: { number: number; arabic: string; translation: string }[]; reelId: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const list = data.ayahs
      .map((a) => `Ayah ${a.number}: ${a.translation}`)
      .join("\n");

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `For each ayah below, give a visual mood analysis. Return ONLY a JSON array, one object per ayah in order:
[{"ayah":<n>,"mood":"<one word>","imagery":"<2-4 words of dominant imagery>","concept":"<1-3 word theme>","intensity":<1-10>,"colorHint":"<one descriptive color phrase>"}]

Ayahs:
${list}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) throw new Error(`Meaning analysis failed (${aiRes.status})`);
    const aiJson = await aiRes.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "[]";
    const m = raw.match(/\[[\s\S]*\]/);
    let meanings: Array<{ ayah: number; mood: string; imagery: string; concept: string; intensity: number; colorHint: string }> = [];
    if (m) {
      try {
        meanings = JSON.parse(m[0]);
      } catch {}
    }

    return { meanings };
  });

export { MAQAM_PALETTES };
