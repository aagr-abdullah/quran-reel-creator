/** Shared <Layout> wrapper for routes. Includes header + parchment background. */
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto mt-20 max-w-6xl px-6 py-10 text-center text-xs text-muted-foreground">
        <div className="mx-auto mb-4 h-px w-32 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <p>Translations from <em>The Clear Quran</em> by Dr. Mustafa Khattab. Built with reverence.</p>
      </footer>
    </div>
  );
}
