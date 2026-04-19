/**
 * CreativeBrief — output of the AI Art Director.
 * Drives every visual decision in the renderer for ONE recitation.
 *
 * The director picks/blends from 7 archetypes and outputs a fully-realized
 * brief with palette (with semantic roles), typography, camera language,
 * lighting, atmosphere, and per-ayah imagery prompts.
 */

export type ArchetypeId =
  | "sacred-ink"
  | "desert-dawn"
  | "midnight-mihrab"
  | "andalusian-garden"
  | "cosmic-tasbih"
  | "madinah-linen"
  | "tahajjud-ember";

export interface PaletteRoles {
  /** Deepest tone — used for vignettes, shadow gradients */
  shadow: string;
  /** Primary background tone */
  base: string;
  /** Mid tone — for atmospheric layer tinting */
  mid: string;
  /** Light/highlight color — for halos, lights */
  light: string;
  /** Single accent — used for ornaments, dividers, ayah numbers, ink color */
  accent: string;
}

export type AtmosphereKind =
  | "dust-motes"
  | "soft-bokeh"
  | "starfield"
  | "candle-flicker"
  | "silk-fabric"
  | "light-rays"
  | "water-ripple"
  | "mist";

export type CameraLanguage =
  | "slow-push-in"
  | "parallax-drift"
  | "static-breath"
  | "vertical-rise"
  | "rack-focus"
  | "slow-zoom-out";

export type CalligraphyReveal =
  | "stroke-write"      // pen-stroke calligraphy (preferred)
  | "ink-bleed"          // mask + blur fallback
  | "fade-up";           // last resort

export interface AyahDirection {
  ayah: number;
  /** Pure-atmosphere image prompt (no text/figures) */
  imagePrompt: string;
  /** "warm" | "cool" | "neutral" — applied as canvas LUT */
  colorGrade: "warm" | "cool" | "neutral" | "desaturated";
  /** Mood word for this ayah, used in renderer */
  mood: string;
}

export interface CreativeBrief {
  /** Which archetype(s) the director chose */
  archetype: ArchetypeId;
  blendArchetype?: ArchetypeId;
  /** Director's one-line creative vision */
  vision: string;
  /** Mood word — single descriptor for the whole reel */
  mood: string;

  palette: PaletteRoles;

  typography: {
    /** Display serif for surah name + endcard */
    display: string;
    /** Body for translation */
    body: string;
    /** Always Amiri Quran for Arabic */
    arabic: "Amiri Quran";
  };

  camera: CameraLanguage;
  atmosphere: AtmosphereKind;
  reveal: CalligraphyReveal;

  /** Strength of motion 0-1 (matches maqam intensity) */
  motionIntensity: number;
  /** Particle density 0-1 */
  particleDensity: number;
  /** Vignette strength 0-1 */
  vignette: number;

  /** Per-ayah image prompts and color grades */
  ayahDirections: AyahDirection[];

  /** Plain-text imagery prompt for the substrate */
  substratePrompt: string;
}

/** Maqam → motion vocabulary mapping — used both as director hint and renderer floor. */
export const MAQAM_MOTION: Record<string, { intensity: number; breath: number; description: string }> = {
  Saba:     { intensity: 0.35, breath: 0.20, description: "slow melancholic drift, mournful breath" },
  Hijaz:    { intensity: 0.65, breath: 0.55, description: "sharper accents, longing pull" },
  Bayati:   { intensity: 0.45, breath: 0.40, description: "gentle 4/4 breathing, devotional" },
  Rast:     { intensity: 0.55, breath: 0.45, description: "stable majestic rise" },
  Nahawand: { intensity: 0.40, breath: 0.35, description: "tender contemplative drift" },
  Sikah:    { intensity: 0.60, breath: 0.50, description: "warm joyful sway" },
  Ajam:     { intensity: 0.70, breath: 0.55, description: "bright celebratory motion" },
  Kurd:     { intensity: 0.30, breath: 0.25, description: "introspective stillness" },
};

/** A small set of typography pairs the director can pick from. */
export const FONT_PAIRS: Array<{ display: string; body: string; vibe: string }> = [
  { display: "Cormorant Garamond", body: "Lora", vibe: "editorial classical" },
  { display: "Playfair Display", body: "Source Sans 3", vibe: "literary refined" },
  { display: "EB Garamond", body: "Inter", vibe: "scholarly intimate" },
  { display: "Bodoni Moda", body: "DM Sans", vibe: "high-contrast modern" },
  { display: "Cardo", body: "Karla", vibe: "manuscript humanist" },
];

/** Archetype → human-readable vibe (used in director prompt). */
export const ARCHETYPE_DESCRIPTIONS: Record<ArchetypeId, string> = {
  "sacred-ink":       "warm parchment, deep ink, ember gold; slow breath; ink-bleed reveal; intimate manuscript",
  "desert-dawn":      "sand tones, low golden sun, dust motes, slow horizontal drift; vast and open",
  "midnight-mihrab":  "deep teal/indigo, brass, candlelight flicker, vertical reveal; sacred night prayer",
  "andalusian-garden":"terracotta, jade, jasmine white, soft bokeh, organic drift; lush and lyrical",
  "cosmic-tasbih":    "near-black, starfield, silver, slow zoom-out, particle constellations; vast and luminous",
  "madinah-linen":    "cream, olive, dusty rose, soft fabric folds, gentle parallax; soft and dignified",
  "tahajjud-ember":   "near-black, single ember-orange glow, intimate close-up; quiet pre-dawn devotion",
};

/** Default brief — used as a fallback if the director call fails. */
export function defaultBrief(maqam = "Bayati"): CreativeBrief {
  const motion = MAQAM_MOTION[maqam] ?? MAQAM_MOTION.Bayati;
  return {
    archetype: "sacred-ink",
    vision: "warm parchment manuscript, ink and gold, breathing slowly with the recitation",
    mood: "reverent",
    palette: { shadow: "#1a1208", base: "#3a2a1a", mid: "#7a5a3a", light: "#f5e8c8", accent: "#c9a04c" },
    typography: { display: "Cormorant Garamond", body: "Lora", arabic: "Amiri Quran" },
    camera: "static-breath",
    atmosphere: "dust-motes",
    reveal: "stroke-write",
    motionIntensity: motion.intensity,
    particleDensity: 0.35,
    vignette: 0.55,
    ayahDirections: [],
    substratePrompt: "aged warm parchment paper, soft worn edges, subtle ink stains, painterly texture",
  };
}
