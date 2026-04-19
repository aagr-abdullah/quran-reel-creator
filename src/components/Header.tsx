import { Link, useRouterState } from "@tanstack/react-router";

export function Header() {
  const { location } = useRouterState();
  const isActive = (p: string) => location.pathname === p;

  return (
    <header className="relative z-10 border-b border-border/40 bg-parchment/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-reed/30 bg-parchment-deep/60 text-reed shadow-soft">
            <span className="arabic text-xl" style={{ direction: "rtl" }}>ق</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wide text-foreground">Quran Reel Studio</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">a sacred art tool</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {[
            { to: "/", label: "Home" },
            { to: "/studio", label: "Studio" },
            { to: "/about", label: "About" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-full px-4 py-2 transition-colors ${
                isActive(l.to)
                  ? "bg-reed/10 text-reed"
                  : "text-foreground/70 hover:bg-parchment-deep/40 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
