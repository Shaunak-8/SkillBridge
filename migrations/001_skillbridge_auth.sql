BEGIN;
CREATE SCHEMA IF NOT EXISTS skillbridge;
CREATE TABLE IF NOT EXISTS skillbridge.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id text NOT NULL UNIQUE,
  username text NOT NULL CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text CHECK (role IN ('student', 'business', 'admin')),
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT onboarding_completed OR role IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_ci ON skillbridge.profiles (lower(username));
CREATE TABLE IF NOT EXISTS skillbridge.rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
REVOKE ALL ON SCHEMA skillbridge FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA skillbridge FROM PUBLIC;
COMMIT;
