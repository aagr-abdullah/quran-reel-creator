
## What's actually going on

You're looking at the Cloud → **Secrets** UI, which only lists **custom secrets you added** (your AWS / Remotion ones). System-managed Cloud secrets like `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are **not shown there** — they're injected automatically. I confirmed via the project's secret list: `SUPABASE_SERVICE_ROLE_KEY` exists and is set.

So the key isn't missing. The dev server just hasn't loaded it.

## The real fix

The runtime error happened because the dev server process was started before the secret was injected, so `process.env.SUPABASE_SERVICE_ROLE_KEY` is empty inside `client.server.ts`. The fix is a server reload — no code changes, no key paste, no UI hunting.

## Plan (one tiny edit, then test)

1. Force a server reload by adding a harmless comment to `src/integrations/supabase/client.server.ts`. That's it — TanStack Start's dev server will restart and the secret will be present in `process.env`.
2. You then go to `/studio`, drop in an audio file, and the upload should succeed (and detection / generation / Render MP4 should chain through normally).

If, after restart, it still throws "Missing Supabase server environment variables", that means the secret genuinely isn't being injected into the runtime — at that point I'd switch tactics and have the upload function read from `VITE_SUPABASE_URL` for the URL half (it's the same value, and it's guaranteed to be in the env via `.env`), so only the service role key needs to come from `process.env`. But let's try the restart first — it's the boring answer that almost always works here.

## Technical details

- File touched: `src/integrations/supabase/client.server.ts` (comment-only edit to trigger HMR/server restart).
- No DB migrations, no new secrets, no package changes.
- Verifies that `uploadAudio`, `detectVerses`, `generateSubstrate`, `renderReel` all stop hitting the "Missing Supabase server environment variables" path.
