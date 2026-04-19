/**
 * Quran Reel — Remotion composition (1080x1920, 30fps).
 * Layered: substrate → ayah background → ornaments → calligraphy reveal → translation.
 * Plays the recitation audio directly in <Player>.
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
} from "remotion";
import type { ReelStyle } from "@/lib/surahs";

export interface AyahData {
  number: number;
  arabic: string;
  translation: string;
  durationFrames: number;
  backgroundUrl?: string;
  ornamentUrl?: string;
  meaning?: { mood: string; imagery: string; concept: string; colorHint: string };
}

export interface ReelData {
  audioUrl: string;
  substrateUrl?: string;
  style: ReelStyle;
  maqam: string;
  palette: string[];
  surahName: string;
  surahNameEnglish: string;
  ayahs: AyahData[];
}

export const REEL_FPS = 30;
export const REEL_W = 1080;
export const REEL_H = 1920;

export function totalDurationFrames(ayahs: AyahData[]): number {
  // 60-frame intro + sum + 60-frame outro
  return 60 + ayahs.reduce((s, a) => s + a.durationFrames, 0) + 60;
}

const STYLE_OVERLAYS: Record<ReelStyle, string> = {
  "calligraphic-bloom": "radial-gradient(ellipse at 30% 40%, rgba(180,80,40,0.10), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(120,60,20,0.12), transparent 70%)",
  "liquid-light": "radial-gradient(ellipse at 50% 30%, rgba(255,200,120,0.18), transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(80,80,180,0.20), transparent 70%)",
  "sacred-geometry": "radial-gradient(ellipse at 50% 50%, rgba(60,140,140,0.10), transparent 70%)",
  "celestial": "radial-gradient(ellipse at 50% 30%, rgba(120,90,200,0.20), transparent 60%), radial-gradient(ellipse at 50% 90%, rgba(200,160,60,0.15), transparent 60%)",
};

export function QuranReel({ data }: { data: ReelData }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow breathing zoom across the whole reel
  const breath = 1 + Math.sin((frame / REEL_FPS) * 0.4) * 0.012;

  return (
    <AbsoluteFill style={{ background: "#1a1410", overflow: "hidden" }}>
      {/* Substrate (warm parchment / generated) */}
      <AbsoluteFill style={{ transform: `scale(${1.04 * breath})`, transformOrigin: "center" }}>
        {data.substrateUrl ? (
          <Img
            src={data.substrateUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at 30% 20%, #f5e8c8 0%, #e8d4a0 55%, #c9a468 100%)" }} />
        )}
      </AbsoluteFill>

      {/* Style mood overlay */}
      <AbsoluteFill style={{ background: STYLE_OVERLAYS[data.style], mixBlendMode: "soft-light" }} />

      {/* Maqam color grade */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${data.palette[0]}22 0%, transparent 30%, transparent 70%, ${data.palette[2]}33 100%)`,
          mixBlendMode: "overlay",
        }}
      />

      {/* Edge vignette */}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 240px 60px rgba(40,20,10,0.55)" }} />

      {/* Intro — surah name */}
      <Sequence from={0} durationInFrames={60}>
        <Intro surahName={data.surahName} surahNameEnglish={data.surahNameEnglish} palette={data.palette} />
      </Sequence>

      {/* Ayah sequences */}
      {(() => {
        let cursor = 60;
        return data.ayahs.map((ayah) => {
          const from = cursor;
          cursor += ayah.durationFrames;
          return (
            <Sequence key={ayah.number} from={from} durationInFrames={ayah.durationFrames}>
              <AyahScene ayah={ayah} palette={data.palette} />
            </Sequence>
          );
        });
      })()}

      {/* Outro — final illuminated beat */}
      <Sequence from={durationInFrames - 60} durationInFrames={60}>
        <Outro ayahs={data.ayahs} palette={data.palette} />
      </Sequence>

      {/* Audio */}
      <Audio src={data.audioUrl} />
    </AbsoluteFill>
  );
}

function Intro({ surahName, surahNameEnglish, palette }: { surahName: string; surahNameEnglish: string; palette: string[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 12, 48, 60], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 24], [30, 0], { extrapolateRight: "clamp" });
  const sp = spring({ frame: frame - 6, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30, opacity: op, transform: `translateY(${y}px)` }}>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 56,
          letterSpacing: 8,
          color: palette[2],
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        SŪRAH
      </div>
      <div
        className="arabic"
        style={{
          fontFamily: "'Amiri Quran', 'Amiri', serif",
          fontSize: 180,
          color: "#f8e4b8",
          textShadow: `0 0 30px ${palette[2]}66, 0 4px 12px rgba(0,0,0,0.4)`,
          transform: `scale(${0.92 + sp * 0.08})`,
          direction: "rtl",
        }}
      >
        {surahName}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 64,
          fontStyle: "italic",
          color: "#f5e8c8",
          opacity: 0.9,
        }}
      >
        {surahNameEnglish}
      </div>
    </AbsoluteFill>
  );
}

function AyahScene({ ayah, palette }: { ayah: AyahData; palette: string[] }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene-local fades
  const enter = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const exit = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const op = Math.min(enter, exit);

  // Word-by-word reveal: sync to audio beat by splitting duration across words
  const words = ayah.arabic.split(/\s+/).filter(Boolean);
  const wordDuration = (durationInFrames - 60) / Math.max(words.length, 1);

  const transWords = ayah.translation.split(/\s+/);
  const transOp = interpolate(frame, [durationInFrames * 0.35, durationInFrames * 0.55], [0, 1], { extrapolateRight: "clamp" });
  const transY = interpolate(frame, [durationInFrames * 0.35, durationInFrames * 0.55], [20, 0], { extrapolateRight: "clamp" });

  // Background parallax (slow drift)
  const drift = Math.sin((frame / fps) * 0.3) * 14;

  return (
    <AbsoluteFill style={{ opacity: op }}>
      {/* Per-ayah AI background */}
      {ayah.backgroundUrl && (
        <AbsoluteFill style={{ transform: `translate(${drift}px, ${-drift * 0.5}px) scale(1.06)`, opacity: 0.85 }}>
          <Img src={ayah.backgroundUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 30%, rgba(20,12,6,0.55) 100%)" }} />
        </AbsoluteFill>
      )}

      {/* Top ornament + ayah number */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
        <div style={{ height: 1, width: 180, background: `linear-gradient(90deg, transparent, ${palette[2]}, transparent)` }} />
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 36,
            color: palette[2],
            border: `1px solid ${palette[2]}aa`,
            borderRadius: 999,
            padding: "10px 24px",
            letterSpacing: 4,
            background: "rgba(20,12,6,0.4)",
            backdropFilter: "blur(4px)",
          }}
        >
          {ayah.number}
        </div>
        <div style={{ height: 1, width: 180, background: `linear-gradient(90deg, transparent, ${palette[2]}, transparent)` }} />
      </div>

      {/* Arabic verse — word-by-word reveal */}
      <div
        className="arabic"
        style={{
          position: "absolute",
          top: "32%",
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily: "'Amiri Quran', 'Amiri', serif",
          fontSize: 78,
          lineHeight: 1.9,
          color: "#f8e4b8",
          direction: "rtl",
          textShadow: "0 4px 18px rgba(0,0,0,0.55), 0 0 1px rgba(120,40,20,0.6)",
        }}
      >
        {words.map((w, i) => {
          const start = i * wordDuration;
          const wordEnter = interpolate(frame, [start, start + wordDuration * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const wordY = interpolate(wordEnter, [0, 1], [12, 0]);
          // current word halo
          const cur = frame >= start && frame < start + wordDuration;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: "0 14px",
                opacity: wordEnter,
                transform: `translateY(${wordY}px)`,
                color: cur ? "#fff5d8" : "#f8e4b8",
                textShadow: cur
                  ? `0 0 24px ${palette[2]}aa, 0 0 8px #ffd47a, 0 4px 18px rgba(0,0,0,0.6)`
                  : "0 4px 18px rgba(0,0,0,0.55)",
                transition: "none",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* English translation */}
      <div
        style={{
          position: "absolute",
          bottom: 220,
          left: 100,
          right: 100,
          textAlign: "center",
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 38,
          lineHeight: 1.5,
          color: "#f5e8c8",
          opacity: transOp,
          transform: `translateY(${transY}px)`,
          fontStyle: "italic",
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
        }}
      >
        {transWords.join(" ")}
      </div>

      {/* Bottom flourish */}
      <div style={{ position: "absolute", bottom: 100, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: palette[2] }} />
        <span style={{ width: 60, height: 1, background: palette[2], alignSelf: "center" }} />
        <span style={{ width: 8, height: 8, borderRadius: 999, background: palette[2] }} />
        <span style={{ width: 60, height: 1, background: palette[2], alignSelf: "center" }} />
        <span style={{ width: 6, height: 6, borderRadius: 999, background: palette[2] }} />
      </div>
    </AbsoluteFill>
  );
}

function Outro({ ayahs, palette }: { ayahs: AyahData[]; palette: string[] }) {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 18, 50, 60], [0, 1, 1, 0.4], { extrapolateRight: "clamp" });
  const lastAyah = ayahs[ayahs.length - 1];
  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40, opacity: op, padding: 100 }}>
      <div
        className="arabic"
        style={{ fontFamily: "'Amiri Quran', serif", fontSize: 80, color: "#f8e4b8", direction: "rtl", textAlign: "center", lineHeight: 1.8, textShadow: `0 0 40px ${palette[2]}55` }}
      >
        ﷽
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: palette[2], letterSpacing: 6, textTransform: "uppercase" }}>
        Ayah {lastAyah?.number}
      </div>
    </AbsoluteFill>
  );
}
