-- Rollback-only transaction gate and owner-isolation test; synthetic fixtures only.
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000091'),('00000000-0000-4000-8000-000000000092');
INSERT INTO steady_private.runtime_keys(key_hash) VALUES (encode(sha256(convert_to('rollback-only-fixture-key-not-for-production','UTF8')),'hex'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
SELECT public.steady_batch('["INSERT INTO tasks(id,owner_id,title,goal,kind,due_date,minutes,created_at,updated_at,version) VALUES (''transaction-fixture'',''00000000-0000-4000-8000-000000000091'',''Fixture'',''research'',''work'',''2026-10-04'',15,''fixture'',''fixture'',1)"]'::jsonb,'rollback-only-fixture-key-not-for-production');
DO $$ BEGIN
 IF (SELECT count(*) FROM steady_data.tasks WHERE id='transaction-fixture')<>1 THEN RAISE EXCEPTION 'Owner read failed'; END IF;
 BEGIN PERFORM public.steady_batch('["SELECT * FROM tasks"]','wrong-key-not-for-production-at-least32'); RAISE EXCEPTION 'Gate failed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE steady_data.tasks SET owner_id='00000000-0000-4000-8000-000000000092' WHERE id='transaction-fixture'; RAISE EXCEPTION 'Owner change allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM steady_data.tasks WHERE id='transaction-fixture')<>0 THEN RAISE EXCEPTION 'Other owner read allowed'; END IF;
 UPDATE steady_data.tasks SET title='forbidden' WHERE id='transaction-fixture';
 IF FOUND THEN RAISE EXCEPTION 'Other owner write allowed'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: transaction RPC, server gate, owner read, ownership correction blocked, other owner isolation' AS result;
ROLLBACK;
