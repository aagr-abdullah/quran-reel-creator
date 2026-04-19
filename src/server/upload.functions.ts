import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Upload audio (base64) to the recitations bucket. */
export const uploadAudio = createServerFn({ method: "POST" })
  .inputValidator((input: { base64: string; filename: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    const { base64, filename, contentType } = data;
    const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safeName}`;

    const { error } = await supabaseAdmin.storage
      .from("recitations")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: pub } = supabaseAdmin.storage.from("recitations").getPublicUrl(path);

    const { data: reel, error: insertErr } = await supabaseAdmin
      .from("reels")
      .insert({ audio_url: pub.publicUrl, status: "uploaded" })
      .select()
      .single();
    if (insertErr) throw new Error(`Reel create failed: ${insertErr.message}`);

    return { reelId: reel.id as string, audioUrl: pub.publicUrl };
  });
