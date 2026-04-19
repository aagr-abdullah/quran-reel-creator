/**
 * Remotion entry root — registers the QuranReel composition for both the
 * local Player AND the Lambda renderer. Lambda bundles this file via
 * `npx remotion lambda sites create src/remotion/index.ts`.
 */
import { Composition } from "remotion";
import { QuranReel, REEL_FPS, REEL_W, REEL_H, totalDurationFrames, type ReelData } from "./QuranReel";

// Default placeholder data — Lambda will override with real props at render time.
const defaultData: ReelData = {
  audioUrl: "",
  style: "calligraphic-bloom",
  maqam: "Bayati",
  palette: ["#3a2a1a", "#a06030", "#f5e8c8"],
  surahName: "الفاتحة",
  surahNameEnglish: "Al-Fatiha",
  ayahs: [
    { number: 1, arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "In the Name of Allah—the Most Compassionate, Most Merciful.", durationFrames: 120 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="QuranReel"
      component={QuranReel as React.FC<Record<string, unknown>>}
      width={REEL_W}
      height={REEL_H}
      fps={REEL_FPS}
      durationInFrames={totalDurationFrames(defaultData.ayahs) + 60}
      defaultProps={{ data: defaultData } as unknown as Record<string, unknown>}
      // Calculate real duration from incoming props at render time
      calculateMetadata={({ props }) => {
        const data = (props as { data: ReelData }).data;
        return {
          durationInFrames: totalDurationFrames(data.ayahs),
          props,
        };
      }}
    />
  );
};
