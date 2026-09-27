export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
}

/**
 * M3 migration 0001 — foundation journal + health probe table.
 * Plain SQL with explicit UP and DOWN so `db:migrate` and
 * `db:migrate:down` are exact inverses (roadmap gate G6).
 */
export const migrations: Migration[] = [
  {
    version: "0001",
    name: "foundation_journal",
    up: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS health_probes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`.trim(),
    down: `
DROP TABLE IF EXISTS health_probes;
DROP TABLE IF EXISTS schema_migrations;
`.trim(),
  },
  {
    version: "0002",
    name: "resource_core",
    up: `
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles IS 'Author records. email is private: RLS exposes a row to its owner and to readers of that owner''s resources.';

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 2 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  code TEXT CHECK (code IS NULL OR char_length(code) <= 24),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);
COMMENT ON TABLE subjects IS 'Subject taxonomy scoped per institution (fixes inherited AUD-010 global course uniqueness).';

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects (id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 4000),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  file_key TEXT,
  file_name TEXT,
  file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  file_mime_type TEXT,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN resources.file_key IS 'Opaque storage object key: never a filesystem path, never a public URL.';
COMMENT ON COLUMN resources.search_vector IS 'Stored generated column so the index and the query expression cannot drift apart.';

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS resources_owner_idx ON resources (owner_id);
CREATE INDEX IF NOT EXISTS resources_subject_idx ON resources (subject_id);
CREATE INDEX IF NOT EXISTS resources_public_feed_idx ON resources (created_at DESC) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS resources_search_idx ON resources USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS subjects_institution_idx ON subjects (institution_id);
CREATE INDEX IF NOT EXISTS bookmarks_resource_idx ON bookmarks (resource_id);

CREATE OR REPLACE FUNCTION public.app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;
COMMENT ON FUNCTION public.app_current_user_id() IS 'Identity bridge for RLS: the server sets a transaction-local app.user_id. Returns NULL for anonymous callers.';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles FOR SELECT USING (
  id = public.app_current_user_id()
  OR EXISTS (SELECT 1 FROM resources r WHERE r.owner_id = profiles.id)
);
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles FOR INSERT WITH CHECK (id = public.app_current_user_id());
DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (id = public.app_current_user_id()) WITH CHECK (id = public.app_current_user_id());

DROP POLICY IF EXISTS institutions_read ON institutions;
CREATE POLICY institutions_read ON institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS subjects_read ON subjects;
CREATE POLICY subjects_read ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS resources_read ON resources;
CREATE POLICY resources_read ON resources FOR SELECT
  USING (visibility = 'public' OR owner_id = public.app_current_user_id());
DROP POLICY IF EXISTS resources_insert_own ON resources;
CREATE POLICY resources_insert_own ON resources FOR INSERT
  WITH CHECK (owner_id = public.app_current_user_id());
DROP POLICY IF EXISTS resources_update_own ON resources;
CREATE POLICY resources_update_own ON resources FOR UPDATE
  USING (owner_id = public.app_current_user_id()) WITH CHECK (owner_id = public.app_current_user_id());
DROP POLICY IF EXISTS resources_delete_own ON resources;
CREATE POLICY resources_delete_own ON resources FOR DELETE
  USING (owner_id = public.app_current_user_id());

DROP POLICY IF EXISTS bookmarks_own ON bookmarks;
CREATE POLICY bookmarks_own ON bookmarks FOR ALL
  USING (user_id = public.app_current_user_id()) WITH CHECK (user_id = public.app_current_user_id());
`.trim(),
    down: `
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS institutions;
DROP TABLE IF EXISTS profiles;
DROP FUNCTION IF EXISTS public.app_current_user_id();
`.trim(),
  },
];
