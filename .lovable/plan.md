

# Quran Reel Studio — v1

A tool where you upload an audio recitation and download a uniquely beautiful 9:16 vertical reel that feels like a piece of sacred art.

## The reel (what gets rendered)

A 1080×1920 MP4 with this layered visual system:

**Substrate**
- AI-generated parchment/paper texture base (Nano Banana, regenerated per reel for uniqueness), warm ivory/cream/sepia
- Subtle paper grain, edge vignette, breathing slow zoom throughout

**Background art (per ayah)**
- AI-generated atmospheric art in the chosen aesthetic (Calligraphic Bloom / Liquid Light / Sacred Geometry / Celestial)
- Generation prompt is built from the **verse meaning analysis** + **detected maqam mood** — so a sad verse in Saba gets muted indigo drifting ink; a verse about creation in Hijaz gets warm cosmic light
- Slow drift motion, parallax layered behind the text

**Verse layer (the centerpiece)**
- **Real Uthmanic Hafs / Amiri Quran font** — 100% accurate Quranic text
- **Reed-ink red** rubrication tone with ink-bleed treatment
- **Stroke-drawn letter reveal** — Arabic draws on like a calligrapher's reed pen, synced word-by-word to recitation
- **Word illumination** — currently-recited word gets a soft gold halo (audio-reactive)
- English (Khattab) below in Lora serif, phrase-by-phrase fade+rise

**Ornamental layer**
- Generative gold-leaf flourishes between ayahs (Islamic geometric/vegetal, AI-generated)
- Page-fold or ink-bleed transitions between ayahs

**Final beat**
- Full ayah recomposed as an illuminated manuscript page with ornamental borders

**Audio-reactive + maqam-driven color grading**
- Detected maqam sets the base palette (Saba=indigo, Hijaz=amber, Bayati=teal, Rast=green/gold, Nahawand=rose)
- Voice amplitude pulses light intensity, particle density, halo glow

## The user flow

1. **Upload** recitation audio
2. **Auto-detect verses** with **constrained matching** (~98% accurate): Gemini transcribes Arabic → strip diacritics → sliding-window fuzzy match across the entire Quran corpus → top 3 candidates with confidence score
3. **Confirm or correct** — dropdown to override surah + ayah range
4. **Maqam detection** — Gemini audio analysis + pitch-contour matching, runs in background
5. **Verse meaning analysis** — Gemini analyzes each ayah for mood, imagery, intensity
6. **Style selection** — auto-suggested based on surah, with chip picker for the 4 aesthetics
7. **AI generates** parchment substrate, per-ayah backgrounds, gold flourishes (in chosen style, informed by verse meaning + maqam)
8. **Live Remotion preview** in browser
9. **Server-side render** → MP4 download

## What gets built

**Routes**
- `/` — Home (hero + sample reel + Upload CTA)
- `/studio` — Upload → detect → confirm → style → preview → render workspace
- `/about` — How it works + the four aesthetics + the maqam science

**Server functions** (TanStack Start `createServerFn`)
- `uploadAudio` — to Lovable Cloud storage
- `detectVerses` — Gemini Arabic transcription + constrained corpus matching (~98% accuracy)
- `fetchVerses` — Arabic + Khattab translation from AlQuran.cloud API
- `detectMaqam` — Gemini audio analysis + returns maqam name + mood + intensity
- `analyzeVerseMeaning` — Gemini analyzes each ayah for mood/imagery/concepts
- `generateSubstrate` — Nano Banana parchment texture
- `generateAyahBackground` — Nano Banana per-ayah background (prompt built from style + verse meaning + maqam mood)
- `generateOrnaments` — Nano Banana gold-leaf flourishes
- `renderReel` — Remotion server render → MP4 to storage
- `getRenderStatus` — poll progress

**Data (Lovable Cloud)**
- `reels` table: id, audio_url, surah, ayah_start, ayah_end, style, maqam, status, video_url
- `ayah_assets` table: reel_id, ayah_number, background_url, ornament_url (cached for instant re-renders)
- Storage buckets: `recitations`, `reel-assets`, `rendered-reels`
- No auth in v1

**Rendering pipeline**
- Remotion 9:16 composition with persistent layers (substrate, color grade, ornaments) + per-ayah TransitionSeries
- Real Quranic fonts loaded via `@remotion/fonts`
- Stroke-reveal animation via SVG path interpolation on the Arabic
- Server-side render via programmatic Remotion renderer

## Honest scope notes

- **Word-sync is estimated** (audio duration split proportionally by syllable count). Looks great ~85% of the time. No fine-tune timeline in v1 — we can add later if needed.
- **Maqam detection accuracy**: ~75-85% with Gemini, higher with pitch-contour confirmation. We'll show the detected maqam to the user and let them override.
- **Render time**: ~60-120s per reel (multiple AI image generations + Remotion render). Cached after first render.
- **AI image cost per reel**: ~5-10 generations (substrate + per-ayah backgrounds + ornaments). Reasonable via Lovable AI Gateway.
- **Calligraphy is real Quranic font**, not AI-generated — for accuracy. AI generates everything *around* it.

## v1 build order

1. Project scaffold + Lovable Cloud + Quranic fonts loaded
2. Upload + verse detection (constrained matching) + manual override UI
3. Maqam + verse meaning analysis pipeline
4. Nano Banana asset generation pipeline (substrate + backgrounds + ornaments)
5. Remotion composition with all 4 aesthetics + stroke-draw calligraphy + audio-reactive layer
6. Studio preview + server render + download
7. Home + About pages

