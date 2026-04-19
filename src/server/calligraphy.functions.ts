/**
 * Server-side Arabic-text → SVG paths via opentype.js + Amiri Quran TTF.
 *
 * Returns per-word SVG path data with per-glyph offset metadata so the
 * Remotion renderer can stroke-animate each word with strokeDasharray /
 * strokeDashoffset, synced to the recited word's frame window.
 *
 * Honest caveat: opentype.js Arabic shaping (GSUB/GPOS) is partial. For most
 * Quranic text in Amiri Quran it produces excellent results; rare ligatures
 * may have minor join imperfections. v1 ships this; v2 can swap to harfbuzzjs.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import opentype from "opentype.js";
import { promises as fs } from "fs";
import path from "path";

type ShapedWord = {
  /** Combined SVG path data for the word */
  pathD: string;
  /** Approximate path length (used to set strokeDasharray) */
  approxLength: number;
  /** Width in font units */
  width: number;
  /** The actual Arabic word text */
  text: string;
  /** Number of glyphs in this word */
  glyphCount: number;
  /** Optional precomputed start frame (from Gemini alignment) */
  startFrame?: number;
  /** Optional precomputed end frame (from Gemini alignment) */
  endFrame?: number;
};

export type ShapedAyah = {
  ayahNumber: number;
  /** Shaped words in visual right-to-left order */
  words: ShapedWord[];
  /** Total width of the rendered ayah in font units */
  totalWidth: number;
  /** Font ascender — for vertical positioning */
  ascender: number;
  /** Font descender */
  descender: number;
  /** Font units-per-em for scaling */
  unitsPerEm: number;
};

let cachedFont: opentype.Font | null = null;

async function loadFont(): Promise<opentype.Font> {
  if (cachedFont) return cachedFont;
  let buf: Uint8Array | null = null;

  // 1) Local dev / Node SSR: read from public/ via fs
  const candidates = [
    path.resolve(process.cwd(), "public/fonts/AmiriQuran-Regular.ttf"),
    path.resolve("./public/fonts/AmiriQuran-Regular.ttf"),
  ];
  for (const p of candidates) {
    try {
      const file = await fs.readFile(p);
      buf = file;
      break;
    } catch {
      // try next
    }
  }

  // 2) Worker production: fetch from same-origin /fonts/
  if (!buf) {
    try {
      const host = getRequestHost();
      if (host) {
        const proto = host.includes("localhost") ? "http" : "https";
        const res = await fetch(`${proto}://${host}/fonts/AmiriQuran-Regular.ttf`);
        if (res.ok) buf = new Uint8Array(await res.arrayBuffer());
      }
    } catch {
      // fall through
    }
  }

  // 3) Last-resort CDN fallback
  if (!buf) {
    const res = await fetch("https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiriquran/AmiriQuran-Regular.ttf");
    if (!res.ok) throw new Error(`Could not load Amiri Quran font: ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
  }

  // opentype.parse expects an ArrayBuffer
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  cachedFont = opentype.parse(ab);
  return cachedFont;
}

/** Approximate path length by sampling — opentype paths don't expose totalLength. */
function approxPathLength(commands: opentype.PathCommand[]): number {
  let length = 0;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        cx = cmd.x; cy = cmd.y; sx = cx; sy = cy;
        break;
      case "L":
        length += Math.hypot(cmd.x - cx, cmd.y - cy);
        cx = cmd.x; cy = cmd.y;
        break;
      case "C": {
        // approximate cubic by chord + control hull average
        const chord = Math.hypot(cmd.x - cx, cmd.y - cy);
        const hull =
          Math.hypot(cmd.x1 - cx, cmd.y1 - cy) +
          Math.hypot(cmd.x2 - cmd.x1, cmd.y2 - cmd.y1) +
          Math.hypot(cmd.x - cmd.x2, cmd.y - cmd.y2);
        length += (chord + hull) / 2;
        cx = cmd.x; cy = cmd.y;
        break;
      }
      case "Q": {
        const chord = Math.hypot(cmd.x - cx, cmd.y - cy);
        const hull = Math.hypot(cmd.x1 - cx, cmd.y1 - cy) + Math.hypot(cmd.x - cmd.x1, cmd.y - cmd.y1);
        length += (chord + hull) / 2;
        cx = cmd.x; cy = cmd.y;
        break;
      }
      case "Z":
        length += Math.hypot(sx - cx, sy - cy);
        cx = sx; cy = sy;
        break;
    }
  }
  return length;
}

export const shapeAyahs = createServerFn({ method: "POST" })
  .inputValidator((input: { ayahs: Array<{ number: number; arabic: string }> }) => input)
  .handler(async ({ data }): Promise<{ shaped: ShapedAyah[] }> => {
    const font = await loadFont();
    const fontSize = 100; // arbitrary; renderer scales via viewBox

    const shaped: ShapedAyah[] = data.ayahs.map((a) => {
      // Split into words. Arabic logical order (RTL handled by browser/SVG).
      const words = a.arabic.trim().split(/\s+/).filter(Boolean);

      const shapedWords: ShapedWord[] = words.map((wordText) => {
        // opentype.getPath shapes the text using GSUB tables (Arabic forms).
        const wordPath = font.getPath(wordText, 0, 0, fontSize, {
          features: { liga: true, rlig: true, calt: true } as never,
        });
        const commands = wordPath.commands;
        const pathD = wordPath.toPathData(2);
        const approxLength = approxPathLength(commands);

        // Width via advanceWidth sum (post-shaping)
        // opentype.Font.getAdvanceWidth shapes too.
        const width = font.getAdvanceWidth(wordText, fontSize, {
          features: { liga: true, rlig: true, calt: true } as never,
        });

        return {
          pathD,
          approxLength: Math.round(approxLength),
          width: Math.round(width),
          text: wordText,
          glyphCount: wordPath.commands.filter((c) => c.type === "M").length,
        };
      });

      const totalWidth = shapedWords.reduce((s, w) => s + w.width, 0);

      return {
        ayahNumber: a.number,
        words: shapedWords,
        totalWidth: Math.round(totalWidth),
        ascender: font.ascender,
        descender: font.descender,
        unitsPerEm: font.unitsPerEm,
      };
    });

    return { shaped };
  });
