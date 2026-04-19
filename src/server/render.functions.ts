/**
 * Remotion Lambda render orchestration.
 *
 * `renderReel`         — kicks off a Lambda render, returns { renderId, bucketName }.
 * `getRenderProgress`  — polls Lambda for progress, persists final mp4 url to reels table.
 *
 * Required env (server-only secrets):
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   REMOTION_AWS_REGION       e.g. "us-east-1"
 *   REMOTION_SERVE_URL        URL printed by `npx remotion lambda sites create`
 *   REMOTION_FUNCTION_NAME    name printed by `npx remotion lambda functions deploy`
 */
import { createServerFn } from "@tanstack/react-start";
import { renderMediaOnLambda, getRenderProgress as lambdaGetProgress } from "@remotion/lambda/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ReelData } from "@/remotion/QuranReel";

function requireEnv() {
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.REMOTION_AWS_REGION as
    | "us-east-1" | "us-east-2" | "us-west-1" | "us-west-2"
    | "eu-west-1" | "eu-west-2" | "eu-west-3" | "eu-central-1"
    | "ap-south-1" | "ap-southeast-1" | "ap-southeast-2" | "ap-northeast-1"
    | "ap-northeast-2" | "sa-east-1" | "ca-central-1" | undefined;
  const serveUrl = process.env.REMOTION_SERVE_URL;
  const functionName = process.env.REMOTION_FUNCTION_NAME;
  if (!awsKey || !awsSecret || !region || !serveUrl || !functionName) {
    throw new Error(
      "Remotion Lambda is not fully configured. Missing one of: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, REMOTION_AWS_REGION, REMOTION_SERVE_URL, REMOTION_FUNCTION_NAME."
    );
  }
  // Lambda client reads AWS creds from process.env automatically.
  return { region, serveUrl, functionName };
}

export const renderReel = createServerFn({ method: "POST" })
  .inputValidator((input: { reelId: string; data: ReelData }) => input)
  .handler(async ({ data }) => {
    const { region, serveUrl, functionName } = requireEnv();

    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "QuranReel",
      inputProps: { data: data.data },
      codec: "h264",
      imageFormat: "jpeg",
      jpegQuality: 90,
      maxRetries: 1,
      privacy: "public",
      downloadBehavior: { type: "download", fileName: `quran-reel-${data.reelId}.mp4` },
    });

    await supabaseAdmin
      .from("reels")
      .update({
        render_id: renderId,
        render_bucket: bucketName,
        render_region: region,
        render_progress: 0,
        render_error: null,
        status: "rendering",
      })
      .eq("id", data.reelId);

    return { renderId, bucketName, region };
  });

export const getRenderProgress = createServerFn({ method: "POST" })
  .inputValidator((input: { reelId: string; renderId: string; bucketName: string }) => input)
  .handler(async ({ data }) => {
    const { region, functionName } = requireEnv();

    const progress = await lambdaGetProgress({
      renderId: data.renderId,
      bucketName: data.bucketName,
      functionName,
      region,
    });

    // Persist progress + final URL when done
    if (progress.fatalErrorEncountered) {
      const message = progress.errors?.[0]?.message ?? "Render failed";
      await supabaseAdmin
        .from("reels")
        .update({ render_error: message, status: "render_failed" })
        .eq("id", data.reelId);
      return {
        done: true,
        progress: 1,
        error: message,
        videoUrl: null as string | null,
      };
    }

    if (progress.done && progress.outputFile) {
      await supabaseAdmin
        .from("reels")
        .update({
          video_url: progress.outputFile,
          render_progress: 1,
          status: "rendered",
        })
        .eq("id", data.reelId);
      return {
        done: true,
        progress: 1,
        error: null,
        videoUrl: progress.outputFile,
      };
    }

    await supabaseAdmin
      .from("reels")
      .update({ render_progress: progress.overallProgress })
      .eq("id", data.reelId);

    return {
      done: false,
      progress: progress.overallProgress,
      error: null,
      videoUrl: null as string | null,
    };
  });
