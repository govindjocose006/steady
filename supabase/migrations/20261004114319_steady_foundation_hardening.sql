-- Redundant indexes are replaced by the composite primary-key indexes.
DROP INDEX public.idx_day_plans_owner_date;
DROP INDEX public.idx_weekly_reviews_owner_week;
CREATE INDEX identity_mappings_auth_user ON steady_private.identity_mappings(auth_user_id);
-- Explicit fail-closed policy, in addition to schema/table privilege revocation.
CREATE POLICY no_browser_access ON steady_private.identity_mappings FOR ALL TO authenticated USING (false) WITH CHECK (false);
