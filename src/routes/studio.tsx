import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadAudio } from "@/server/upload.functions";
import { detectVerses, fetchVerses, type AyahPayload } from "@/server/detect.functions";
import { detectMaqam, analyzeVerseMeaning } from "@/server/maqam.functions";
import { generateSubstrate, generateAyahBackground } from "@/server/assets.functions";
import { renderReel as renderReelFn, getRenderProgress } from "@/server/render.functions";
import { SURAHS, STYLES, suggestStyle, type ReelStyle, getSurah } from "@/lib/surahs";
import { Player, type PlayerRef } from "@remotion/player";
import { QuranReel, REEL_FPS, REEL_W, REEL_H, totalDurationFrames, type AyahData, type ReelData } from "@/remotion/QuranReel";
import { toast } from "sonner";
import { Upload, Loader2, Wand2, Mic2, Sparkles, Check, Play, Download, Film } from "lucide-react";
import { Toaster } from "sonner";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Quran Reel Studio" },
      { name: "description", content: "Upload your recitation and generate a beautiful 9:16 reel with synced calligraphy and translation." },
    ],
  }),
  component: StudioPage,
});

type Phase = "idle" | "uploaded" | "detecting" | "detected" | "fetching" | "ready" | "analyzing" | "generating" | "preview" | "rendering" | "rendered";

interface DetectCandidate {
  surah: number;
  ayahStart: number;
  ayahEnd: number;
  confidence: number;
}

