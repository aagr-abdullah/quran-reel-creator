import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadAudio } from "@/server/upload.functions";
import { detectVerses, fetchVerses, type AyahPayload } from "@/server/detect.functions";
import { detectMaqam, analyzeVerseMeaning } from "@/server/maqam.functions";
import { directReel } from "@/server/director.functions";
import { shapeAyahs } from "@/server/calligraphy.functions";
import { alignWords } from "@/server/align.functions";
import { generateSubstrate, generateAyahBackground } from "@/server/assets.functions";
import { renderReel as renderReelFn, getRenderProgress } from "@/server/render.functions";
import { SURAHS, getSurah } from "@/lib/surahs";
import type { CreativeBrief, ArchetypeId } from "@/lib/brief";
import { Player, type PlayerRef } from "@remotion/player";
import { QuranReel, REEL_FPS, REEL_W, REEL_H, totalDurationFrames, type AyahData, type ReelData, type ShapedAyahData } from "@/remotion/QuranReel";
import { BriefPreview } from "@/components/BriefPreview";
import { toast } from "sonner";
import { Upload, Loader2, Wand2, Mic2, Sparkles, Check, Play, Download, Film } from "lucide-react";
import { Toaster } from "sonner";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Quran Reel Studio" },
      { name: "description", content: "Upload your recitation and generate a beautiful 9:16 reel directed by AI." },
    ],
  }),
  component: StudioPage,
});

type Phase = "idle" | "uploaded" | "detecting" | "detected" | "fetching" | "ready" | "analyzing" | "directing" | "generating" | "preview" | "rendering" | "rendered";

interface DetectCandidate { surah: number; ayahStart: number; ayahEnd: number; confidence: number; }

const AVOID_KEY = "quran_reel_recent_archetypes";
function getAvoidArchetypes(): ArchetypeId[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(AVOID_KEY) ?? "[]"); } catch { return []; }
}
function pushAvoidArchetype(a: ArchetypeId) {
  if (typeof window === "undefined") return;
  const existing = getAvoidArchetypes().filter((x) => x !== a);
  const next = [a, ...existing].slice(0, 3);
  localStorage.setItem(AVOID_KEY, JSON.stringify(next));
}

