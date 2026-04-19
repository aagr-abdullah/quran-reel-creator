/**
 * Quran Reel — Remotion composition (1080x1920, 30fps).
 *
 * Brief-driven layered scene system:
 *   shadow plate → AI background → atmosphere layer (per brief) →
 *   stroke-write calligraphy → translation → vignette + grain
 *
 * Audio-reactive: visualizeAudio drives breath, light, particle density,
 * calligraphy ink-flow speed.
 */
import {
  AbsoluteFill,
  Sequence,
  Audio,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  random,
} from "remotion";
import { visualizeAudio, useAudioData } from "@remotion/media-utils";
import type { CreativeBrief } from "@/lib/brief";
import { defaultBrief } from "@/lib/brief";

export interface ShapedWord {
  pathD: string;
  approxLength: number;
  width: number;
  text: string;
  glyphCount: number;
  /** Optional precomputed start frame (from Gemini alignment), relative to scene start */
  startFrame?: number;
  /** Optional precomputed end frame (from Gemini alignment), relative to scene start */
  endFrame?: number;
}

export interface ShapedAyahData {
  ayahNumber: number;
  words: ShapedWord[];
  totalWidth: number;
  ascender: number;
  descender: number;
  unitsPerEm: number;
}

export interface AyahData {
  number: number;
  arabic: string;
  translation: string;
  durationFrames: number;
  backgroundUrl?: string;
  shaped?: ShapedAyahData;
}

export interface ReelData {
  audioUrl: string;
  substrateUrl?: string;
  brief: CreativeBrief;
  surahName: string;
  surahNameEnglish: string;
  ayahStart: number;
  ayahEnd: number;
  ayahs: AyahData[];
}

export const REEL_FPS = 30;
export const REEL_W = 1080;
export const REEL_H = 1920;

export function totalDurationFrames(ayahs: AyahData[]): number {
  // No padding intro/outro — verses start at frame 0; add 36-frame endcard tail
  return Math.max(60, ayahs.reduce((s, a) => s + a.durationFrames, 0) + 36);
}

/**
 * Per-word timing. Uses precomputed startFrame from Gemini alignment when
 * available; falls back to char-weighted distribution.
 */
function wordFrameTiming(words: ShapedWord[], sceneFrames: number): { offsets: number[]; durations: number[] } {
  const haveAlignment = words.length > 0 && words.every((w) => typeof w.startFrame === "number" && typeof w.endFrame === "number");
  if (haveAlignment) {
    const offsets = words.map((w) => Math.max(0, w.startFrame!));
    const durations = words.map((w, i) => {
      const end = w.endFrame!;
      const nextStart = offsets[i + 1] ?? sceneFrames;
      // honor measured end but never run past the next word
      return Math.max(6, Math.min(end, nextStart) - offsets[i]);
    });
    return { offsets, durations };
  }
  // Fallback: char-weighted
  const safeFrames = Math.max(1, sceneFrames - 12);
  const totalChars = words.reduce((s, w) => s + Math.max(1, w.text.length), 0);
  let cursor = 0;
  const offsets: number[] = [];
  for (const w of words) {
    offsets.push(cursor);
    cursor += Math.max(8, Math.round(safeFrames * (Math.max(1, w.text.length) / totalChars)));
  }
  const durations = offsets.map((o, i) => (offsets[i + 1] ?? sceneFrames - 12) - o);
  return { offsets, durations };
}

