-- 003_functions.sql
-- Postgres functions for atomic stamp operations

-- ============================================================
-- issue_stamp
-- Called by the merchant dashboard to issue a stamp atomically.
-- ============================================================
create or replace function issue_stamp(
  p_merchant_id  uuid,
  p_identifier   text
)
returns json
language plpgsql
security definer
as $$
declare
  v_identifier          text;
  v_contact_id          uuid;
  v_card_id             uuid;
  v_stamp_count         int;
  v_stamps_required     int;
  v_reward_unlocked     boolean := false;
begin
  -- 1. Normalize identifier
  v_identifier := lower(trim(p_identifier));

  if v_identifier = '' then
    raise exception 'Identifier must not be empty';
  end if;

  -- 2. Verify caller is merchant staff/owner
  if not is_merchant_staff(p_merchant_id) then
    raise exception 'Not authorized: caller is not merchant staff for this merchant';
  end if;

  -- 3. Upsert contact_identifier
  insert into contact_identifiers (identifier)
  values (v_identifier)
  on conflict (identifier) do nothing;

  select id into v_contact_id
  from contact_identifiers
  where identifier = v_identifier;

  -- 4. Upsert loyalty_card and increment stamp_count
  insert into loyalty_cards (merchant_id, contact_identifier_id, stamp_count, last_stamped_at)
  values (p_merchant_id, v_contact_id, 1, now())
  on conflict (merchant_id, contact_identifier_id) do update
    set stamp_count    = loyalty_cards.stamp_count + 1,
        last_stamped_at = now()
  returning id, stamp_count into v_card_id, v_stamp_count;

  -- 5. Insert stamp audit row
  insert into stamps (loyalty_card_id, granted_by)
  values (v_card_id, auth.uid());

  -- 6. Check reward threshold
  select stamps_required into v_stamps_required
  from stamp_rules
  where merchant_id = p_merchant_id
    and is_active = true
  order by created_at desc
  limit 1;

  if v_stamps_required is not null and v_stamp_count > 0 then
    v_reward_unlocked := (v_stamp_count % v_stamps_required = 0);
  end if;

  -- 7. Return result
  return json_build_object(
    'card_id',         v_card_id,
    'stamp_count',     v_stamp_count,
    'stamps_required', coalesce(v_stamps_required, 10),
    'reward_unlocked', v_reward_unlocked
  );
end;
$$;

-- ============================================================
-- claim_stamps
-- Called after a new user verifies their email.
-- Links all contact_identifiers matching that email to the user.
-- ============================================================
create or replace function claim_stamps(
  p_identifier  text,
  p_user_id     uuid
)
returns int
language plpgsql
security definer
as $$
declare
  v_identifier  text;
  v_count       int;
begin
  -- 1. Normalize identifier
  v_identifier := lower(trim(p_identifier));

  -- 2. Link unlinked contact_identifiers to this user
  update contact_identifiers
  set user_id = p_user_id
  where identifier = v_identifier
    and user_id is null;

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;
