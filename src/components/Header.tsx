import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="relative z-10 border-b border-border/40 bg-parchment/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/studio" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-reed/30 bg-parchment-deep/60 text-reed shadow-soft">
            <span className="arabic text-xl" style={{ direction: "rtl" }}>ق</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wide text-foreground">Quran Reel Studio</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">a sacred art tool</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
