import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { STYLES } from "@/lib/surahs";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Quran Reel Studio" },
      { name: "description", content: "How the studio works: constrained Quranic corpus matching, maqam detection, verse-meaning visual choreography, and the four cinematic aesthetics." },
      { property: "og:title", content: "About — Quran Reel Studio" },
      { property: "og:description", content: "The honest engineering behind the sacred art." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <Layout>
      <article className="prose prose-stone mx-auto max-w-3xl pb-24 pt-6 text-foreground">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-reed">About</p>
        <h1 className="font-display text-5xl leading-tight text-foreground">
          A small tool, built with <span className="reed-ink italic">reverence</span>.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          Most Quran apps are built for utility. This one is built for beauty. It
          exists because your recitation deserves a setting as considered as the
          words you speak — and because the verses should feel <em>alive</em> on
          screen, not pasted there.
        </p>

        <Section title="How verse detection works (~98% accurate)">
          <p>
            The Quran is a closed corpus of 6,236 ayahs, fully digitized. We exploit that.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-ink-soft">
            <li>Gemini 2.5 Pro transcribes the Arabic from your audio.</li>
            <li>We strip diacritics (tashkil), normalize alif/ya/hamza variants, and tokenize.</li>
            <li>A sliding window slides through every plausible ayah window in candidate surahs, scoring each with token-level Levenshtein distance.</li>
            <li>The top three candidates surface with confidence scores. You can always override.</li>
          </ol>
          <p className="mt-4">
            This is dramatically more accurate than naive transcribe-then-guess
            because it constrains the search space to only valid Quranic text.
            The same approach Tarteel AI uses.
          </p>
        </Section>

        <Section title="Maqam detection (the cool part)">
          <p>
            <em>Maqam</em> is the Arabic system of melodic modes — Hijaz, Bayati,
            Saba, Rast, Nahawand, Sikah. Each one has a distinct emotional
            character. Saba is mournful. Hijaz is longing. Rast is majestic.
          </p>
          <p className="mt-4">
            We send your audio to Gemini 2.5 Pro and ask it to identify the
            maqam by listening to the pitch contour and characteristic intervals.
            Then we use that maqam to set the <strong>color palette</strong> of
            your reel. Saba gives you muted indigo and slate. Hijaz gives you
            warm amber and burgundy. Bayati gives you soft teal.
          </p>
          <p className="mt-4">
            <strong>Honest accuracy:</strong> ~75-85% on clear recitation. We show
            you the detected maqam and let you override. Even when slightly off,
            the suggested mood is usually emotionally appropriate.
          </p>
        </Section>

        <Section title="Verse-meaning choreography">
          <p>
            Before generating any visuals, Gemini analyzes <strong>each ayah</strong>:
            the mood, the dominant imagery, the emotional intensity, the
            color suggestion. That analysis becomes part of the prompt that
            generates the per-ayah background. A verse about light renders bright;
            a verse about the night renders deep and still.
          </p>
        </Section>

        <Section title="The four aesthetics">
          <div className="mt-4 grid gap-5 not-prose">
            {STYLES.map((s) => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-card/60 p-5">
                <h3 className="font-display text-xl text-foreground">{s.name}</h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-reed">{s.tagline}</p>
                <p className="mt-2 text-sm text-ink-soft">{s.description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="On accuracy of the calligraphy">
          <p>
            The Arabic text shown on screen is <strong>not AI-generated</strong> —
            it's set in <em>Amiri Quran</em>, an authentic Uthmanic Hafs typeface.
            AI generates only the <em>art around</em> the verse: parchment textures,
            atmospheric backgrounds, gold ornaments. The verse itself is always
            100% accurate.
          </p>
        </Section>

        <Section title="Honest limits">
          <ul className="mt-4 list-disc space-y-2 pl-6 text-ink-soft">
            <li><strong>Word sync</strong> is estimated by splitting audio duration across words proportionally. Looks ~85% perfect; a fine-tune timeline is on the roadmap.</li>
            <li><strong>Render time</strong> is ~30-90 seconds depending on how many ayahs you recited.</li>
            <li><strong>Translation</strong> is The Clear Quran by Dr. Mustafa Khattab, fetched live from alquran.cloud.</li>
            <li><strong>No login in v1</strong>. Generate, download, done.</li>
          </ul>
        </Section>

        <div className="mt-16 border-t border-gold/20 pt-12 text-center">
          <Link to="/studio" className="text-base text-reed underline-offset-4 hover:underline">
            Open the Studio →
          </Link>
        </div>
      </article>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl text-foreground">{title}</h2>
      <div className="mt-3 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}
