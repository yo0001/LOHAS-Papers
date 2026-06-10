-- Persistent rate limits for serverless deployments.
-- Run this via Supabase Dashboard SQL Editor before relying on production limits.

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  limit_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_key_created_at_idx
  ON public.rate_limit_events (limit_key, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rate_limit_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_limit_key TEXT,
  p_max_attempts INTEGER,
  p_window_ms INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  retry_after_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window INTERVAL := (p_window_ms::TEXT || ' milliseconds')::INTERVAL;
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
BEGIN
  DELETE FROM public.rate_limit_events
  WHERE limit_key = p_limit_key
    AND created_at < v_now - v_window;

  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_oldest
  FROM public.rate_limit_events
  WHERE limit_key = p_limit_key
    AND created_at >= v_now - v_window;

  IF v_count >= p_max_attempts THEN
    allowed := FALSE;
    remaining := 0;
    retry_after_ms := GREATEST(
      0,
      CEIL(EXTRACT(EPOCH FROM (v_oldest + v_window - v_now)) * 1000)::INTEGER
    );
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_events (limit_key)
  VALUES (p_limit_key);

  allowed := TRUE;
  remaining := GREATEST(0, p_max_attempts - v_count - 1);
  retry_after_ms := 0;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER)
  FROM anon, authenticated;
