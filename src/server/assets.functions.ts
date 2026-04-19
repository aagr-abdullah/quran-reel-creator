/**
 * Image generation — driven by the AI Art Director's CreativeBrief.
 *
 * - Substrate uses brief.substratePrompt
 * - Per-ayah backgrounds use brief.ayahDirections[i].imagePrompt
 * - All prompts include a hard negative list (no letters/runes/sigils/figures)
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const HARD_NEGATIVES =
  "STRICTLY FORBIDDEN: no letters, no words, no Arabic text, no calligraphy, no script, no runes, no glyphs, no sigils, no symbols, no eyes, no triangles, no pyramids, no all-seeing-eye, no pentagrams, no hexagrams, no stars-of-david, no Tolkien runes, no occult imagery, no faces, no people, no human figures, no animals, no religious figures, no hands. Pure atmospheric/landscape/texture imagery only.";

async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Image gen failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("No image in response");
  return dataUrl;
}

async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const base64 = dataUrl.split(",")[1];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const { error } = await supabaseAdmin.storage
    .from("reel-assets")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabaseAdmin.storage.from("reel-assets").getPublicUrl(path);
  return data.publicUrl;
}

export const generateSubstrate = createServerFn({ method: "POST" })
  .inputValidator((input: { reelId: string; substratePrompt: string; paletteHints: string }) => input)
  .handler(async ({ data }) => {
    const prompt = `Vertical 9:16 portrait artistic background plate for a sacred Quranic recitation reel. ${data.substratePrompt}. Color palette: ${data.paletteHints}. Soft empty center area for verse text overlay. Painterly, museum-quality, sacred and reverent mood. ${HARD_NEGATIVES}`;
    const dataUrl = await generateImage(prompt);
    const url = await uploadDataUrl(dataUrl, `${data.reelId}/substrate.png`);
    await supabaseAdmin.from("reels").update({ substrate_url: url }).eq("id", data.reelId);
    return { url };
  });

export const generateAyahBackground = createServerFn({ method: "POST" })
  .inputValidator((input: {
    reelId: string;
    ayahNumber: number;
    imagePrompt: string;
    paletteHints: string;
    colorGrade: "warm" | "cool" | "neutral" | "desaturated";
  }) => input)
  .handler(async ({ data }) => {
    const gradeWord =
      data.colorGrade === "cool" ? "cool blue cinematic grade"
      : data.colorGrade === "desaturated" ? "desaturated muted earthen tones"
      : data.colorGrade === "neutral" ? "neutral natural color"
      : "warm golden cinematic grade";
    const prompt = `Vertical 9:16 atmospheric background art for a sacred Quranic recitation. ${data.imagePrompt}. ${gradeWord}. Accent palette: ${data.paletteHints}. Soft empty area in the middle and lower third for verse text overlay. Painterly, museum-quality, sacred and reverent. ${HARD_NEGATIVES}`;
    const dataUrl = await generateImage(prompt);
    const url = await uploadDataUrl(dataUrl, `${data.reelId}/ayah-${data.ayahNumber}-bg.png`);
    await supabaseAdmin.from("ayah_assets").upsert(
      { reel_id: data.reelId, ayah_number: data.ayahNumber, background_url: url },
      { onConflict: "reel_id,ayah_number" },
    );
    return { url };
  });