export function QuranReel({ data }: { data: ReelData }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const brief = data.brief ?? defaultBrief();
  const palette = brief.palette;

  // Audio-reactive amplitude (used for breath, light intensity)
  const audioData = useAudioData(data.audioUrl);
  let amplitude = 0.5;
  if (audioData) {
    try {
      const samples = visualizeAudio({ fps, frame, audioData, numberOfSamples: 16 });
      // Average low band (bass = breath)
      const lows = samples.slice(0, 6);
      amplitude = lows.length ? lows.reduce((s, v) => s + v, 0) / lows.length : 0.5;
    } catch { /* visualization not ready */ }
  }
  const reactiveBreath = 1 + (Math.sin((frame / fps) * 0.6) * 0.012 + amplitude * 0.02 * brief.motionIntensity);

  // Camera language derived transforms
  const cam = cameraTransform(brief.camera, frame, fps, durationInFrames, brief.motionIntensity);

  return (
    <AbsoluteFill style={{ background: palette.shadow, overflow: "hidden" }}>
      {/* Layer 1 — substrate plate */}
      <AbsoluteFill style={{ transform: `${cam} scale(${reactiveBreath})`, transformOrigin: "center" }}>
        {data.substrateUrl ? (
          <Img src={data.substrateUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              background: `radial-gradient(ellipse at 50% 30%, ${palette.light} 0%, ${palette.mid} 55%, ${palette.shadow} 100%)`,
            }}
          />
        )}
      </AbsoluteFill>

      {/* Layer 2 — palette wash overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${hexAlpha(palette.shadow, 0.35)} 0%, transparent 35%, transparent 65%, ${hexAlpha(palette.shadow, 0.5)} 100%)`,
          mixBlendMode: "multiply",
        }}
      />

      {/* Endcard overlay (the actual ayah scenes follow) */}
      {(() => {
        let cursor = 0;
        const els = data.ayahs.map((ayah) => {
          const from = cursor;
          cursor += ayah.durationFrames;
          return (
            <Sequence key={ayah.number} from={from} durationInFrames={ayah.durationFrames}>
              <AyahScene ayah={ayah} brief={brief} amplitude={amplitude} />
            </Sequence>
          );
        });
        return els;
      })()}

      {/* Atmosphere particles (always-on, density per brief) */}
      <AtmosphereLayer brief={brief} amplitude={amplitude} />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 ${280 * brief.vignette}px ${80 * brief.vignette}px ${hexAlpha(palette.shadow, 0.85)}`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle film grain (SVG noise) */}
      <FilmGrain frame={frame} />

      {/* Surah chip — small corner overlay during first 60 frames only */}
      <Sequence from={0} durationInFrames={72}>
        <SurahChip brief={brief} surahName={data.surahName} surahNameEnglish={data.surahNameEnglish} ayahStart={data.ayahStart} ayahEnd={data.ayahEnd} />
      </Sequence>

      {/* Endcard — final 36 frames */}
      <Sequence from={Math.max(0, durationInFrames - 36)} durationInFrames={36}>
        <Endcard brief={brief} surahNameEnglish={data.surahNameEnglish} ayahStart={data.ayahStart} ayahEnd={data.ayahEnd} />
      </Sequence>

      {/* Audio */}
      <Audio src={data.audioUrl} />
    </AbsoluteFill>
  );
}

function cameraTransform(
  cam: CreativeBrief["camera"],
  frame: number,
  fps: number,
  durationInFrames: number,
  intensity: number,
): string {
  const t = frame / Math.max(1, durationInFrames);
  const i = 0.5 + intensity * 0.5;
  switch (cam) {
    case "slow-push-in": {
      const z = interpolate(t, [0, 1], [1.04, 1.15]);
      return `scale(${z})`;
    }
    case "slow-zoom-out": {
      const z = interpolate(t, [0, 1], [1.18, 1.05]);
      return `scale(${z})`;
    }
    case "vertical-rise": {
      const y = interpolate(t, [0, 1], [20 * i, -30 * i]);
      return `translate3d(0, ${y}px, 0) scale(1.1)`;
    }
    case "parallax-drift": {
      const x = Math.sin((frame / fps) * 0.18) * 22 * i;
      const y = Math.cos((frame / fps) * 0.14) * 14 * i;
      return `translate3d(${x}px, ${y}px, 0) scale(1.08)`;
    }
    case "rack-focus":
      return `scale(1.08)`;
    case "static-breath":
    default:
      return `scale(1.04)`;
  }
}

/** Per-ayah scene with stroke-write calligraphy. */
function AyahScene({ ayah, brief, amplitude }: { ayah: AyahData; brief: CreativeBrief; amplitude: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const palette = brief.palette;

  // Scene-local fades
  const enter = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const exit = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const op = Math.min(enter, exit);

  // Per-word timing — uses Gemini alignment when present, char-weighted otherwise
  const words = ayah.shaped?.words ?? [];
  const { offsets, durations: wordDurations } = words.length
    ? wordFrameTiming(words, durationInFrames)
    : { offsets: [] as number[], durations: [] as number[] };

  // Translation always visible, fades in over 14 frames
  const transOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const transY = interpolate(frame, [0, 14], [16, 0], { extrapolateRight: "clamp" });

  // Per-ayah background drift
  const ayahDir = brief.ayahDirections.find((d) => d.ayah === ayah.number);
  const grade = ayahDir?.colorGrade ?? "warm";

  return (
    <AbsoluteFill style={{ opacity: op }}>
      {/* AI background plate */}
      {ayah.backgroundUrl && (
        <AbsoluteFill style={{ transform: `scale(${1.06 + amplitude * 0.02})`, opacity: 0.92 }}>
          <Img src={ayah.backgroundUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {/* Color grade LUT overlay */}
          <AbsoluteFill style={{ background: gradeOverlay(grade), mixBlendMode: "soft-light" }} />
          {/* Bottom darken for translation legibility */}
          <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent 30%, ${hexAlpha(palette.shadow, 0.7)} 100%)` }} />
        </AbsoluteFill>
      )}

      {/* Top — ayah number divider */}
      <div style={{ position: "absolute", top: 110, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 22 }}>
        <div style={{ height: 1, width: 160, background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)` }} />
        <div
          style={{
            fontFamily: `'${brief.typography.display}', serif`,
            fontSize: 30,
            color: palette.accent,
            border: `1px solid ${hexAlpha(palette.accent, 0.7)}`,
            borderRadius: 999,
            padding: "8px 22px",
            letterSpacing: 4,
            background: hexAlpha(palette.shadow, 0.55),
          }}
        >
          {ayah.number}
        </div>
        <div style={{ height: 1, width: 160, background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)` }} />
      </div>

      {/* Stroke-write calligraphy — SVG with HTML fallback */}
      {ayah.shaped && words.length > 0 && (
        <CalligraphyLayer
          shaped={ayah.shaped}
          offsets={offsets}
          wordDurations={wordDurations}
          frame={frame}
          palette={palette}
          amplitude={amplitude}
        />
      )}

      {/* Translation — always on, bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 220,
          left: 90,
          right: 90,
          textAlign: "center",
          fontFamily: `'${brief.typography.body}', Georgia, serif`,
          fontSize: 36,
          lineHeight: 1.5,
          color: palette.light,
          opacity: transOp,
          transform: `translateY(${transY}px)`,
          fontStyle: "italic",
          textShadow: `0 2px 12px ${hexAlpha(palette.shadow, 0.85)}`,
        }}
      >
        {ayah.translation}
      </div>

      {/* Bottom flourish */}
      <div style={{ position: "absolute", bottom: 110, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: palette.accent, opacity: 0.8 }} />
        <span style={{ width: 56, height: 1, background: palette.accent, opacity: 0.6, alignSelf: "center" }} />
        <span style={{ width: 8, height: 8, borderRadius: 999, background: palette.accent }} />
        <span style={{ width: 56, height: 1, background: palette.accent, opacity: 0.6, alignSelf: "center" }} />
        <span style={{ width: 6, height: 6, borderRadius: 999, background: palette.accent, opacity: 0.8 }} />
      </div>
    </AbsoluteFill>
  );
}

