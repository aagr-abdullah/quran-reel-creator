import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ReelStyle } from "@/lib/surahs";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const STYLE_PROMPTS: Record<ReelStyle, string> = {
  "calligraphic-bloom":
    "warm sepia parchment, ink-wash bloom, abstract Arabic calligraphic strokes (NOT readable text), reed pen aesthetic, hand-painted, deep rust and ochre, sumi-e influence, no figurative imagery, no human or animal forms, no faces",
  "liquid-light":
    "drifting volumetric light, soft caustics, indigo and amber gradients, dreamlike haze, A24 cinematic atmosphere, ethereal smoke, no figurative imagery, no human or animal forms, no faces, no text, no letters",
  "sacred-geometry":
    "intricate Islamic geometric patterns, girih tilings, 8-point and 12-point stars, vegetal arabesques, teal and gold and ivory, ordered and contemplative, no figurative imagery, no human or animal forms, no faces, no text, no letters",
  "celestial":
    "deep midnight cosmos, drifting stars, soft nebulae, dawn glow at edges, purple and gold and blue, vast and luminous, no figurative imagery, no human or animal forms, no faces, no text, no letters",
};

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

/** Generate a parchment substrate for the reel. */
export const generateSubstrate = createServerFn({ method: "POST" })
  .inputValidator((input: { reelId: string; style: ReelStyle }) => input)
  .handler(async ({ data }) => {
    const stylePrompt = STYLE_PROMPTS[data.style];
    const prompt = `A vertical 9:16 portrait artistic background. Aged warm parchment paper texture with subtle ink stains, worn edges, soft vignette. Style influence: ${stylePrompt}. Empty center area for text overlay. Painterly, museum-quality, no people, no text, no calligraphy. Sacred and reverent mood.`;
    const dataUrl = await generateImage(prompt);
    const url = await uploadDataUrl(dataUrl, `${data.reelId}/substrate.png`);
    await supabaseAdmin.from("reels").update({ substrate_url: url, style: data.style }).eq("id", data.reelId);
    return { url };
  });

/** Generate a per-ayah background informed by style + meaning + maqam mood. */
export const generateAyahBackground = createServerFn({ method: "POST" })
  .inputValidator((input: {
    reelId: string;
    ayahNumber: number;
    style: ReelStyle;
    maqamMood: string;
    palette: string[];
    meaning: { mood: string; imagery: string; concept: string; colorHint: string };
  }) => input)
  .handler(async ({ data }) => {
    const stylePrompt = STYLE_PROMPTS[data.style];
    const prompt = `Vertical 9:16 atmospheric background art. ${stylePrompt}. Mood: ${data.maqamMood}, ${data.meaning.mood}. Imagery: ${data.meaning.imagery}. Theme: ${data.meaning.concept}. Color: ${data.meaning.colorHint}, accent palette ${data.palette.join(", ")}. Soft empty area in the middle and lower third for verse text overlay. No people, no animals, no text, no letters, no calligraphy. Painterly, sacred, museum-quality.`;
    const dataUrl = await generateImage(prompt);
    const url = await uploadDataUrl(dataUrl, `${data.reelId}/ayah-${data.ayahNumber}-bg.png`);
    await supabaseAdmin.from("ayah_assets").upsert(
      { reel_id: data.reelId, ayah_number: data.ayahNumber, background_url: url, meaning: data.meaning as never },
      { onConflict: "reel_id,ayah_number" },
    );
    return { url };
  });

/** Generate a gold-leaf ornamental flourish. */
export const generateOrnament = createServerFn({ method: "POST" })
  .inputValidator((input: { reelId: string; ayahNumber: number; style: ReelStyle }) => input)
  .handler(async ({ data }) => {
    const prompt = `A small ornamental gold-leaf flourish for an illuminated Quranic manuscript. Centered, transparent-friendly background, intricate Islamic geometric and vegetal patterns, real gold leaf texture, no text, no calligraphy, no human or animal forms. Style: ${data.style}. 1:1 square composition.`;
    const dataUrl = await generateImage(prompt);
    const url = await uploadDataUrl(dataUrl, `${data.reelId}/ayah-${data.ayahNumber}-ornament.png`);
    await supabaseAdmin.from("ayah_assets").upsert(
      { reel_id: data.reelId, ayah_number: data.ayahNumber, ornament_url: url },
      { onConflict: "reel_id,ayah_number" },
    );
    return { url };
  });

export { STYLE_PROMPTS };
