-- Private tables are not exposed through the REST table API.
CREATE SCHEMA steady_data;
REVOKE ALL ON SCHEMA steady_data FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA steady_data TO authenticated, service_role;
ALTER TABLE public.application_events SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.application_events TO authenticated;
CREATE POLICY owner_insert ON steady_data.application_events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.application_events FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.application_events FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.applications SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.applications TO authenticated;
CREATE POLICY owner_insert ON steady_data.applications FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.applications FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.applications FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.day_plans SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.day_plans TO authenticated;
CREATE POLICY owner_insert ON steady_data.day_plans FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.day_plans FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.day_plans FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.day_templates SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.day_templates TO authenticated;
CREATE POLICY owner_insert ON steady_data.day_templates FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.day_templates FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.day_templates FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.events SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.events TO authenticated;
CREATE POLICY owner_insert ON steady_data.events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.events FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.events FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.focus_sessions SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.focus_sessions TO authenticated;
CREATE POLICY owner_insert ON steady_data.focus_sessions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.focus_sessions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.focus_sessions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.habit_events SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.habit_events TO authenticated;
CREATE POLICY owner_insert ON steady_data.habit_events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.habit_events FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.habit_events FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.habit_records SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.habit_records TO authenticated;
CREATE POLICY owner_insert ON steady_data.habit_records FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.habit_records FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.habit_records FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.motivation_settings SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.motivation_settings TO authenticated;
CREATE POLICY owner_insert ON steady_data.motivation_settings FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.motivation_settings FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.motivation_settings FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.planning_events SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.planning_events TO authenticated;
CREATE POLICY owner_insert ON steady_data.planning_events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.planning_events FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.planning_events FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.points_awards SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.points_awards TO authenticated;
CREATE POLICY owner_insert ON steady_data.points_awards FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.points_awards FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.points_awards FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.points_ledger SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.points_ledger TO authenticated;
CREATE POLICY owner_insert ON steady_data.points_ledger FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.points_ledger FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.points_ledger FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.redemptions SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.redemptions TO authenticated;
CREATE POLICY owner_insert ON steady_data.redemptions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.redemptions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.redemptions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.rewards SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.rewards TO authenticated;
CREATE POLICY owner_insert ON steady_data.rewards FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.rewards FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.rewards FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.tasks SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.tasks TO authenticated;
CREATE POLICY owner_insert ON steady_data.tasks FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.tasks FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.tasks FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.weekly_reviews SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.weekly_reviews TO authenticated;
CREATE POLICY owner_insert ON steady_data.weekly_reviews FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.weekly_reviews FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.weekly_reviews FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.workspace_catalog SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.workspace_catalog TO authenticated;
CREATE POLICY owner_insert ON steady_data.workspace_catalog FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.workspace_catalog FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.workspace_catalog FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.workspace_events SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.workspace_events TO authenticated;
CREATE POLICY owner_insert ON steady_data.workspace_events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.workspace_events FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.workspace_events FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.workspace_records SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.workspace_records TO authenticated;
CREATE POLICY owner_insert ON steady_data.workspace_records FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.workspace_records FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.workspace_records FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
ALTER TABLE public.workspace_settings SET SCHEMA steady_data;
GRANT SELECT, INSERT, UPDATE, DELETE ON steady_data.workspace_settings TO authenticated;
CREATE POLICY owner_insert ON steady_data.workspace_settings FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_update ON steady_data.workspace_settings FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY owner_delete ON steady_data.workspace_settings FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA steady_data TO authenticated;
GRANT USAGE ON SCHEMA steady_private TO authenticated;
CREATE TABLE steady_private.runtime_keys (key_hash text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE steady_private.runtime_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE steady_private.runtime_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON steady_private.runtime_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON steady_private.runtime_keys TO authenticated;
CREATE POLICY read_key_hash ON steady_private.runtime_keys FOR SELECT TO authenticated USING (true);

-- Requires BOTH a verified Supabase user JWT and an independent server-only key.
-- SECURITY INVOKER retains all row policies. Never use a service-role key here.
-- Browser table access is unavailable because steady_data is not an exposed schema.
CREATE FUNCTION public.steady_batch(statements jsonb, server_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = steady_data, pg_catalog
SET standard_conforming_strings = on
AS $$
DECLARE
  item jsonb;
  command text;
  rows_json jsonb;
  changed bigint;
  output jsonb := '[]'::jsonb;
BEGIN
  IF current_user <> 'authenticated' OR auth.uid() IS NULL OR length(server_key) < 32 OR NOT EXISTS (
    SELECT 1 FROM steady_private.runtime_keys WHERE key_hash = encode(sha256(convert_to(server_key, 'UTF8')), 'hex')
  ) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(statements) IS DISTINCT FROM 'array' OR jsonb_array_length(statements) NOT BETWEEN 1 AND 256
    THEN RAISE EXCEPTION 'Invalid batch'; END IF;
  -- All writes for this account serialize, including daily caps and reward balance checks.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  FOR item IN SELECT value FROM jsonb_array_elements(statements) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid statement'; END IF;
    command := item #>> '{}';
    IF length(command) > 200000 OR command !~* '^\s*(SELECT|INSERT|UPDATE|DELETE)\s'
      THEN RAISE EXCEPTION 'Invalid statement'; END IF;
    IF command ~* '^\s*SELECT\s' THEN
      EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(result)), ''[]''::jsonb) FROM (' || command || ') result' INTO rows_json;
      changed := 0;
    ELSE
      EXECUTE command;
      GET DIAGNOSTICS changed = ROW_COUNT;
      rows_json := '[]'::jsonb;
    END IF;
    output := output || jsonb_build_array(jsonb_build_object('results', rows_json, 'success', true, 'meta', jsonb_build_object('changes', changed)));
  END LOOP;
  RETURN output;
END;
$$;
REVOKE ALL ON FUNCTION public.steady_batch(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.steady_batch(jsonb,text) TO authenticated;
