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
-- Policies must be dropped before the tables, and this is not cosmetic. The
-- \`profiles_read\` policy subqueries \`resources\`, so PostgreSQL records a real
-- dependency and refuses:
--     cannot drop table resources because other objects depend on it
--     DETAIL: policy profiles_read on table profiles depends on table resources
-- Dropping only the tables therefore left the rollback permanently broken, which
-- this comment exists to prevent regressing. (Reverting migration 0003 restores the
-- 0002-era policy, so this ordering matters exactly in the reverse-apply order the
-- runner uses.) Only the teardown path is changed; \`up\` is untouched, so a database
-- that has already applied 0002 is unaffected.
DROP POLICY IF EXISTS profiles_read ON profiles;
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;
DROP POLICY IF EXISTS institutions_read ON institutions;
DROP POLICY IF EXISTS subjects_read ON subjects;
DROP POLICY IF EXISTS resources_read ON resources;
DROP POLICY IF EXISTS resources_insert_own ON resources;
DROP POLICY IF EXISTS resources_update_own ON resources;
DROP POLICY IF EXISTS resources_delete_own ON resources;
DROP POLICY IF EXISTS bookmarks_own ON bookmarks;

DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS institutions;
DROP TABLE IF EXISTS profiles;
DROP FUNCTION IF EXISTS public.app_current_user_id();
`.trim(),
  },
  {
    version: "0003",
    name: "profile_privacy_bridge",
    up: `
-- Closes the limitation recorded in docs/SCHEMA.md §4: the 0002 \`profiles_read\`
-- policy exposed whole rows (email included) to any reader of a profile that had
-- published a resource, whatever that resource's visibility.
--
-- Two changes, neither of which removes a capability the product needs:
--
--   1. \`public.public_profiles\` is the only projection a client may read. It omits
--      email by construction, so an accidental whole-row read cannot leak it.
--      \`security_invoker = true\` (PostgreSQL 15+) keeps the caller's own RLS
--      policies in force through the view instead of turning it into a bypass.
--   2. \`profiles_read\` is narrowed to the owner's own row, or the author of a
--      *public* resource. A private resource no longer makes its author readable.

CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = true) AS
  SELECT id, display_name, role, created_at FROM public.profiles;
COMMENT ON VIEW public.public_profiles IS 'Public author projection. email is never exposed through this view.';

DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles FOR SELECT USING (
  id = public.app_current_user_id()
  OR EXISTS (
    SELECT 1 FROM resources r
    WHERE r.owner_id = profiles.id AND r.visibility = 'public'
  )
);

-- Session bootstrap bridge. The server must map a verified Supabase auth user id
-- onto a profile row *before* it can set app.user_id, which RLS cannot permit
-- without circularity. This SECURITY DEFINER function performs exactly that one
-- lookup and returns no personal data beyond the surrogate key.
CREATE OR REPLACE FUNCTION public.app_profile_for_auth_user(p_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = p_auth_user_id LIMIT 1
$$;
COMMENT ON FUNCTION public.app_profile_for_auth_user(uuid) IS 'Session bootstrap: auth user id -> profile id. Server-only; revoked from PUBLIC.';
REVOKE ALL ON FUNCTION public.app_profile_for_auth_user(uuid) FROM PUBLIC;

-- Where Supabase's anon/authenticated roles exist, take whole-table read away from
-- them and leave only the email-free projection. Conditional, so the migration is
-- equally valid against a plain local PostgreSQL that has neither role.
DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.profiles FROM %I', role_name);
      EXECUTE format('GRANT SELECT ON TABLE public.public_profiles TO %I', role_name);
    END IF;
  END LOOP;
END
$$;
`.trim(),
    down: `
DROP POLICY IF EXISTS profiles_read ON profiles;
-- Restores the 0002 policy verbatim: own row, or author of any resource.
CREATE POLICY profiles_read ON profiles FOR SELECT USING (
  id = public.app_current_user_id()
  OR EXISTS (SELECT 1 FROM resources r WHERE r.owner_id = profiles.id)
);

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT SELECT ON TABLE public.profiles TO %I', role_name);
    END IF;
  END LOOP;
END
$$;

DROP VIEW IF EXISTS public.public_profiles;
DROP FUNCTION IF EXISTS public.app_profile_for_auth_user(uuid);
`.trim(),
  },
  {
    version: "0004",
    name: "profiles_privilege_guard",
    up: `
-- Closes the gap the SG-3 acceptance run found empirically: \`profiles_update_self\`
-- scopes *which rows* a caller may update, never *which columns*. A role holding
-- table-level UPDATE on \`profiles\` could therefore run
--     UPDATE profiles SET role = 'admin' WHERE id = <itself>
-- and the policy would allow it. The application blocked that only because no
-- request schema carries a \`role\` field, and migration 0003 blocked it only
-- because the client roles hold no table grant — neither is a database control,
-- and AUD-002 is precisely "privilege escalation by self-selected role".
--
-- A trigger is used rather than a column privilege because PostgreSQL privileges
-- are additive: a role granted table-level UPDATE keeps it, so REVOKE ... FROM
-- PUBLIC would not stop a role that was granted the table directly. A trigger
-- cannot be granted away.
--
-- The guard is deliberately written so the application's own connection keeps
-- working: it refuses only callers who are neither a superuser, nor BYPASSRLS, nor
-- the table's owner. That covers the local superuser, Supabase's \`postgres\` and
-- \`service_role\`, and any future migration owner, without naming a role.
CREATE OR REPLACE FUNCTION public.profiles_guard_privilege_columns() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  caller_is_privileged boolean;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    SELECT coalesce(r.rolsuper, false) OR coalesce(r.rolbypassrls, false)
      INTO caller_is_privileged
      FROM pg_roles r WHERE r.rolname = current_user;
    IF NOT coalesce(caller_is_privileged, false)
       AND current_user <> pg_get_userbyid((SELECT relowner FROM pg_class
                                            WHERE oid = 'public.profiles'::regclass)) THEN
      RAISE EXCEPTION 'profiles.role and profiles.auth_user_id are server-managed columns'
        USING ERRCODE = '42501',
              HINT = 'Change them through the server, which owns the identity boundary.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.profiles_guard_privilege_columns() IS 'Refuses client-side changes to profiles.role and profiles.auth_user_id (AUD-002).';

DROP TRIGGER IF EXISTS profiles_guard_privilege_columns ON public.profiles;
CREATE TRIGGER profiles_guard_privilege_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privilege_columns();
`.trim(),
    down: `
DROP TRIGGER IF EXISTS profiles_guard_privilege_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_guard_privilege_columns();
`.trim(),
  },
  {
    version: "0005",
    name: "academic_context",
    up: `
ALTER TABLE resources ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'other'
  CHECK (resource_type IN ('lecture_notes', 'study_notes', 'past_paper', 'summary', 'lab_material', 'assignment', 'reference', 'other'));
COMMENT ON COLUMN resources.resource_type IS 'Controlled academic document category.';
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (resource_type);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department TEXT
  CHECK (department IS NULL OR char_length(department) BETWEEN 1 AND 120);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS semester SMALLINT
  CHECK (semester IS NULL OR (semester >= 1 AND semester <= 12));
`.trim(),
    down: `
DROP INDEX IF EXISTS resources_type_idx;
ALTER TABLE resources DROP COLUMN IF EXISTS resource_type;
ALTER TABLE subjects DROP COLUMN IF EXISTS semester;
ALTER TABLE subjects DROP COLUMN IF EXISTS department;
`.trim(),
  },
  {
    version: "0006",
    name: "download_count",
    up: `
ALTER TABLE resources ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0
  CHECK (download_count >= 0);
COMMENT ON COLUMN resources.download_count IS 'Counter incremented on verified download; non-blocking.';

CREATE OR REPLACE FUNCTION public.increment_resource_download(p_resource_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.resources
    WHERE id = p_resource_id
      AND (visibility = 'public' OR owner_id = public.app_current_user_id())
  ) THEN
    UPDATE public.resources
    SET download_count = download_count + 1
    WHERE id = p_resource_id;
  END IF;
END;
$$;
COMMENT ON FUNCTION public.increment_resource_download(UUID) IS 'Increments download count for visible resources without loosening RLS UPDATE policy.';
REVOKE ALL ON FUNCTION public.increment_resource_download(UUID) FROM PUBLIC;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.increment_resource_download(uuid) TO %I', role_name);
    END IF;
  END LOOP;
END
$$;
`.trim(),
    down: `
DROP FUNCTION IF EXISTS public.increment_resource_download(UUID);
ALTER TABLE resources DROP COLUMN IF EXISTS download_count;
`.trim(),
  },
  {
    version: "0007",
    name: "resource_reports",
    up: `
CREATE TABLE IF NOT EXISTS resource_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('copyright', 'academic_integrity', 'spam', 'incorrect_content', 'other')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, resource_id)
);
COMMENT ON TABLE resource_reports IS 'Academic integrity and copyright reports filed by authenticated users.';

CREATE INDEX IF NOT EXISTS resource_reports_resource_idx ON resource_reports (resource_id);
CREATE INDEX IF NOT EXISTS resource_reports_reporter_idx ON resource_reports (reporter_id);

ALTER TABLE resource_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resource_reports_insert_own ON resource_reports;
CREATE POLICY resource_reports_insert_own ON resource_reports FOR INSERT
  WITH CHECK (
    reporter_id = public.app_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id
        AND (r.visibility = 'public' OR r.owner_id = public.app_current_user_id())
    )
  );

DROP POLICY IF EXISTS resource_reports_select_own ON resource_reports;
CREATE POLICY resource_reports_select_own ON resource_reports FOR SELECT
  USING (reporter_id = public.app_current_user_id());

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.resource_reports TO %I', role_name);
    END IF;
  END LOOP;
END
$$;
`.trim(),
    down: `
DROP POLICY IF EXISTS resource_reports_select_own ON resource_reports;
DROP POLICY IF EXISTS resource_reports_insert_own ON resource_reports;
DROP TABLE IF EXISTS resource_reports;
`.trim(),
  },
  {
    version: "0008",
    name: "moderation_and_governance",
    up: `
ALTER TABLE resource_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT
  CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 1000);
ALTER TABLE resource_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE resource_reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES resource_reports (id) ON DELETE SET NULL,
  resource_id UUID REFERENCES resources (id) ON DELETE SET NULL,
  moderator_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('dismiss', 'hide', 'restore', 'delete')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 2 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE moderation_actions IS 'Audit log of actions taken by administrators and moderators.';

CREATE INDEX IF NOT EXISTS moderation_actions_resource_idx ON moderation_actions (resource_id);
CREATE INDEX IF NOT EXISTS moderation_actions_moderator_idx ON moderation_actions (moderator_id);
CREATE INDEX IF NOT EXISTS moderation_actions_created_idx ON moderation_actions (created_at DESC);

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderation_actions_admin ON moderation_actions;
CREATE POLICY moderation_actions_admin ON moderation_actions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'));

DROP POLICY IF EXISTS resource_reports_admin_all ON resource_reports;
CREATE POLICY resource_reports_admin_all ON resource_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'));

DROP POLICY IF EXISTS resources_update_own ON resources;
CREATE POLICY resources_update_own ON resources FOR UPDATE
  USING (
    owner_id = public.app_current_user_id()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin')
  )
  WITH CHECK (
    owner_id = public.app_current_user_id()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS institutions_admin_write ON institutions;
CREATE POLICY institutions_admin_write ON institutions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'));

DROP POLICY IF EXISTS subjects_admin_write ON subjects;
CREATE POLICY subjects_admin_write ON subjects FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = public.app_current_user_id() AND p.role = 'admin'));

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.moderation_actions TO %I', role_name);
      EXECUTE format('GRANT UPDATE ON TABLE public.resource_reports TO %I', role_name);
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.institutions TO %I', role_name);
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.subjects TO %I', role_name);
    END IF;
  END LOOP;
END
$$;
`.trim(),
    down: `
DROP POLICY IF EXISTS subjects_admin_write ON subjects;
DROP POLICY IF EXISTS institutions_admin_write ON institutions;
DROP POLICY IF EXISTS resource_reports_admin_all ON resource_reports;
DROP POLICY IF EXISTS moderation_actions_admin ON moderation_actions;

DROP POLICY IF EXISTS resources_update_own ON resources;
CREATE POLICY resources_update_own ON resources FOR UPDATE
  USING (owner_id = public.app_current_user_id())
  WITH CHECK (owner_id = public.app_current_user_id());

DROP TABLE IF EXISTS moderation_actions;

ALTER TABLE resource_reports DROP COLUMN IF EXISTS resolved_by;
ALTER TABLE resource_reports DROP COLUMN IF EXISTS resolved_at;
ALTER TABLE resource_reports DROP COLUMN IF EXISTS resolution_note;
`.trim(),
  },
];
