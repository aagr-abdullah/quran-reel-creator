/**
 * Creative Brief preview card — shown after detection, before render.
 * Lets the user see the AI Art Director's plan before committing render credits.
 */
import type { CreativeBrief } from "@/lib/brief";
import { ARCHETYPE_DESCRIPTIONS } from "@/lib/brief";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Camera, Wind, Eye } from "lucide-react";

export function BriefPreview({
  brief,
  onRedirect,
  redirecting,
}: {
  brief: CreativeBrief;
  onRedirect: () => void;
  redirecting: boolean;
}) {
  const archetypeName = brief.archetype.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const blendName = brief.blendArchetype
    ? brief.blendArchetype.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")
    : null;

  return (
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card/90 to-parchment-deep/40 p-6 shadow-soft">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-reed">
            <Sparkles className="h-3 w-3" /> Art Director's brief
          </p>
          <h3 className="font-display text-2xl text-foreground">
            {archetypeName}
            {blendName && <span className="text-ink-soft"> × {blendName}</span>}
          </h3>
          <p className="mt-1 text-sm italic text-ink-soft">{brief.vision}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedirect}
          disabled={redirecting}
          className="shrink-0 border border-border/40 text-xs"
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${redirecting ? "animate-spin" : ""}`} />
          {redirecting ? "Re-rolling…" : "Re-direct"}
        </Button>
      </div>

      {/* Palette */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Palette</p>
        <div className="flex gap-1.5">
          {(["shadow","base","mid","light","accent"] as const).map((role) => (
            <div key={role} className="flex-1">
              <div
                className="h-12 rounded-md ring-1 ring-black/10"
                style={{ background: brief.palette[role] }}
                title={`${role} · ${brief.palette[role]}`}
              />
              <p className="mt-1 text-center text-[9px] uppercase tracking-wider text-muted-foreground">{role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Typography + camera */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Typography</p>
          <p className="text-base text-foreground" style={{ fontFamily: brief.typography.display }}>
            {brief.typography.display}
          </p>
          <p className="text-xs italic text-ink-soft" style={{ fontFamily: brief.typography.body }}>
            with {brief.typography.body}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Mood</p>
          <p className="font-display text-base capitalize text-foreground">{brief.mood}</p>
        </div>
      </div>

      {/* Camera + atmosphere chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip icon={<Camera className="h-3 w-3" />} label={brief.camera.replace(/-/g, " ")} />
        <Chip icon={<Wind className="h-3 w-3" />} label={brief.atmosphere.replace(/-/g, " ")} />
        <Chip icon={<Eye className="h-3 w-3" />} label={brief.reveal.replace(/-/g, " ")} />
      </div>

      {/* Per-ayah moods */}
      {brief.ayahDirections.length > 0 && (
        <details className="rounded-lg border border-border/40 bg-parchment/40 p-3">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Per-ayah direction ({brief.ayahDirections.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {brief.ayahDirections.map((d) => (
              <li key={d.ayah} className="flex items-start gap-3 text-xs">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-reed/10 text-[10px] font-medium text-reed">{d.ayah}</span>
                <div className="flex-1">
                  <p className="text-foreground">
                    <span className="font-medium capitalize">{d.mood}</span>
                    <span className="text-muted-foreground"> · {d.colorGrade}</span>
                  </p>
                  <p className="text-muted-foreground">{d.imagePrompt}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-parchment/60 px-2.5 py-1 text-[11px] capitalize text-ink">
      {icon} {label}
    </span>
  );
}