function StudioPage() {
  const upload = useServerFn(uploadAudio);
  const detect = useServerFn(detectVerses);
  const fetchVs = useServerFn(fetchVerses);
  const maqamFn = useServerFn(detectMaqam);
  const analyzeFn = useServerFn(analyzeVerseMeaning);
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
  const [style, setStyle] = useState<ReelStyle>("calligraphic-bloom");
  const [substrateUrl, setSubstrateUrl] = useState<string | null>(null);
  const [ayahAssets, setAyahAssets] = useState<Record<number, { backgroundUrl?: string; meaning?: { mood: string; imagery: string; concept: string; colorHint: string } }>>({});
  const [progress, setProgress] = useState<string>("");
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const playerRef = useRef<PlayerRef>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);

  // Build reel data for the Player
  const reelData: ReelData | null = useMemo(() => {
    if (verses.length === 0 || !audioUrl || !audioDuration) return null;
    const surahMeta = getSurah(chosenSurah);
    const palette = maqam?.palette ?? ["#3a2a1a", "#a06030", "#f5e8c8"];
    // Distribute audio duration across ayahs by syllable approximation
    const totalSyllables = verses.reduce((s, v) => s + Math.max(1, v.arabic.length / 3), 0);
    const totalAyahFrames = Math.max(60, Math.round(audioDuration * REEL_FPS));
    const ayahs: AyahData[] = verses.map((v) => {
      const syl = Math.max(1, v.arabic.length / 3);
      const frames = Math.max(45, Math.round((syl / totalSyllables) * totalAyahFrames));
      return {
        number: v.numberInSurah,
        arabic: v.arabic,
        translation: v.translation,
        durationFrames: frames,
        backgroundUrl: ayahAssets[v.numberInSurah]?.backgroundUrl,
        meaning: ayahAssets[v.numberInSurah]?.meaning,
      };
    });
    return {
      audioUrl,
      substrateUrl: substrateUrl ?? undefined,
      style,
      maqam: maqam?.maqam ?? "Bayati",
      palette,
      surahName: surahMeta?.nameArabic ?? "",
      surahNameEnglish: surahMeta?.nameEnglish ?? "",
      ayahs,
    };
  }, [verses, audioUrl, audioDuration, ayahAssets, substrateUrl, style, maqam, chosenSurah]);

  const totalFrames = useMemo(() => (reelData ? totalDurationFrames(reelData.ayahs) : 60 * REEL_FPS), [reelData]);

  const onFile = useCallback(async (file: File) => {
    setPhase("uploaded");
    setProgress("Uploading recitation…");
    try {
      // Read audio duration
      const url = URL.createObjectURL(file);
      const a = new Audio(url);
      await new Promise<void>((res, rej) => {
        a.onloadedmetadata = () => res();
        a.onerror = () => rej(new Error("Cannot read audio"));
      });
      setAudioDuration(a.duration);

      // base64 upload
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

      // Auto-trigger detection
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
        setStyle(suggestStyle(top.surah));
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
    if (!reelId || !audioUrl || verses.length === 0) return;
    try {
      setPhase("analyzing");
      setProgress("Listening for the maqam of your voice…");
      const m = await maqamFn({ data: { audioUrl, reelId } });
      setMaqam(m);
      toast.success(`Detected maqam: ${m.maqam} — ${m.mood}`);

      setProgress("Reading the meaning of each ayah…");
      const meaningRes = await analyzeFn({
        data: {
          reelId,
          ayahs: verses.map((v) => ({ number: v.numberInSurah, arabic: v.arabic, translation: v.translation })),
        },
      });
      const meaningMap = new Map(meaningRes.meanings.map((mm) => [mm.ayah, mm]));

      setPhase("generating");
      setProgress(`Painting parchment substrate…`);
      const sub = await substrateFn({ data: { reelId, style } });
      setSubstrateUrl(sub.url);

      // Generate per-ayah backgrounds in parallel batches
      const updates: Record<number, { backgroundUrl?: string; meaning?: { mood: string; imagery: string; concept: string; colorHint: string } }> = {};
      for (let i = 0; i < verses.length; i++) {
        const v = verses[i];
        const meaning = meaningMap.get(v.numberInSurah) ?? { mood: m.mood, imagery: "", concept: "", intensity: 5, colorHint: m.description };
        setProgress(`Painting ayah ${v.numberInSurah} — ${meaning.imagery || meaning.mood}…`);
        try {
          const r = await bgFn({
            data: {
              reelId,
              ayahNumber: v.numberInSurah,
              style,
              maqamMood: m.mood,
              palette: m.palette,
              meaning: { mood: meaning.mood, imagery: meaning.imagery, concept: meaning.concept, colorHint: meaning.colorHint },
            },
          });
          updates[v.numberInSurah] = { backgroundUrl: r.url, meaning: { mood: meaning.mood, imagery: meaning.imagery, concept: meaning.concept, colorHint: meaning.colorHint } };
          setAyahAssets((prev) => ({ ...prev, [v.numberInSurah]: updates[v.numberInSurah] }));
        } catch (e) {
          console.error(`Ayah ${v.numberInSurah} bg failed:`, e);
          updates[v.numberInSurah] = { meaning: { mood: meaning.mood, imagery: meaning.imagery, concept: meaning.concept, colorHint: meaning.colorHint } };
          setAyahAssets((prev) => ({ ...prev, [v.numberInSurah]: updates[v.numberInSurah] }));
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
  }, [reelId, audioUrl, verses, style, maqamFn, analyzeFn, substrateFn, bgFn]);

  const onExport = useCallback(async () => {
    if (!playerWrapRef.current || !reelData) return;
    setPhase("exporting");
    setExportProgress(0);
    try {
      // Find the audio element inside Remotion Player
      const audioEl = playerWrapRef.current.querySelector("audio") as HTMLAudioElement | null;
      if (!audioEl) {
        toast.error("Could not locate audio for export. Press Play first.");
        setPhase("preview");
        return;
      }
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
      const blob = await captureReel({
        player: playerWrapRef.current,
        audio: audioEl,
        durationMs: (totalFrames / REEL_FPS) * 1000,
        fps: REEL_FPS,
        onProgress: (f) => setExportProgress(f),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quran-reel-${reelId}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Reel saved");
      setPhase("preview");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Export failed");
      setPhase("preview");
    }
  }, [reelData, totalFrames, reelId]);

  const surahMeta = getSurah(chosenSurah);

  return (
    <Layout>
      <Toaster position="top-center" richColors />
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* LEFT — controls */}
        <div className="space-y-8">
          <header>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-reed">Studio</p>
            <h1 className="font-display text-4xl text-foreground">Build your reel</h1>
            <p className="mt-2 text-ink-soft">One sacred passage at a time.</p>
          </header>

          {/* Step 1 — upload */}
          <Card step={1} title="Upload recitation" done={!!audioUrl}>
            <DropZone onFile={onFile} disabled={phase !== "idle" && phase !== "uploaded"} />
            {audioUrl && (
              <div className="mt-4 rounded-lg border border-border/60 bg-parchment/60 p-3">
                <audio controls src={audioUrl} className="w-full" />
                {audioDuration && <p className="mt-2 text-xs text-muted-foreground">Duration: {audioDuration.toFixed(1)}s</p>}
              </div>
            )}
          </Card>

          {/* Step 2 — detect */}
          {phase !== "idle" && (
            <Card step={2} title="Confirm verses" done={phase === "ready" || phase === "analyzing" || phase === "generating" || phase === "preview" || phase === "exporting"}>
              {phase === "detecting" && <Loading text={progress} />}
              {transcription && (
                <details className="mb-4 rounded-lg border border-border/40 bg-parchment-deep/30 p-3 text-sm">
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-muted-foreground">Show transcription</summary>
                  <p className="arabic mt-3 text-right text-lg leading-loose text-ink" style={{ direction: "rtl" }}>
                    {transcription}
                  </p>
                </details>
              )}
              {candidates.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top matches</p>
                  {candidates.map((c, i) => {
                    const sm = getSurah(c.surah);
                    const isSel = chosenSurah === c.surah && chosenStart === c.ayahStart && chosenEnd === c.ayahEnd;
                    return (
                      <button
                        key={i}
                        onClick={() => { setChosenSurah(c.surah); setChosenStart(c.ayahStart); setChosenEnd(c.ayahEnd); setStyle(suggestStyle(c.surah)); }}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${
                          isSel ? "border-reed bg-reed/5" : "border-border/60 bg-parchment-deep/30 hover:bg-parchment-deep/60"
                        }`}
                      >
                        <div>
                          <div className="font-display text-base text-foreground">
                            {sm?.nameEnglish} ({sm?.nameTranslation})
                          </div>
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
                    <select
                      value={chosenSurah}
                      onChange={(e) => { const s = +e.target.value; setChosenSurah(s); setStyle(suggestStyle(s)); setChosenStart(1); setChosenEnd(Math.min(getSurah(s)?.ayahCount ?? 1, 5)); }}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {SURAHS.map((s) => (
                        <option key={s.number} value={s.number}>{s.number}. {s.nameEnglish}</option>
                      ))}
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

          {/* Step 3 — style */}
          {(phase === "ready" || phase === "analyzing" || phase === "generating" || phase === "preview" || phase === "exporting") && (
            <Card step={3} title="Choose your aesthetic" done={phase === "preview" || phase === "exporting" || phase === "generating" || phase === "analyzing"}>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((s) => {
                  const sel = style === s.id;
                  return (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`group rounded-xl border p-4 text-left transition-all ${
                        sel ? "border-reed bg-reed/5 shadow-illuminated" : "border-border/60 bg-card/60 hover:border-gold/40"
                      }`}>
                      <StyleSwatch styleId={s.id} sel={sel} />
                      <div className="mt-3 font-display text-base text-foreground">{s.name}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-reed">{s.tagline}</div>
                    </button>
                  );
                })}
              </div>
              {phase === "ready" && (
                <Button onClick={onGenerate} className="mt-6 illuminated h-12 rounded-full px-7 text-base">
                  <Wand2 className="mr-1 h-4 w-4" /> Generate the reel
                </Button>
              )}
            </Card>
          )}

          {/* Step 4 — generation progress / export */}
          {(phase === "analyzing" || phase === "generating" || phase === "exporting") && (
            <Card step={4} title="Generating">
              <Loading text={progress || "Working…"} />
              {Object.keys(ayahAssets).length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{Object.keys(ayahAssets).length} of {verses.length} ayahs painted</p>
              )}
              {phase === "exporting" && (
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-parchment-deep/60">
                    <div className="h-full bg-gradient-to-r from-reed to-gold transition-[width]" style={{ width: `${exportProgress * 100}%` }} />
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">{Math.round(exportProgress * 100)}% recorded</p>
                </div>
              )}
            </Card>
          )}

          {phase === "preview" && (
            <Card step={4} title="Save your reel">
              {maqam && (
                <div className="mb-4 rounded-lg border border-gold/30 bg-parchment-deep/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Detected maqam</p>
                      <p className="font-display text-2xl text-foreground">{maqam.maqam}</p>
                      <p className="text-sm italic text-ink-soft">{maqam.mood}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {maqam.palette.map((c) => (
                        <span key={c} className="h-8 w-8 rounded-full ring-1 ring-gold/40" style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={onExport} className="illuminated h-12 w-full rounded-full px-7 text-base">
                <Download className="mr-1 h-4 w-4" /> Save reel as video
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Recording captures the live preview. Keep this tab focused for best quality.
              </p>
            </Card>
          )}
        </div>

        {/* RIGHT — preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-reed">
            <Play className="h-3 w-3" /> Live preview
          </div>
          <div ref={playerWrapRef} className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-3xl border border-gold/30 bg-[#1a100a] shadow-illuminated">
            {reelData ? (
              <Player
                ref={playerRef}
                component={QuranReel}
                inputProps={{ data: reelData }}
                durationInFrames={totalFrames}
                fps={REEL_FPS}
                compositionWidth={REEL_W}
                compositionHeight={REEL_H}
                style={{ width: "100%", height: "100%" }}
                controls
                loop
                clickToPlay
              />
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
          done ? "bg-gold text-ink" : "bg-reed/10 text-reed"
        }`}>
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
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-all ${
        drag ? "border-reed bg-reed/5" : "border-border bg-parchment-deep/20 hover:border-gold/60 hover:bg-parchment-deep/40"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
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

function StyleSwatch({ styleId, sel }: { styleId: string; sel: boolean }) {
  const styles: Record<string, string> = {
    "calligraphic-bloom": "radial-gradient(ellipse at 30% 40%, #c97a4c, transparent 60%), linear-gradient(135deg, #f5e0c4, #d4a86a 70%, #8b5a2a)",
    "liquid-light": "radial-gradient(ellipse at 70% 30%, #e8b870, transparent 60%), linear-gradient(135deg, #2a3a6e, #6a4a8e 50%, #c98a4c)",
    "sacred-geometry": "conic-gradient(from 0deg at 50% 50%, #2a6a6e, #c9a84c, #f5e8c8, #2a6a6e)",
    "celestial": "radial-gradient(ellipse at 50% 30%, #9b72cf, transparent 60%), linear-gradient(180deg, #1a1a3e, #3a2a4e 50%, #c98a4c)",
  };
  return (
    <div className={`aspect-[16/10] w-full overflow-hidden rounded-lg ring-1 transition-all ${sel ? "ring-2 ring-reed" : "ring-gold/20"}`}
      style={{ background: styles[styleId] }} />
  );
}

function PreviewPlaceholder({ phase, progress }: { phase: Phase; progress: string }) {
  const isWorking = phase === "detecting" || phase === "fetching" || phase === "analyzing" || phase === "generating";
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
        {phase === "ready" && "Choose a style and generate"}
        {(phase === "analyzing" || phase === "generating") && "Painting your reel"}
      </p>
      {progress && <p className="mt-2 max-w-xs text-sm italic text-amber-50/60">{progress}</p>}
    </div>
  );
}
