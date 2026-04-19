/**
 * Remotion entry root — registers the QuranReel composition for both the
 * local Player AND the Lambda renderer. Lambda bundles this file via
 * `npx remotion lambda sites create src/remotion/index.ts`.
 */
import { Composition } from "remotion";
import { QuranReel, REEL_FPS, REEL_W, REEL_H, totalDurationFrames, type ReelData } from "./QuranReel";
import { defaultBrief } from "@/lib/brief";

const defaultData: ReelData = {
  audioUrl: "",
  brief: defaultBrief(),
  surahName: "الفاتحة",
  surahNameEnglish: "Al-Fatiha",
  ayahStart: 1,
  ayahEnd: 1,
  ayahs: [
    {
      number: 1,
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      translation: "In the Name of Allah—the Most Compassionate, Most Merciful.",
      durationFrames: 120,
    },
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
      durationInFrames={totalDurationFrames(defaultData.ayahs)}
      defaultProps={{ data: defaultData } as unknown as Record<string, unknown>}
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
