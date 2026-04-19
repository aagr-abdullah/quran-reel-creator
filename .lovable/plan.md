

## What I heard

You want this to be a **filmmaking engine**, not a template renderer. Three real complaints:

1. **Holistic design is missing** — color, type, layout, contrast, composition aren't being reasoned about together per video. It's just "apply the Sacred Ink preset."
2. **Every video looks the same** — one global style = boring. Need per-recitation art direction.
3. **Stroke-by-stroke calligraphy is non-negotiable** — and the videos need way more *life* (camera moves, light, particles, breath, depth).

## The core idea: an AI Art Director per render

Right now the pipeline is: detect → static style preset → render. We add a new stage between detection and rendering:

```text
detect verses → ART DIRECTOR (Gemini 2.5 Pro) → assets + reel
                       ↓
                 reads ayah meanings, maqam,
                 tempo, audio mood → outputs a
                 full creative brief unique to
                 THIS recitation
```

The Art Director outputs structured JSON: palette (5 colors w/ roles), typography pairing, camera language, lighting mood, particle system choice, transition vocabulary, per-ayah imagery prompts, motion intensity curve. Every recitation gets its own film.

## What gets built

### 1. Art Director server function (new)
`src/server/director.functions.ts` — single Gemini 2.5 Pro call. Inputs: ayahs + meanings + maqam + tempo + duration. Output: a `CreativeBrief` JSON the renderer consumes. ~7 distinct visual archetypes it can choose from (Sacred Ink, Desert Dawn, Midnight Mihrab, Andalusian Garden, Cosmic Tasbih, Madinah Linen, Tahajjud Ember) — and it can blend them. Color palettes are generated *for this recitation*, not picked from a list.

### 2. Real stroke-by-stroke calligraphy (new)
`src/server/calligraphy.functions.ts` — server-side: takes Arabic text, uses `opentype.js` + Amiri Quran font (free, beautiful, RTL-correct) to convert each ayah into SVG path data with per-glyph metadata. Returns paths the renderer animates with `strokeDasharray`/`strokeDashoffset` so each letter literally writes itself in sync with the recited word. This is the headline feature.

Honest caveat: Arabic glyph shaping (initial/medial/final/isolated forms + ligatures) is hard. `opentype.js` handles basic shaping; for complex ligatures we use HarfBuzz via `harfbuzzjs` (WASM, Worker-compatible). I've verified harfbuzzjs runs on edge.

### 3. Renderer rewrite — `QuranReel.tsx`
- **Layered scene system**: background plate → atmospheric layer (dust/light/water per brief) → calligraphy layer → translation layer → vignette/grain. Each layer's motion is driven by the brief.
- **Audio-reactive everything**: `visualizeAudio()` drives camera breath, light intensity, particle density, calligraphy ink-flow speed.
- **Camera language**: slow push-ins, parallax drifts, rack focus blur — chosen by the brief, not hardcoded.
- **Per-word sync**: char-weighted timing as floor + optional Gemini word-alignment pass for true karaoke-grade sync on the calligraphy stroke reveal.
- **Motion curves match maqam**: Bayati = slow breathing 4/4; Hijaz = sharper accents; Saba = melancholic drift. Maqam → motion vocabulary mapping table.

### 4. Image gen rewrite — `assets.functions.ts`
- Prompts now built *from the brief*, not from a global preset.
- Hard negative list: no letters/runes/sigils/eyes/triangles/pentagrams/figures/faces.
- One pure-atmosphere prompt per ayah, tied to its `imagery` field.
- Optional cinematic look LUT applied post-gen via canvas (warm/cool/desaturate per brief).

### 5. Studio UX — `studio.tsx`
- Remove style picker entirely. The AI directs.
- After detection, show a "Creative Brief" preview card: palette swatches, chosen typography, camera language, mood word — so you see what's about to be rendered before committing render credits.
- "Re-direct" button: re-roll the brief if you don't like it. Cheap (one Gemini call), no re-render.
- Debug toggle showing per-word timing the renderer will use.

### 6. Variety guarantee
The director is prompted to **maximize visual distance from the last 3 briefs for this user** (stored client-side). So consecutive renders deliberately diverge — different palette families, different camera language, different atmosphere.

## The 7 visual archetypes (director picks/blends)

Each is a coherent design system, not just a color preset:

- **Sacred Ink** — parchment, ink, ember gold, slow breath, ink-bleed reveal
- **Desert Dawn** — sand tones, low sun, dust motes, slow horizontal drift
- **Midnight Mihrab** — deep teal/indigo, brass, candlelight flicker, vertical reveal
- **Andalusian Garden** — terracotta, jade, jasmine white, soft bokeh, organic drift
- **Cosmic Tasbih** — black, starfield, silver, slow zoom-out, particle constellations
- **Madinah Linen** — cream, olive, dusty rose, soft fabric folds, gentle parallax
- **Tahajjud Ember** — near-black, ember orange, single candle glow, intimate close-up

## Files touched

- NEW `src/server/director.functions.ts` — art director Gemini call + brief schema
- NEW `src/server/calligraphy.functions.ts` — Arabic → SVG paths via opentype.js + harfbuzzjs
- NEW `src/lib/brief.ts` — `CreativeBrief` types + maqam→motion mapping
- NEW `src/components/BriefPreview.tsx` — palette/type/mood card
- REWRITE `src/remotion/QuranReel.tsx` — layered scenes, calligraphy strokes, audio-reactive camera
- REWRITE `src/server/assets.functions.ts` — brief-driven prompts, hard negative list
- EDIT `src/server/render.functions.ts` — pass brief through to Lambda
- EDIT `src/remotion/Root.tsx` — accept brief in defaultProps
- EDIT `src/routes/studio.tsx` — brief preview, re-direct button, no style picker
- EDIT `src/lib/surahs.ts` — drop `STYLES`
- ADD deps: `opentype.js`, `harfbuzzjs` (Worker-compatible WASM)
- ADD font: Amiri Quran TTF in `public/fonts/`

## Honest tradeoffs

- **Stroke-by-stroke for Arabic is the hard part.** First version may have minor glyph-join imperfections on rare ligatures. I'll ship it, you'll see, we iterate. Better than fake "ink bleed" pretending to be calligraphy.
- **Director adds ~3-5s to pipeline** (one extra Gemini call). Worth it.
- **Renders cost more credits** (better backgrounds, longer composition logic). Real.
- **No way to A/B preview the video before render.** The brief preview is the proxy. If it looks wrong, re-direct before spending render credits.

## What I'm explicitly NOT doing

- Not asking design questions. Director decides.
- Not adding 4 style options. Infinite variety via per-render briefs > 4 fixed presets.
- Not Three.js / 3D. Adds 2 days, not the bottleneck on "feeling alive."

