-- Compare the vault against the mirror, in one statement, on the side of the
-- wire that has every row.
--
-- WHY THIS IS NOT DONE IN TYPESCRIPT: PostgREST caps a select at 1,000 rows.
-- The first version of the reconcile fetched `path, content_hash` for every
-- note and diffed it in JS, which meant it saw 1,000 of 3,430 and asked the box
-- to resend the other 2,430 -- on every single sync, forever. No error, no
-- empty result, just a sync that never converged and 3MB of pointless upload a
-- tick. That is the second time the same cap has produced a confidently wrong
-- number here (the hub's bucket counts were the first), so: anything that has
-- to see ALL the rows belongs in a function.
--
-- Doing it here also makes the whole compare-and-delete atomic. The delete and
-- the answer are one transaction, so a failure halfway cannot leave the mirror
-- holding notes the vault no longer has while telling the box everything is
-- fine.
create or replace function brain_reconcile(p_manifest jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_want text[];
  v_removed integer;
begin
  if p_manifest is null or jsonb_typeof(p_manifest) <> 'array' then
    raise exception 'manifest must be a JSON array';
  end if;

  -- An empty manifest reads as "the vault is empty", which is what a publisher
  -- whose vault mount has vanished sends. Deleting on that word would erase the
  -- mirror; refuse instead. A stale mirror is recoverable, an erased one costs
  -- a full resync at best and is indistinguishable from data loss at worst.
  if jsonb_array_length(p_manifest) = 0 then
    raise exception 'refusing to reconcile against an empty manifest';
  end if;

  -- Paths whose body this side is missing or holds a stale copy of.
  with m as (
    select e->>'path' as path, e->>'hash' as hash
    from jsonb_array_elements(p_manifest) e
  )
  select coalesce(array_agg(m.path order by m.path), '{}')
  into v_want
  from m
  left join brain_notes n on n.path = m.path
  where n.path is null or n.content_hash is distinct from m.hash;

  -- Notes the vault no longer has.
  with m as (
    select e->>'path' as path
    from jsonb_array_elements(p_manifest) e
  )
  delete from brain_notes n
  where not exists (select 1 from m where m.path = n.path);
  get diagnostics v_removed = row_count;

  return jsonb_build_object(
    'want', to_jsonb(v_want),
    'removed', v_removed,
    'held', (select count(*) from brain_notes)
  );
end;
$$;

revoke execute on function brain_reconcile(jsonb) from public, anon, authenticated;
grant execute on function brain_reconcile(jsonb) to service_role;
