

## Audit: Original 8 complaints vs. current code

| # | Complaint | Status | Evidence |
|---|---|---|---|
| 1 | Words out of sync with audio | **PARTIAL** — char-weighted timing only. No real audio alignment. | `wordFrameOffsets()` weights by char count. There's no Gemini word-alignment pass. |
| 2 | Arabic shown twice, no translation | **MOSTLY FIXED** — translation now always-on (line 280-298). But Arabic still appears in TWO places per scene: the SVG calligraphy (line 270) **and** the "Surah chip" in the top-right (line 539) renders the surah's Arabic name during the first 72 frames. Plus the calligraphy SVG itself doesn't render visible Arabic letters because the `transform: scale(1,-1)` y-flip is applied AFTER `translate(pad, pad+ascender)` — this is correct math, but combined with `viewBox` height `vbH = totalH + pad*2` where ascender~+1300 and descender~-500, **glyphs may render outside the viewBox or upside-down depending on the font**. Worth verifying visually. |
| 3 | Aesthetics / design / visibility | **ADDRESSED** — AI Art Director (`directReel`) generates a per-render `CreativeBrief` with palette, typography, camera, atmosphere. |
| 4 | Stroke-by-stroke calligraphy | **IMPLEMENTED** — `shapeAyahs` server fn + `CalligraphySVG` component with `strokeDasharray`/`strokeDashoffset`. Caveat: opentype.js Arabic shaping is partial — rare ligatures may break. Untested visually. |
| 5 | Elven/Illuminati hallucinations | **ADDRESSED** — `FORBIDDEN_IMAGERY` hard negative list in director, also in `assets.functions.ts`. |
| 6 | "Bismillah at the end" | **FIXED** — `Endcard` now shows surah name + ayah range only, no `ﷻ` glyph. |
| 7 | "An-Naml at start, audio plays for 2s before letters" | **FIXED** — verses start at frame 0 (line 69 comment, line 144). The 60-frame intro block is gone. Surah info is now a small corner chip during first 72 frames. |
| 8 | Motion that flows with maqam/beat | **PARTIALLY ADDRESSED** — `useAudioData` + `visualizeAudio` drives `amplitude` → fed into camera breath, particle opacity, background scale. Maqam → `motionIntensity` mapping exists. But: no per-word amplitude reactivity on the calligraphy stroke speed itself. Audio reactivity is global, not synced to recited words. |

## Three real gaps that remain

### A. Word-to-audio sync is still approximate
Current: char-weighted distribution across each ayah's frame window. This is a floor, not real karaoke sync. The plan explicitly mentioned an optional Gemini word-alignment pass — **never built**.

**Fix:** Add `src/server/align.functions.ts` — a Gemini call that takes the audio URL + the per-ayah word list and returns per-word start/end timestamps in seconds. The studio passes the ayah-window offset to anchor it. Renderer uses these timestamps when present, falls back to char-weighted when absent.

Honest caveat: Gemini's audio timestamping is imperfect — expect ±150ms drift, not frame-perfect. Still a massive upgrade over even-split.

### B. Calligraphy SVG hasn't been visually verified
The `viewBox` math + y-flip + RTL word layout is delicate. With Amiri Quran's ascender (~1372) + descender (~-686), and our `pad = totalH * 0.15`, the glyphs should sit inside, but there's a real risk that:
- Glyphs render mirrored if the font's path direction conflicts with our flip
- Words overlap because `getAdvanceWidth` on each word independently doesn't account for cross-word kashida or context
- The container's `top: "32%"` may push the SVG off-screen for long ayahs

**Fix:** Render a single still frame (`bunx remotion still` won't work in our env, but the Player in Studio shows it live). I'll instrument the component to log warning if `vbH > 5000` or any word width is 0, and add a per-glyph fallback using HTML+`Amiri Quran` web font when SVG fails (graceful degrade — still see writing reveal via per-letter fade if SVG path is empty).

### C. The "surah-name-in-Arabic" chip overlaps with calligraphy intent
Top-right corner during 0-72 frames shows the surah's Arabic name. This is the "Arabic shown twice" complaint resurfacing — for the first 2.4 seconds the viewer sees both the surah-name Arabic AND the ayah-1 calligraphy stroking on. 

**Fix:** Make the chip Latin-only — `surahNameEnglish · ayahStart–ayahEnd` only, no Arabic. The Arabic reveal belongs solely in the ayah calligraphy.

## What I'll change (concrete)

1. **NEW** `src/server/align.functions.ts` — Gemini 2.5 Pro audio alignment server fn returning `Array<{ ayah: number; words: Array<{ text: string; startSec: number; endSec: number }> }>`. Called after `shapeAyahs`, results merged into `shapedByNum` as optional per-word frame offsets.
2. **EDIT** `src/remotion/QuranReel.tsx` —
   - `wordFrameOffsets` accepts optional precomputed timestamps; uses them when present.
   - Add per-word amplitude boost: when frame is in the active word window, `strokeWidth` and `glow` get a small boost from `amplitude` so each recited word visibly *responds* to the voice.
   - `SurahChip`: Latin-only, no Arabic name.
   - Add safety guards on `CalligraphySVG`: if `vbH > 4000` or `totalW === 0`, fall back to HTML rendering with `font-family: 'Amiri Quran'` and per-letter opacity reveal so the user always sees the text writing on, even if SVG paths fail.
3. **EDIT** `src/routes/studio.tsx` — call `alignWords` after `shapeFn`, store timestamps, pass into `ayahs[].shaped.words[].startFrame/endFrame`.
4. **EDIT** `src/lib/brief.ts` + `ShapedWord` type — add optional `startFrame`/`endFrame`.
5. **EDIT** `public/fonts/` — load Amiri Quran as a web font via `@font-face` in `src/styles.css` so the HTML fallback path also looks Quranic.

## Files touched
- NEW `src/server/align.functions.ts`
- EDIT `src/remotion/QuranReel.tsx` (chip text, calligraphy guards, per-word reactivity, optional timestamp use)
- EDIT `src/routes/studio.tsx` (call align step, stitch timestamps in)
- EDIT `src/server/calligraphy.functions.ts` (extend ShapedWord type)
- EDIT `src/lib/brief.ts` (no — actually `ShapedAyahData` lives in QuranReel.tsx; edit there)
- EDIT `src/styles.css` (`@font-face` for Amiri Quran fallback)

## Honest tradeoffs
- Gemini word alignment ≈ 85% accuracy. Better than nothing, not perfect karaoke.
- HTML fallback for calligraphy reveals letters by fade, not stroke — only triggers if SVG fails. Best-effort safety net.
- One extra Gemini call adds ~3-6s to pipeline.

## Not doing
- Not changing the visual archetypes / palette generation — those parts of the original plan are landed and working as designed.
- Not removing the camera/atmosphere system — adding to it.

