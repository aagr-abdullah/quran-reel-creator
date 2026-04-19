/**
 * AI Art Director — single Gemini 2.5 Pro call that produces a CreativeBrief
 * unique to this recitation. Reads ayah meanings, maqam, intensity, duration,
 * and prior-brief avoidance hints, then returns a fully-realized creative
 * direction the renderer consumes.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  type CreativeBrief,
  type ArchetypeId,
  type AtmosphereKind,
  type CameraLanguage,
  type CalligraphyReveal,
  ARCHETYPE_DESCRIPTIONS,
  FONT_PAIRS,
  MAQAM_MOTION,
  defaultBrief,
} from "@/lib/brief";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const VALID_ARCHETYPES: ArchetypeId[] = [
  "sacred-ink", "desert-dawn", "midnight-mihrab", "andalusian-garden",
  "cosmic-tasbih", "madinah-linen", "tahajjud-ember",
];
const VALID_ATMOSPHERES: AtmosphereKind[] = [
  "dust-motes", "soft-bokeh", "starfield", "candle-flicker",
  "silk-fabric", "light-rays", "water-ripple", "mist",
];
const VALID_CAMERAS: CameraLanguage[] = [
  "slow-push-in", "parallax-drift", "static-breath",
  "vertical-rise", "rack-focus", "slow-zoom-out",
];
const VALID_REVEALS: CalligraphyReveal[] = ["stroke-write", "ink-bleed", "fade-up"];

const FORBIDDEN_IMAGERY =
  "ABSOLUTELY FORBIDDEN: no letters, no words, no Arabic text, no calligraphy, no runes, no glyphs, no sigils, no eyes, no triangles, no pyramids, no all-seeing-eye, no pentagrams, no hexagrams, no stars-of-david, no occult imagery, no faces, no people, no human figures, no animals, no religious figures, no hands, no feet, no symbols of any kind. Pure atmospheric/landscape/texture imagery only.";

export const directReel = createServerFn({ method: "POST" })
  .inputValidator((input: {
    reelId: string;
    surahName: string;
    surahNameEnglish: string;
    maqam: string;
    maqamMood: string;
    intensity: number;
    durationSec: number;
    ayahs: Array<{ number: number; arabic: string; translation: string; meaning?: { mood: string; imagery: string; concept: string; colorHint: string } }>;
    /** Last 3 archetype IDs the user has seen — director should avoid these. */
    avoidArchetypes?: ArchetypeId[];
    /** Optional re-direct seed for variety on re-roll */
    seed?: number;
  }) => input)
  .handler(async ({ data }): Promise<{ brief: CreativeBrief }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const motion = MAQAM_MOTION[data.maqam] ?? MAQAM_MOTION.Bayati;

    const archetypeMenu = VALID_ARCHETYPES
      .map((a) => `- "${a}" — ${ARCHETYPE_DESCRIPTIONS[a]}`)
      .join("\n");
    const fontMenu = FONT_PAIRS
      .map((f) => `- display="${f.display}", body="${f.body}" — ${f.vibe}`)
      .join("\n");

    const ayahSummary = data.ayahs
      .map((a) => `Ayah ${a.number}: "${a.translation}" (mood: ${a.meaning?.mood ?? "?"}, imagery: ${a.meaning?.imagery ?? "?"}, concept: ${a.meaning?.concept ?? "?"})`)
      .join("\n");

    const avoidLine = data.avoidArchetypes && data.avoidArchetypes.length
      ? `\n\nAVOID these archetypes (used in user's last renders): ${data.avoidArchetypes.join(", ")}. Choose something visually distant.`
      : "";

    const prompt = `You are an Art Director for sacred Quranic recitation films (vertical 1080x1920).
Output ONE creative brief — a complete visual world for THIS specific recitation.
Be specific, opinionated, and Islamically appropriate. No clichés.

RECITATION DATA
Surah: ${data.surahNameEnglish} (${data.surahName})
Maqam: ${data.maqam} (${data.maqamMood}) — intensity ${data.intensity}/10
Maqam motion: ${motion.description}
Duration: ${data.durationSec.toFixed(1)}s
Ayahs:
${ayahSummary}

ARCHETYPE MENU (pick one primary, optionally blend a second)
${archetypeMenu}

TYPOGRAPHY MENU (pick one pair)
${fontMenu}
${avoidLine}

${FORBIDDEN_IMAGERY}

Return ONLY a single JSON object (no markdown, no commentary) with this exact shape:
{
  "archetype": <one of: ${VALID_ARCHETYPES.map(a=>`"${a}"`).join(", ")}>,
  "blendArchetype": <optional, one of the same list, or null>,
  "vision": "<one sentence creative vision specific to these ayahs>",
  "mood": "<one word>",
  "palette": {
    "shadow": "<#hex>", "base": "<#hex>", "mid": "<#hex>",
    "light": "<#hex>", "accent": "<#hex, single accent color>"
  },
  "typography": { "display": "<from menu>", "body": "<from menu>" },
  "camera": <one of: ${VALID_CAMERAS.map(c=>`"${c}"`).join(", ")}>,
  "atmosphere": <one of: ${VALID_ATMOSPHERES.map(a=>`"${a}"`).join(", ")}>,
  "reveal": "stroke-write",
  "motionIntensity": <0-1, derived from maqam intensity ${data.intensity}/10>,
  "particleDensity": <0-1>,
  "vignette": <0-1>,
  "substratePrompt": "<2-3 sentences describing the base background plate for this reel — pure atmosphere, no figures>",
  "ayahDirections": [
    ${data.ayahs.map((a) => `{ "ayah": ${a.number}, "imagePrompt": "<one full sentence: pure atmospheric imagery for this ayah, no figures, no text>", "colorGrade": <"warm"|"cool"|"neutral"|"desaturated">, "mood": "<one word>" }`).join(",\n    ")}
  ]
}`;

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_completion_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const txt = await aiRes.text();
    if (!aiRes.ok) {
      console.error("Director failed:", aiRes.status, txt.slice(0, 500));
      throw new Error(`Director failed (${aiRes.status}): ${txt.slice(0, 200)}`);
    }
    if (!txt.trim()) throw new Error("Director returned empty body");

    let parsedJson: any;
    try { parsedJson = JSON.parse(txt); } catch {
      throw new Error(`Director returned non-JSON outer envelope: ${txt.slice(0, 200)}`);
    }
    const finishReason = parsedJson.choices?.[0]?.finish_reason;
    const raw: string = parsedJson.choices?.[0]?.message?.content ?? "";
    if (!raw.trim()) {
      throw new Error(`Director returned empty content (finish_reason=${finishReason ?? "unknown"})`);
    }

    // Extract JSON object from possibly-wrapped response
    const m = raw.match(/\{[\s\S]*\}/);
    let briefJson: any;
    if (m) {
      try { briefJson = JSON.parse(m[0]); } catch (e) {
        console.error("Director JSON parse failed, falling back. Raw:", raw.slice(0, 500));
        briefJson = null;
      }
    }
    if (!briefJson) {
      const fallback = defaultBrief(data.maqam);
      fallback.ayahDirections = data.ayahs.map((a) => ({
        ayah: a.number,
        imagePrompt: a.meaning?.imagery
          ? `${a.meaning.imagery}, ${a.meaning.colorHint ?? "warm tones"}, atmospheric, painterly, vertical composition`
          : "soft golden light through dust, vertical composition, painterly",
        colorGrade: "warm" as const,
        mood: a.meaning?.mood ?? "reverent",
      }));
      await persistBrief(data.reelId, fallback);
      return { brief: fallback };
    }

    // Sanitize + clamp
    const archetype: ArchetypeId = VALID_ARCHETYPES.includes(briefJson.archetype) ? briefJson.archetype : "sacred-ink";
    const blendArchetype: ArchetypeId | undefined =
      briefJson.blendArchetype && VALID_ARCHETYPES.includes(briefJson.blendArchetype) ? briefJson.blendArchetype : undefined;
    const camera: CameraLanguage = VALID_CAMERAS.includes(briefJson.camera) ? briefJson.camera : "static-breath";
    const atmosphere: AtmosphereKind = VALID_ATMOSPHERES.includes(briefJson.atmosphere) ? briefJson.atmosphere : "dust-motes";
    const reveal: CalligraphyReveal = VALID_REVEALS.includes(briefJson.reveal) ? briefJson.reveal : "stroke-write";

    const palette = {
      shadow: pickHex(briefJson.palette?.shadow, "#1a1208"),
      base:   pickHex(briefJson.palette?.base,   "#3a2a1a"),
      mid:    pickHex(briefJson.palette?.mid,    "#7a5a3a"),
      light:  pickHex(briefJson.palette?.light,  "#f5e8c8"),
      accent: pickHex(briefJson.palette?.accent, "#c9a04c"),
    };

    // Typography sanitization — must be from menu
    const fontPair = FONT_PAIRS.find((p) =>
      p.display === briefJson.typography?.display && p.body === briefJson.typography?.body
    ) ?? FONT_PAIRS[0];

    // ayahDirections — ensure 1 per ayah, fill missing
    const directionByNum = new Map<number, any>();
    if (Array.isArray(briefJson.ayahDirections)) {
      for (const d of briefJson.ayahDirections) {
        if (typeof d?.ayah === "number") directionByNum.set(d.ayah, d);
      }
    }
    const ayahDirections = data.ayahs.map((a) => {
      const d = directionByNum.get(a.number);
      return {
        ayah: a.number,
        imagePrompt: typeof d?.imagePrompt === "string" && d.imagePrompt.length > 10
          ? d.imagePrompt
          : (a.meaning?.imagery
              ? `${a.meaning.imagery}, ${a.meaning.colorHint ?? "warm tones"}, atmospheric painterly composition`
              : "soft volumetric light through dust, atmospheric painterly composition"),
        colorGrade: (["warm","cool","neutral","desaturated"] as const).includes(d?.colorGrade) ? d.colorGrade : "warm" as const,
        mood: typeof d?.mood === "string" ? d.mood : (a.meaning?.mood ?? "reverent"),
      };
    });

    const brief: CreativeBrief = {
      archetype,
      blendArchetype,
      vision: typeof briefJson.vision === "string" ? briefJson.vision : "sacred reverent recitation",
      mood: typeof briefJson.mood === "string" ? briefJson.mood : "reverent",
      palette,
      typography: { display: fontPair.display, body: fontPair.body, arabic: "Amiri Quran" },
      camera,
      atmosphere,
      reveal,
      motionIntensity: clamp01(briefJson.motionIntensity ?? motion.intensity),
      particleDensity: clamp01(briefJson.particleDensity ?? 0.35),
      vignette: clamp01(briefJson.vignette ?? 0.55),
      ayahDirections,
      substratePrompt: typeof briefJson.substratePrompt === "string" && briefJson.substratePrompt.length > 10
        ? briefJson.substratePrompt
        : "aged warm parchment paper, soft worn edges, subtle ink stains, painterly texture",
    };

    await persistBrief(data.reelId, brief);
    return { brief };
  });

async function persistBrief(reelId: string, brief: CreativeBrief) {
  try {
    // Read existing meta and merge
    const { data: row } = await supabaseAdmin.from("reels").select("meta").eq("id", reelId).maybeSingle();
    const existingMeta = (row?.meta as Record<string, unknown> | null) ?? {};
    await supabaseAdmin
      .from("reels")
      .update({ meta: { ...existingMeta, brief } as never })
      .eq("id", reelId);
  } catch (e) {
    console.error("Failed to persist brief:", e);
  }
}

function pickHex(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1]}` : fallback;
}

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
