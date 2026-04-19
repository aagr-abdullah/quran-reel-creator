ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS render_id text,
  ADD COLUMN IF NOT EXISTS render_bucket text,
  ADD COLUMN IF NOT EXISTS render_region text,
  ADD COLUMN IF NOT EXISTS render_progress numeric,
  ADD COLUMN IF NOT EXISTS render_error text;