function StudioPage() {
  const upload = useServerFn(uploadAudio);
  const detect = useServerFn(detectVerses);
  const fetchVs = useServerFn(fetchVerses);
  const maqamFn = useServerFn(detectMaqam);
  const analyzeFn = useServerFn(analyzeVerseMeaning);
  const directFn = useServerFn(directReel);
  const shapeFn = useServerFn(shapeAyahs);
  const alignFn = useServerFn(alignWords);
  const substrateFn = useServerFn(generateSubstrate);
  const bgFn = useServerFn(generateAyahBackground);
  const renderFn = useServerFn(renderReelFn);
  const progressFn = useServerFn(getRenderProgress);

  const [phase, setPhase] = useState<Phase>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [reelId, setReelId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DetectCandidate[]>([]);
  const [chosenSurah, setChosenSurah] = useState<number>(1);
  const [chosenStart, setChosenStart] = useState<number>(1);
  const [chosenEnd, setChosenEnd] = useState<number>(1);
  const [verses, setVerses] = useState<AyahPayload[]>([]);
  const [maqam, setMaqam] = useState<{ maqam: string; mood: string; palette: string[]; description: string; intensity: number } | null>(null);
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [meaningCache, setMeaningCache] = useState<Array<{ ayah: number; mood: string; imagery: string; concept: string; intensity: number; colorHint: string }>>([]);
  const [substrateUrl, setSubstrateUrl] = useState<string | null>(null);
  const [shapedByNum, setShapedByNum] = useState<Record<number, ShapedAyahData>>({});
  const [bgByNum, setBgByNum] = useState<Record<number, string>>({});
  const [progress, setProgress] = useState<string>("");
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const playerRef = useRef<PlayerRef>(null);

  const reelData: ReelData | null = useMemo(() => {
    if (verses.length === 0 || !audioUrl || !audioDuration || !brief) return null;
    const surahMeta = getSurah(chosenSurah);
    const totalChars = verses.reduce((s, v) => s + Math.max(1, v.arabic.length), 0);
    const totalAyahFrames = Math.max(60, Math.round(audioDuration * REEL_FPS));
    const ayahs: AyahData[] = verses.map((v) => {
      const frames = Math.max(45, Math.round((v.arabic.length / totalChars) * totalAyahFrames));
      return {
        number: v.numberInSurah,
        arabic: v.arabic,
        translation: v.translation,
        durationFrames: frames,
        backgroundUrl: bgByNum[v.numberInSurah],
        shaped: shapedByNum[v.numberInSurah],
      };
    });
    return {
      audioUrl,
      substrateUrl: substrateUrl ?? undefined,
      brief,
      surahName: surahMeta?.nameArabic ?? "",
      surahNameEnglish: surahMeta?.nameEnglish ?? "",
      ayahStart: chosenStart,
      ayahEnd: chosenEnd,
      ayahs,
    };
  }, [verses, audioUrl, audioDuration, brief, substrateUrl, shapedByNum, bgByNum, chosenSurah, chosenStart, chosenEnd]);

  const totalFrames = useMemo(() => (reelData ? totalDurationFrames(reelData.ayahs) : 60 * REEL_FPS), [reelData]);

  const onFile = useCallback(async (file: File) => {
    setPhase("uploaded");
    setProgress("Uploading recitation…");
    try {
      const localUrl = URL.createObjectURL(file);
      const a = new Audio(localUrl);
      await new Promise<void>((res, rej) => { a.onloadedmetadata = () => res(); a.onerror = () => rej(new Error("Cannot read audio")); });
      setAudioDuration(a.duration);

      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      const { reelId: rid, audioUrl: audUrl } = await upload({ data: { base64, filename: file.name, contentType: file.type || "audio/wav" } });
      setReelId(rid);
      setAudioUrl(audUrl);
      setProgress("");
      toast.success("Recitation uploaded");

      setPhase("detecting");
      setProgress("Listening to your recitation, identifying the verses…");
      const det = await detect({ data: { audioUrl: audUrl, reelId: rid } });
      setTranscription(det.transcription);
      setCandidates(det.candidates);
      if (det.candidates.length > 0) {
        const top = det.candidates[0];
        setChosenSurah(top.surah);
        setChosenStart(top.ayahStart);
        setChosenEnd(top.ayahEnd);
      }
      setPhase("detected");
      setProgress("");
      toast.success(`Top match: ${det.candidates[0]?.confidence ?? 0}% confident`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setPhase("idle");
      setProgress("");
    }
  }, [upload, detect]);

  const onConfirm = useCallback(async () => {
    if (!reelId || !audioUrl) return;
    setPhase("fetching");
    setProgress("Fetching the Arabic and Khattab translation…");
    try {
      const { ayahs } = await fetchVs({ data: { surah: chosenSurah, ayahStart: chosenStart, ayahEnd: chosenEnd } });
      setVerses(ayahs);
      setPhase("ready");
      setProgress("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not fetch verses");
      setPhase("detected");
      setProgress("");
    }
  }, [reelId, audioUrl, fetchVs, chosenSurah, chosenStart, chosenEnd]);

  const onGenerate = useCallback(async () => {
    if (!reelId || !audioUrl || verses.length === 0 || !audioDuration) return;
    try {
      setPhase("analyzing");
      setProgress("Listening for the maqam of your voice…");
      const m = await maqamFn({ data: { audioUrl, reelId } });
      setMaqam(m);
      toast.success(`Detected maqam: ${m.maqam} — ${m.mood}`);

      setProgress("Reading the meaning of each ayah…");
      const meaningRes = await analyzeFn({
        data: { reelId, ayahs: verses.map((v) => ({ number: v.numberInSurah, arabic: v.arabic, translation: v.translation })) },
      });
      setMeaningCache(meaningRes.meanings);
      const meaningMap = new Map(meaningRes.meanings.map((mm) => [mm.ayah, mm]));

      setProgress("Shaping calligraphy strokes…");
      const shapeRes = await shapeFn({ data: { ayahs: verses.map((v) => ({ number: v.numberInSurah, arabic: v.arabic })) } });
      const shapedMap: Record<number, ShapedAyahData> = {};
      for (const s of shapeRes.shaped) shapedMap[s.ayahNumber] = s;

      // Word-level audio alignment (Gemini). Best-effort — falls back to char-weighted.
      setProgress("Aligning each word to your voice…");
      try {
        const alignRes = await alignFn({
          data: {
            audioUrl,
            durationSec: audioDuration,
            ayahs: shapeRes.shaped.map((s) => ({ number: s.ayahNumber, words: s.words.map((w) => w.text) })),
          },
        });
        // Total scene duration in frames per ayah (proportional to char count, mirrors reelData logic)
        const totalChars = verses.reduce((s, v) => s + Math.max(1, v.arabic.length), 0);
        const totalAyahFrames = Math.max(60, Math.round(audioDuration * REEL_FPS));
        // Build cumulative ayah start times in seconds (mirroring frame allocation)
        let cumSec = 0;
        const ayahStartSec = new Map<number, number>();
        const ayahDurSec = new Map<number, number>();
        for (const v of verses) {
          const frames = Math.max(45, Math.round((v.arabic.length / totalChars) * totalAyahFrames));
          const sec = frames / REEL_FPS;
          ayahStartSec.set(v.numberInSurah, cumSec);
          ayahDurSec.set(v.numberInSurah, sec);
          cumSec += sec;
        }
        for (const ay of alignRes.aligned) {
          const target = shapedMap[ay.ayah];
          if (!target) continue;
          const sceneStart = ayahStartSec.get(ay.ayah) ?? 0;
          const sceneDurFrames = Math.round((ayahDurSec.get(ay.ayah) ?? 0) * REEL_FPS);
          // Match aligned words to shaped words by index (both in recitation order)
          const next = target.words.map((w, i) => {
            const m = ay.words[i];
            if (!m) return w;
            const startFrame = Math.max(0, Math.round((m.startSec - sceneStart) * REEL_FPS));
            const endFrame = Math.max(startFrame + 6, Math.round((m.endSec - sceneStart) * REEL_FPS));
            return {
              ...w,
              startFrame: Math.min(startFrame, sceneDurFrames - 6),
              endFrame: Math.min(endFrame, sceneDurFrames),
            };
          });
          shapedMap[ay.ayah] = { ...target, words: next };
        }
      } catch (e) {
        console.warn("[align] skipped:", e);
      }
      setShapedByNum(shapedMap);

      setPhase("directing");
      setProgress("AI Art Director is composing the brief…");
      const surahMeta = getSurah(chosenSurah);
      const { brief: directorBrief } = await directFn({
        data: {
          reelId,
          surahName: surahMeta?.nameArabic ?? "",
          surahNameEnglish: surahMeta?.nameEnglish ?? "",
          maqam: m.maqam,
          maqamMood: m.mood,
          intensity: m.intensity,
          durationSec: audioDuration,
          ayahs: verses.map((v) => {
            const mm = meaningMap.get(v.numberInSurah);
            return {
              number: v.numberInSurah,
              arabic: v.arabic,
              translation: v.translation,
              meaning: mm ? { mood: mm.mood, imagery: mm.imagery, concept: mm.concept, colorHint: mm.colorHint } : undefined,
            };
          }),
          avoidArchetypes: getAvoidArchetypes(),
        },
      });
      setBrief(directorBrief);
      pushAvoidArchetype(directorBrief.archetype);
      toast.success(`Direction: ${directorBrief.archetype.replace(/-/g, " ")}`);

      setPhase("generating");
      const palHints = `${directorBrief.palette.shadow}, ${directorBrief.palette.base}, ${directorBrief.palette.mid}, ${directorBrief.palette.light}, ${directorBrief.palette.accent}`;
      setProgress(`Painting substrate plate…`);
      const sub = await substrateFn({ data: { reelId, substratePrompt: directorBrief.substratePrompt, paletteHints: palHints } });
      setSubstrateUrl(sub.url);

      const updates: Record<number, string> = {};
      for (let i = 0; i < verses.length; i++) {
        const v = verses[i];
        const dir = directorBrief.ayahDirections.find((d) => d.ayah === v.numberInSurah);
        if (!dir) continue;
        setProgress(`Painting ayah ${v.numberInSurah} — ${dir.mood}…`);
        try {
          const r = await bgFn({
            data: {
              reelId, ayahNumber: v.numberInSurah,
              imagePrompt: dir.imagePrompt,
              paletteHints: palHints,
              colorGrade: dir.colorGrade,
            },
          });
          updates[v.numberInSurah] = r.url;
          setBgByNum((prev) => ({ ...prev, [v.numberInSurah]: r.url }));
        } catch (e) {
          console.error(`Ayah ${v.numberInSurah} bg failed:`, e);
        }
      }

      setPhase("preview");
      setProgress("");
      toast.success("Your reel is ready to preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
      setPhase("ready");
      setProgress("");
    }
  }, [reelId, audioUrl, audioDuration, verses, chosenSurah, maqamFn, analyzeFn, shapeFn, alignFn, directFn, substrateFn, bgFn]);

  const onRedirect = useCallback(async () => {
    if (!reelId || !maqam || verses.length === 0 || !audioDuration) return;
    setRedirecting(true);
    try {
      const meaningMap = new Map(meaningCache.map((mm) => [mm.ayah, mm]));
      const surahMeta = getSurah(chosenSurah);
      const { brief: newBrief } = await directFn({
        data: {
          reelId,
          surahName: surahMeta?.nameArabic ?? "",
          surahNameEnglish: surahMeta?.nameEnglish ?? "",
          maqam: maqam.maqam,
          maqamMood: maqam.mood,
          intensity: maqam.intensity,
          durationSec: audioDuration,
          ayahs: verses.map((v) => {
            const mm = meaningMap.get(v.numberInSurah);
            return {
              number: v.numberInSurah,
              arabic: v.arabic,
              translation: v.translation,
              meaning: mm ? { mood: mm.mood, imagery: mm.imagery, concept: mm.concept, colorHint: mm.colorHint } : undefined,
            };
          }),
          avoidArchetypes: getAvoidArchetypes(),
          seed: Date.now(),
        },
      });
      setBrief(newBrief);
      pushAvoidArchetype(newBrief.archetype);
      toast.success(`New direction: ${newBrief.archetype.replace(/-/g, " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-direct failed");
    } finally {
      setRedirecting(false);
    }
  }, [reelId, maqam, verses, audioDuration, chosenSurah, meaningCache, directFn]);

  const onRender = useCallback(async () => {
    if (!reelId || !reelData) return;
    setPhase("rendering");
    setRenderProgress(0);
    setRenderError(null);
    setVideoUrl(null);
    try {
      const { renderId, bucketName } = await renderFn({ data: { reelId, data: reelData } });
      toast.message("Render queued on Lambda…", { description: "This usually takes 30–90s." });
      const start = Date.now();
      const timeoutMs = 10 * 60 * 1000;
      while (true) {
        if (Date.now() - start > timeoutMs) throw new Error("Render timed out");
        await new Promise((r) => setTimeout(r, 2000));
        const p = await progressFn({ data: { reelId, renderId, bucketName } });
        setRenderProgress(p.progress);
        if (p.error) { setRenderError(p.error); throw new Error(p.error); }
        if (p.done && p.videoUrl) {
          setVideoUrl(p.videoUrl);
          setPhase("rendered");
          toast.success("Reel rendered — your MP4 is ready");
          return;
        }
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Render failed";
      setRenderError(msg);
      toast.error(msg);
      setPhase("preview");
    }
  }, [reelId, reelData, renderFn, progressFn]);

  const surahMeta = getSurah(chosenSurah);

  return (
    <Layout>
      <Toaster position="top-center" richColors />
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <header>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-reed">Studio</p>
            <h1 className="font-display text-4xl text-foreground">Build your reel</h1>
            <p className="mt-2 text-ink-soft">An AI Art Director composes a unique film for each recitation.</p>
          </header>

          <Card step={1} title="Upload recitation" done={!!audioUrl}>
            <DropZone onFile={onFile} disabled={phase !== "idle" && phase !== "uploaded"} />
            {audioUrl && (
              <div className="mt-4 rounded-lg border border-border/60 bg-parchment/60 p-3">
                <audio controls src={audioUrl} className="w-full" />
                {audioDuration && <p className="mt-2 text-xs text-muted-foreground">Duration: {audioDuration.toFixed(1)}s</p>}
              </div>
            )}
          </Card>

          {phase !== "idle" && (
            <Card step={2} title="Confirm verses" done={["ready","analyzing","directing","generating","preview","rendering","rendered"].includes(phase)}>
              {phase === "detecting" && <Loading text={progress} />}
              {transcription && (
                <details className="mb-4 rounded-lg border border-border/40 bg-parchment-deep/30 p-3 text-sm">
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-muted-foreground">Show transcription</summary>
                  <p className="arabic mt-3 text-right text-lg leading-loose text-ink" style={{ direction: "rtl" }}>{transcription}</p>
                </details>
              )}
              {candidates.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top matches</p>
                  {candidates.map((c, i) => {
                    const sm = getSurah(c.surah);
                    const isSel = chosenSurah === c.surah && chosenStart === c.ayahStart && chosenEnd === c.ayahEnd;
                    return (
                      <button key={i}
                        onClick={() => { setChosenSurah(c.surah); setChosenStart(c.ayahStart); setChosenEnd(c.ayahEnd); }}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${isSel ? "border-reed bg-reed/5" : "border-border/60 bg-parchment-deep/30 hover:bg-parchment-deep/60"}`}>
                        <div>
                          <div className="font-display text-base text-foreground">{sm?.nameEnglish} ({sm?.nameTranslation})</div>
                          <div className="text-sm text-ink-soft">Ayah {c.ayahStart}–{c.ayahEnd}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl reed-ink">{c.confidence}%</div>
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">confident</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="rounded-lg border border-border/40 bg-card/60 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Or set manually</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Surah">
                    <select value={chosenSurah}
                      onChange={(e) => { const s = +e.target.value; setChosenSurah(s); setChosenStart(1); setChosenEnd(Math.min(getSurah(s)?.ayahCount ?? 1, 5)); }}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      {SURAHS.map((s) => (<option key={s.number} value={s.number}>{s.number}. {s.nameEnglish}</option>))}
                    </select>
                  </Field>
                  <Field label="From ayah">
                    <input type="number" min={1} max={surahMeta?.ayahCount ?? 1} value={chosenStart}
                      onChange={(e) => setChosenStart(Math.max(1, Math.min(surahMeta?.ayahCount ?? 1, +e.target.value)))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </Field>
                  <Field label="To ayah">
                    <input type="number" min={chosenStart} max={surahMeta?.ayahCount ?? 1} value={chosenEnd}
                      onChange={(e) => setChosenEnd(Math.max(chosenStart, Math.min(surahMeta?.ayahCount ?? 1, +e.target.value)))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </Field>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Surah {surahMeta?.nameEnglish} has {surahMeta?.ayahCount} ayahs.</p>
              </div>
              {phase === "fetching" && <Loading text={progress} />}
              {(phase === "detected" || phase === "ready") && (
                <Button onClick={onConfirm} className="mt-5 illuminated h-11 rounded-full px-6">
                  <Check className="mr-1 h-4 w-4" /> Confirm verses
                </Button>
              )}
              {verses.length > 0 && phase !== "fetching" && (
                <div className="mt-5 space-y-3 rounded-lg border border-gold/20 bg-parchment/40 p-4">
                  {verses.map((v) => (
                    <div key={v.numberInSurah} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                      <p className="arabic text-right text-2xl leading-loose text-foreground" style={{ direction: "rtl" }}>{v.arabic}</p>
                      <p className="mt-1 text-sm italic text-ink-soft">{v.translation}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {phase === "ready" && (
            <Card step={3} title="Direct & generate">
              <p className="mb-4 text-sm text-ink-soft">
                The AI Art Director will compose a unique creative brief for THIS recitation — palette, typography, camera, atmosphere, per-ayah direction. Then it paints the backgrounds and shapes the calligraphy strokes.
              </p>
              <Button onClick={onGenerate} className="illuminated h-12 rounded-full px-7 text-base">
                <Wand2 className="mr-1 h-4 w-4" /> Direct & generate
              </Button>
            </Card>
          )}

          {(phase === "analyzing" || phase === "directing" || phase === "generating") && (
            <Card step={3} title="Composing">
              <Loading text={progress || "Working…"} />
              {Object.keys(bgByNum).length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{Object.keys(bgByNum).length} of {verses.length} ayahs painted</p>
              )}
            </Card>
          )}

          {(phase === "preview" || phase === "rendering" || phase === "rendered") && brief && (
            <>
              <BriefPreview brief={brief} onRedirect={onRedirect} redirecting={redirecting} />

              <Card step={4} title="Render your MP4">
                {maqam && (
                  <div className="mb-4 rounded-lg border border-gold/30 bg-parchment-deep/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Detected maqam</p>
                        <p className="font-display text-2xl text-foreground">{maqam.maqam}</p>
                        <p className="text-sm italic text-ink-soft">{maqam.mood} · intensity {maqam.intensity}/10</p>
                      </div>
                    </div>
                  </div>
                )}

                {phase === "preview" && (
                  <>
                    <Button onClick={onRender} className="illuminated h-12 w-full rounded-full px-7 text-base">
                      <Film className="mr-1 h-4 w-4" /> Render MP4 (1080×1920)
                    </Button>
                    <p className="mt-3 text-center text-xs text-muted-foreground">Renders frame-perfect on Remotion Lambda. Usually 30–90s.</p>
                  </>
                )}

                {phase === "rendering" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-parchment-deep/30 px-4 py-3 text-sm text-ink-soft">
                      <Loader2 className="h-4 w-4 animate-spin text-reed" />
                      <span>Rendering on Lambda… {Math.round(renderProgress * 100)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-parchment-deep/60">
                      <div className="h-full bg-gradient-to-r from-reed to-gold" style={{ width: `${renderProgress * 100}%` }} />
                    </div>
                  </div>
                )}

                {phase === "rendered" && videoUrl && (
                  <div className="space-y-4">
                    <video src={videoUrl} controls className="w-full rounded-lg border border-gold/30" />
                    <a href={videoUrl} download={`quran-reel-${reelId}.mp4`}
                      className="illuminated flex h-12 w-full items-center justify-center gap-2 rounded-full px-7 text-base font-medium">
                      <Download className="h-4 w-4" /> Download MP4
                    </a>
                    <Button variant="ghost" onClick={() => { setPhase("preview"); setVideoUrl(null); setRenderProgress(0); }} className="w-full">
                      Render again
                    </Button>
                  </div>
                )}

                {renderError && phase !== "rendering" && (
                  <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{renderError}</p>
                )}
              </Card>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-reed">
            <Play className="h-3 w-3" /> Live preview
          </div>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-3xl border border-gold/30 bg-[#1a100a] shadow-illuminated">
            {reelData ? (
              <Player ref={playerRef} component={QuranReel} inputProps={{ data: reelData }}
                durationInFrames={totalFrames} fps={REEL_FPS} compositionWidth={REEL_W} compositionHeight={REEL_H}
                style={{ width: "100%", height: "100%" }} controls loop clickToPlay />
            ) : (
              <PreviewPlaceholder phase={phase} progress={progress} />
            )}
          </div>
          {reelData && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              1080×1920 · {(totalFrames / REEL_FPS).toFixed(1)}s · {verses.length} ayah{verses.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Card({ step, title, done, children }: { step: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${done ? "bg-gold text-ink" : "bg-reed/10 text-reed"}`}>
          {done ? <Check className="h-4 w-4" /> : step}
        </div>
        <h2 className="font-display text-2xl text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DropZone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-all ${drag ? "border-reed bg-reed/5" : "border-border bg-parchment-deep/20 hover:border-gold/60 hover:bg-parchment-deep/40"} ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <input ref={ref} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-reed/30 bg-parchment text-reed">
        <Upload className="h-5 w-5" />
      </div>
      <p className="font-display text-lg text-foreground">Drop a recitation file</p>
      <p className="mt-1 text-sm text-muted-foreground">or click to browse · WAV, MP3, M4A</p>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Loading({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-parchment-deep/30 px-4 py-3 text-sm text-ink-soft">
      <Loader2 className="h-4 w-4 animate-spin text-reed" />
      <span>{text || "Working…"}</span>
    </div>
  );
}

function PreviewPlaceholder({ phase, progress }: { phase: Phase; progress: string }) {
  const isWorking = ["detecting","fetching","analyzing","directing","generating"].includes(phase);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#2a1a0e] via-[#3a2418] to-[#1a100a] p-8 text-center text-amber-50/80">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-black/30">
        {isWorking ? <Loader2 className="h-6 w-6 animate-spin text-gold" /> : phase === "idle" ? <Mic2 className="h-6 w-6 text-gold" /> : <Sparkles className="h-6 w-6 text-gold" />}
      </div>
      <p className="font-display text-xl text-amber-50">
        {phase === "idle" && "Your reel will appear here"}
        {phase === "uploaded" && "Audio ready"}
        {phase === "detecting" && "Listening…"}
        {phase === "detected" && "Confirm the verses to continue"}
        {phase === "fetching" && "Fetching verses…"}
        {phase === "ready" && "Direct the reel to begin"}
        {phase === "analyzing" && "Reading the verses"}
        {phase === "directing" && "Composing the brief"}
        {phase === "generating" && "Painting your reel"}
      </p>
      {progress && <p className="mt-2 max-w-xs text-sm italic text-amber-50/60">{progress}</p>}
    </div>
  );
}
