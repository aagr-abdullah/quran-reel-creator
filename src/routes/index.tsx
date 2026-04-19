import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { STYLES } from "@/lib/surahs";
import { ArrowRight, Sparkles, Mic, Wand2, Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quran Reel Studio — Turn your recitation into sacred art" },
      { name: "description", content: "Upload your Quran recitation and create a uniquely beautiful 9:16 reel — synced calligraphy, Khattab translation, AI-generated cinematography, maqam-aware color grading." },
      { property: "og:title", content: "Quran Reel Studio" },
      { property: "og:description", content: "Upload your recitation. Receive a piece of sacred art." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Layout>
      <Hero />
      <Aesthetics />
      <HowItWorks />
      <CTA />
    </Layout>
  );
}

function Hero() {
  return (
    <section className="relative pb-24 pt-12">
      <div className="absolute inset-x-0 -top-10 mx-auto h-[420px] max-w-3xl rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, oklch(0.78 0.12 78) 0%, transparent 70%)" }} />
      <div className="relative grid gap-14 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-parchment-deep/40 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-ink-soft">
            <Sparkles className="h-3 w-3 text-gold" />
            <span>For your soul, not the algorithm</span>
          </div>
          <h1 className="text-balance font-display text-5xl leading-[1.05] text-foreground md:text-7xl">
            Turn your <span className="reed-ink italic">recitation</span> into a
            <br />
            <span className="gold-shimmer">piece of sacred art.</span>
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-ink-soft">
            Upload an audio recitation. Receive a 9:16 reel with synced
            calligraphy, the Khattab translation, AI-generated cinematography
            informed by the verse meaning, and a color palette drawn from the
            <em> maqam </em> of your voice.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="illuminated h-12 rounded-full px-7 text-base font-medium hover:opacity-95">
              <Link to="/studio">
                Begin in the Studio
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 rounded-full px-5 text-base text-foreground/70 hover:bg-parchment-deep/40">
              <Link to="/about">How it works</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <span>~98% verse auto-detection</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>Real Uthmanic Hafs script</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>Renders in browser</span>
          </div>
        </div>

        <PreviewMock />
      </div>
    </section>
  );
}

function PreviewMock() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] breathe">
      <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-gold/40 via-reed/20 to-transparent blur-xl" />
      <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-gold/40 bg-gradient-to-br from-[#2a1a0e] via-[#3a2418] to-[#1a100a] shadow-illuminated">
        {/* parchment */}
        <div className="absolute inset-0 opacity-90"
          style={{ background: "radial-gradient(ellipse at 30% 30%, oklch(0.40 0.10 60) 0%, oklch(0.20 0.06 50) 70%)" }} />
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 80px 20px rgba(0,0,0,0.5)" }} />
        {/* ayah number */}
        <div className="absolute left-1/2 top-12 -translate-x-1/2 rounded-full border border-gold/60 bg-black/30 px-5 py-1.5 text-[11px] uppercase tracking-[0.3em] text-gold backdrop-blur-sm">
          Ayah 4
        </div>
        {/* Arabic */}
        <div className="absolute left-6 right-6 top-[35%] arabic text-center text-[28px] leading-[1.9] text-amber-50/95"
          style={{ direction: "rtl", fontFamily: "'Amiri Quran', serif", textShadow: "0 0 18px rgba(220,160,80,0.4)" }}>
          ٱلَّذِينَ يُقِيمُونَ ٱلصَّلَوٰةَ
        </div>
        {/* English */}
        <div className="absolute bottom-24 left-6 right-6 text-center text-sm italic leading-snug text-amber-50/85"
          style={{ fontFamily: "'Lora', serif" }}>
          "those who establish prayer"
        </div>
        {/* flourish */}
        <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-gold" />
          <span className="h-px w-10 bg-gold/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="h-px w-10 bg-gold/70" />
          <span className="h-1 w-1 rounded-full bg-gold" />
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">A glimpse — yours will be uniquely generated.</p>
    </div>
  );
}

function Aesthetics() {
  return (
    <section className="border-t border-gold/15 py-20">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-reed">Four aesthetics</p>
        <h2 className="font-display text-4xl text-foreground md:text-5xl">Each one a distinct visual language.</h2>
        <p className="mt-4 text-ink-soft">
          The studio suggests one based on the surah you recite — but the choice is always yours.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STYLES.map((s) => (
          <article key={s.id} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-shadow hover:shadow-illuminated">
            <StyleSwatch styleId={s.id} />
            <h3 className="mt-4 font-display text-xl text-foreground">{s.name}</h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-reed">{s.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function StyleSwatch({ styleId }: { styleId: string }) {
  const styles: Record<string, string> = {
    "calligraphic-bloom": "radial-gradient(ellipse at 30% 40%, #c97a4c, transparent 60%), linear-gradient(135deg, #f5e0c4, #d4a86a 70%, #8b5a2a)",
    "liquid-light": "radial-gradient(ellipse at 70% 30%, #e8b870, transparent 60%), linear-gradient(135deg, #2a3a6e, #6a4a8e 50%, #c98a4c)",
    "sacred-geometry": "conic-gradient(from 0deg at 50% 50%, #2a6a6e, #c9a84c, #f5e8c8, #2a6a6e)",
    "celestial": "radial-gradient(ellipse at 50% 30%, #9b72cf, transparent 60%), linear-gradient(180deg, #1a1a3e, #3a2a4e 50%, #c98a4c)",
  };
  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-gold/20 transition-transform duration-700 group-hover:scale-[1.02]"
      style={{ background: styles[styleId] }} />
  );
}

function HowItWorks() {
  const steps = [
    { icon: Mic, title: "Recite & upload", body: "Record yourself reciting any passage. Upload the audio." },
    { icon: Wand2, title: "Auto-detect & analyze", body: "We identify the exact ayahs (~98% accuracy), detect the maqam of your voice, and analyze the meaning of each verse." },
    { icon: Sparkles, title: "Generate", body: "AI paints a parchment substrate, per-ayah backgrounds, and gold flourishes — all informed by what you recited and how you recited it." },
    { icon: Download, title: "Preview & save", body: "Watch the live composition, then capture the reel as a video file you can share." },
  ];
  return (
    <section className="border-t border-gold/15 py-20">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-reed">The process</p>
        <h2 className="font-display text-4xl text-foreground md:text-5xl">Honest about what's happening.</h2>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-reed/40 bg-parchment-deep/40 text-reed">
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step {i + 1}</p>
            <h3 className="mt-1 font-display text-xl text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-gold/15 py-24 text-center">
      <h2 className="mx-auto max-w-2xl font-display text-4xl text-foreground md:text-5xl">
        Your voice deserves <span className="reed-ink italic">a setting</span> as deliberate as the words you speak.
      </h2>
      <Button asChild size="lg" className="illuminated mt-8 h-14 rounded-full px-10 text-base">
        <Link to="/studio">
          Begin in the Studio
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </section>
  );
}
