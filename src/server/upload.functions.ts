import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://npwxtkilbdjllidlaofq.supabase.co";
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wd3h0a2lsYmRqbGxpZGxhb2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjU5NjAsImV4cCI6MjA5MjE0MTk2MH0.PD0ywz8vh1Exb9cHornR9kSCWwTQ0dzqYfcPu4pz9u0";
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Upload audio (base64) to the recitations bucket. */
export const uploadAudio = createServerFn({ method: "POST" })
  .inputValidator((input: { base64: string; filename: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { base64, filename, contentType } = data;
    const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("recitations")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: pub } = supabase.storage.from("recitations").getPublicUrl(path);

    const { data: reel, error: insertErr } = await supabase
      .from("reels")
      .insert({ audio_url: pub.publicUrl, status: "uploaded" })
      .select()
      .single();
    if (insertErr) throw new Error(`Reel create failed: ${insertErr.message}`);

    return { reelId: reel.id as string, audioUrl: pub.publicUrl };
  });