/**
 * Per-word stroke-by-stroke writing animation using SVG strokeDashoffset.
 * Each word is rendered as an SVG <path>; we ramp its dashoffset from
 * approxLength → 0 over the word's frame window. The word also gets a
 * filled "echo" that fades in at 70% to make the calligraphy feel solid.
 */
function CalligraphySVG({
  shaped,
  offsets,
  wordDurations,
  frame,
  palette,
}: {
  shaped: ShapedAyahData;
  offsets: number[];
  wordDurations: number[];
  frame: number;
  palette: CreativeBrief["palette"];
}) {
  // The font path coords have y-up. opentype draws baseline at y=0 with
  // negative y going up — so glyphs appear ABOVE the baseline.
  // We need a viewBox that includes the ascender-to-descender range.
  const ascender = shaped.ascender;
  const descender = shaped.descender;
  const totalH = ascender - descender; // descender is negative
  const words = shaped.words;

  // Lay words right-to-left across viewBox. Total width is sum of widths;
  // position cursor from the right edge.
  const totalW = shaped.totalWidth;
  // padding so strokes don't clip
  const pad = totalH * 0.15;
  const vbW = totalW + pad * 2;
  const vbH = totalH + pad * 2;
  // Compose word positions: cursor starts at (totalW), each word occupies
  // [cursor - width, cursor] then cursor -= width.
  let cursor = totalW;
  const wordX: number[] = words.map((w) => {
    const left = cursor - w.width;
    cursor -= w.width;
    return left;
  });

  // viewBox: y axis flipped so font's negative-y ascender draws upward.
  // Use transform on the inner <g> to translate baseline to (pad, pad+ascender)
  // and flip y (scale(1,-1)).

  return (
    <div
      style={{
        position: "absolute",
        top: "32%",
        left: 70,
        right: 70,
        display: "flex",
        justifyContent: "center",
        // scale entire SVG to fit width
      }}
    >
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Drop shadow filter for ink */}
        <defs>
          <filter id="ink-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="3" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ink-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform={`translate(${pad}, ${pad + ascender}) scale(1, -1)`}>
          {words.map((w, i) => {
            const wStart = offsets[i];
            const wDur = Math.max(8, wordDurations[i]);
            // 0..1 progress over word window
            const p = Math.max(0, Math.min(1, (frame - wStart) / wDur));
            // ease-out cubic for natural pen lift
            const ease = 1 - Math.pow(1 - p, 3);
            const dashOffset = (1 - ease) * w.approxLength;
            // Fill fades in at 60% progress
            const fillOp = Math.max(0, Math.min(1, (p - 0.6) / 0.35));
            const isCurrent = frame >= wStart && frame < wStart + wDur;
            const strokeColor = isCurrent ? palette.light : palette.light;
            const fillColor = palette.light;
            const glowFilter = isCurrent ? "url(#ink-glow)" : undefined;

            return (
              <g key={i} transform={`translate(${wordX[i]}, 0)`}>
                {/* Filled glyph (fades in) */}
                <path
                  d={w.pathD}
                  fill={fillColor}
                  fillOpacity={fillOp * 0.95}
                  filter={glowFilter}
                />
                {/* Stroked outline reveal */}
                <path
                  d={w.pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={w.approxLength}
                  strokeDashoffset={dashOffset}
                  opacity={1 - fillOp * 0.4}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/** Atmosphere particle layer — deterministic, brief-dependent. */
function AtmosphereLayer({ brief, amplitude }: { brief: CreativeBrief; amplitude: number }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const palette = brief.palette;
  const count = Math.round(60 + brief.particleDensity * 120);

  // Particle params depend on atmosphere kind
  const cfg = atmosphereConfig(brief.atmosphere);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: cfg.blend }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {Array.from({ length: count }).map((_, i) => {
          const seedX = random(`x${i}`);
          const seedY = random(`y${i}`);
          const seedR = random(`r${i}`);
          const seedSp = random(`s${i}`);
          const baseX = seedX * width;
          const baseY = seedY * height;
          // slow drift
          const t = frame / fps;
          const driftX = Math.sin(t * cfg.speed + i * 0.3) * cfg.driftX;
          const driftY = (cfg.fall ? -((t * cfg.driftY * (0.5 + seedSp)) % (height + 100)) + height : Math.cos(t * cfg.speed + i * 0.5) * cfg.driftY);
          const x = baseX + driftX;
          const y = baseY + driftY;
          const r = cfg.minR + seedR * (cfg.maxR - cfg.minR);
          const opacity = (cfg.minOp + seedR * (cfg.maxOp - cfg.minOp)) * (0.7 + amplitude * 0.4);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill={palette.light}
              opacity={opacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

function atmosphereConfig(kind: CreativeBrief["atmosphere"]) {
  switch (kind) {
    case "starfield":      return { blend: "screen" as const, speed: 0.05, driftX: 6,  driftY: 4,  fall: false, minR: 0.6, maxR: 2.0, minOp: 0.3, maxOp: 0.95 };
    case "candle-flicker": return { blend: "screen" as const, speed: 0.6,  driftX: 3,  driftY: 8,  fall: false, minR: 1.5, maxR: 5.0, minOp: 0.2, maxOp: 0.7  };
    case "soft-bokeh":     return { blend: "screen" as const, speed: 0.15, driftX: 24, driftY: 16, fall: false, minR: 6,   maxR: 26,  minOp: 0.05, maxOp: 0.25 };
    case "silk-fabric":    return { blend: "soft-light" as const, speed: 0.08, driftX: 18, driftY: 12, fall: false, minR: 1.2, maxR: 3,   minOp: 0.1, maxOp: 0.35 };
    case "light-rays":     return { blend: "screen" as const, speed: 0.10, driftX: 8,  driftY: 6,  fall: false, minR: 1,   maxR: 3,   minOp: 0.2, maxOp: 0.55 };
    case "water-ripple":   return { blend: "soft-light" as const, speed: 0.4,  driftX: 16, driftY: 6,  fall: false, minR: 2,   maxR: 6,   minOp: 0.15, maxOp: 0.35 };
    case "mist":           return { blend: "screen" as const, speed: 0.06, driftX: 30, driftY: 10, fall: false, minR: 12,  maxR: 36,  minOp: 0.04, maxOp: 0.12 };
    case "dust-motes":
    default:               return { blend: "screen" as const, speed: 0.18, driftX: 12, driftY: 10, fall: false, minR: 1.0, maxR: 3.5, minOp: 0.15, maxOp: 0.45 };
  }
}

function gradeOverlay(grade: "warm" | "cool" | "neutral" | "desaturated"): string {
  switch (grade) {
    case "cool":         return "linear-gradient(180deg, rgba(40,80,140,0.25), rgba(20,40,80,0.35))";
    case "desaturated":  return "linear-gradient(180deg, rgba(80,80,80,0.40), rgba(40,40,40,0.45))";
    case "neutral":      return "linear-gradient(180deg, rgba(60,55,50,0.18), rgba(40,35,30,0.25))";
    case "warm":
    default:             return "linear-gradient(180deg, rgba(180,110,50,0.22), rgba(120,60,20,0.32))";
  }
}

function FilmGrain({ frame }: { frame: number }) {
  // Static SVG noise (cheap). Frame parameter intentionally unused to keep deterministic.
  void frame;
  return (
    <AbsoluteFill style={{ opacity: 0.10, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="reel-noise">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.40  0 0 0 0 0.25  0 0 0 0.5 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#reel-noise)" />
      </svg>
    </AbsoluteFill>
  );
}

function SurahChip({
  brief, surahName, surahNameEnglish, ayahStart, ayahEnd,
}: { brief: CreativeBrief; surahName: string; surahNameEnglish: string; ayahStart: number; ayahEnd: number }) {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 12, 56, 72], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const palette = brief.palette;
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        right: 60,
        opacity: op,
        textAlign: "right",
        background: hexAlpha(palette.shadow, 0.55),
        padding: "10px 18px",
        borderRadius: 14,
        border: `1px solid ${hexAlpha(palette.accent, 0.5)}`,
      }}
    >
      <div style={{ fontFamily: "'Amiri Quran', serif", fontSize: 28, color: palette.light, direction: "rtl", lineHeight: 1.2 }}>
        {surahName}
      </div>
      <div style={{ fontFamily: `'${brief.typography.display}', serif`, fontSize: 14, color: palette.accent, letterSpacing: 3, marginTop: 4 }}>
        {surahNameEnglish.toUpperCase()} · {ayahStart}{ayahStart !== ayahEnd ? `–${ayahEnd}` : ""}
      </div>
    </div>
  );
}

function Endcard({ brief, surahNameEnglish, ayahStart, ayahEnd }: { brief: CreativeBrief; surahNameEnglish: string; ayahStart: number; ayahEnd: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 12, 24, 36], [0, 1, 1, 0.4], { extrapolateRight: "clamp" });
  const sp = spring({ frame, fps, config: { damping: 18 } });
  const palette = brief.palette;
  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, opacity: op }}>
      <div style={{ width: 80, height: 1, background: palette.accent, opacity: 0.6, transform: `scaleX(${sp})` }} />
      <div
        style={{
          fontFamily: `'${brief.typography.display}', serif`,
          fontSize: 44,
          color: palette.light,
          letterSpacing: 8,
          textTransform: "uppercase",
          opacity: 0.95,
        }}
      >
        {surahNameEnglish}
      </div>
      <div style={{ fontFamily: `'${brief.typography.body}', serif`, fontSize: 20, color: palette.accent, letterSpacing: 6, opacity: 0.85 }}>
        {ayahStart}{ayahStart !== ayahEnd ? ` – ${ayahEnd}` : ""}
      </div>
      <div style={{ width: 80, height: 1, background: palette.accent, opacity: 0.6, transform: `scaleX(${sp})` }} />
    </AbsoluteFill>
  );
}

function hexAlpha(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
