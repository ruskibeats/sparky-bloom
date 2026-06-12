-- Add provenance_json column to t1d_forecast_envelopes for issue #70/#71
ALTER TABLE public.t1d_forecast_envelopes
  ADD COLUMN IF NOT EXISTS provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb;
