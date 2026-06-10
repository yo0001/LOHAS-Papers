-- Add encrypted BYOK config JSONB column to profiles table
-- Run this via Supabase Dashboard SQL Editor
--
-- Application requirement:
--   Set BYOK_ENCRYPTION_KEY in the server environment before enabling cloud sync.
--   The application stores provider/model/enabled plus encryptedApiKey, not plaintext.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS byok_config JSONB DEFAULT NULL;

-- RLS policies for byok_config
-- Users can read their own byok_config (already covered by existing SELECT policy on profiles)
-- Users can update their own byok_config (already covered by existing UPDATE policy on profiles)

-- If you need explicit column-level policies, uncomment below:
-- CREATE POLICY "Users can read own byok_config" ON profiles
--   FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own byok_config" ON profiles
--   FOR UPDATE USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);
