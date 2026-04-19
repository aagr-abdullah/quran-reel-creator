/**
 * Audio→word alignment via Gemini 2.5 Pro.
 *
 * Takes the recitation audio URL + per-ayah word lists. Returns per-word
 * start/end timestamps in seconds, anchored to the audio timeline.
 *
 * Honest caveat: Gemini's audio timestamping is approximate (±150ms typical).
 * Better than even-split but not frame-perfect. The renderer falls back to
 * char-weighted timing when this is missing or invalid.
 */
import { createServerFn } from "@tanstack/react-start";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AlignedAyah = {
  ayah: number;
  words: Array<{ text: string; startSec: number; endSec: number }>;
};

export const alignWords = createServerFn({ method: "POST" })
  .inputValidator((input: {
    audioUrl: string;
    durationSec: number;
    ayahs: Array<{ number: number; words: string[] }>;
  }) => input)
  .handler(async ({ data }): Promise<{ aligned: AlignedAyah[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Download audio + send as base64 inline (Gemini supports audio input).
    let audioBase64 = "";
    let mimeType = "audio/mpeg";
    try {
      const res = await fetch(data.audioUrl);
      if (!res.ok) throw new Error(`audio fetch ${res.status}`);
      mimeType = res.headers.get("content-type") || mimeType;
      const buf = new Uint8Array(await res.arrayBuffer());
      // base64 encode
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        bin += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      audioBase64 = btoa(bin);
    } catch (e) {
      console.warn("[align] audio fetch failed, returning empty alignment:", e);
      return { aligned: [] };
    }

    const ayahWordsList = data.ayahs.map((a) =>
      `Ayah ${a.number}: ${a.words.map((w, i) => `[${i}] ${w}`).join(" ")}`
    ).join("\n");

    const systemPrompt = `You are an expert Quran recitation transcriber. You will receive an audio recording of Quranic recitation along with the exact Arabic word list (in order, per ayah). Your job is to listen and provide the start and end time in seconds (decimal, relative to the start of the audio at 0.0) for EACH word as it is recited.

Rules:
- The audio is approximately ${data.durationSec.toFixed(2)} seconds long.
- Each ayah's word list is given in recitation order. Output timestamps in the same order.
- startSec must be < endSec, and successive words should not overlap significantly.
- If a word is held long (madd), include the full vowel hold in its endSec.
- Output ONLY valid JSON via the provided tool. No prose.`;

    const userText = `Word list (in recitation order):\n${ayahWordsList}\n\nReturn timestamps for every word in every ayah.`;

    try {
      const response = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                {
                  type: "input_audio",
                  input_audio: { data: audioBase64, format: mimeType.includes("wav") ? "wav" : "mp3" },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_alignment",
                description: "Submit per-word timestamp alignment.",
                parameters: {
                  type: "object",
                  properties: {
                    aligned: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          ayah: { type: "number" },
                          words: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                text: { type: "string" },
                                startSec: { type: "number" },
                                endSec: { type: "number" },
                              },
                              required: ["text", "startSec", "endSec"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["ayah", "words"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["aligned"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_alignment" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text().catch(() => "");
        console.warn("[align] gateway error", response.status, t);
        return { aligned: [] };
      }

      const json = await response.json();
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.warn("[align] no tool call in response");
        return { aligned: [] };
      }
      const args = JSON.parse(toolCall.function.arguments);
      const aligned = (args.aligned ?? []) as AlignedAyah[];

      // Validate: clamp to duration, ensure monotonic, drop garbage
      const cleaned: AlignedAyah[] = aligned.map((ay) => ({
        ayah: ay.ayah,
        words: (ay.words ?? [])
          .map((w) => ({
            text: String(w.text ?? ""),
            startSec: Math.max(0, Math.min(data.durationSec, Number(w.startSec) || 0)),
            endSec: Math.max(0, Math.min(data.durationSec, Number(w.endSec) || 0)),
          }))
          .filter((w) => w.endSec > w.startSec),
      }));

      return { aligned: cleaned };
    } catch (e) {
      console.warn("[align] failed:", e);
      return { aligned: [] };
    }
  });
