-- 002_rls_policies.sql
-- Enables RLS and creates all row-level security policies

-- Enable RLS on all tables
alter table contact_identifiers enable row level security;
alter table merchants enable row level security;
alter table merchant_staff enable row level security;
alter table stamp_rules enable row level security;
alter table loyalty_cards enable row level security;
alter table stamps enable row level security;
alter table redemptions enable row level security;

-- Helper function: returns true if the current user is owner or staff for a merchant
create or replace function is_merchant_staff(p_merchant_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from merchants
    where id = p_merchant_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1 from merchant_staff
    where merchant_id = p_merchant_id
      and user_id = auth.uid()
  );
$$;

-- ============================================================
-- merchants
-- ============================================================

-- Public read
create policy "merchants_select_public"
  on merchants for select
  using (true);

-- Owner can insert
create policy "merchants_insert_owner"
  on merchants for insert
  with check (owner_id = auth.uid());

-- Owner can update
create policy "merchants_update_owner"
  on merchants for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ============================================================
-- merchant_staff
-- ============================================================

-- Staff members can view their own rows; merchant owners can view all staff for their merchant
create policy "merchant_staff_select"
  on merchant_staff for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from merchants
      where id = merchant_staff.merchant_id
        and owner_id = auth.uid()
    )
  );

-- Only merchant owner can add staff
create policy "merchant_staff_insert_owner"
  on merchant_staff for insert
  with check (
    exists (
      select 1 from merchants
      where id = merchant_id
        and owner_id = auth.uid()
    )
  );

-- ============================================================
-- stamp_rules
-- ============================================================

-- Public read
create policy "stamp_rules_select_public"
  on stamp_rules for select
  using (true);

-- Only merchant owner can insert
create policy "stamp_rules_insert_owner"
  on stamp_rules for insert
  with check (
    exists (
      select 1 from merchants
      where id = merchant_id
        and owner_id = auth.uid()
    )
  );

-- Only merchant owner can update
create policy "stamp_rules_update_owner"
  on stamp_rules for update
  using (
    exists (
      select 1 from merchants
      where id = merchant_id
        and owner_id = auth.uid()
    )
  );

-- ============================================================
-- contact_identifiers
-- ============================================================

-- User can read their own identifier row
create policy "contact_identifiers_select_self"
  on contact_identifiers for select
  using (user_id = auth.uid());

-- User can update their own identifier row (e.g. claim flow)
create policy "contact_identifiers_update_self"
  on contact_identifiers for update
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

-- Merchant staff can insert (needed for issue_stamp)
-- The actual insert happens inside a security definer function,
-- but this policy allows authenticated users to insert via the function.
create policy "contact_identifiers_insert_authenticated"
  on contact_identifiers for insert
  with check (auth.uid() is not null);

-- ============================================================
-- loyalty_cards
-- ============================================================

-- Card owner or merchant staff can select
create policy "loyalty_cards_select"
  on loyalty_cards for select
  using (
    -- customer: the contact_identifier is linked to this user
    exists (
      select 1 from contact_identifiers ci
      where ci.id = contact_identifier_id
        and ci.user_id = auth.uid()
    )
    -- merchant staff
    or is_merchant_staff(merchant_id)
  );

-- Only merchant staff can insert/update loyalty cards
create policy "loyalty_cards_insert_staff"
  on loyalty_cards for insert
  with check (is_merchant_staff(merchant_id));

create policy "loyalty_cards_update_staff"
  on loyalty_cards for update
  using (is_merchant_staff(merchant_id));

-- ============================================================
-- stamps
-- ============================================================

-- Merchant staff or card owner can read stamps
create policy "stamps_select"
  on stamps for select
  using (
    granted_by = auth.uid()
    or exists (
      select 1 from loyalty_cards lc
      where lc.id = loyalty_card_id
        and is_merchant_staff(lc.merchant_id)
    )
    or exists (
      select 1 from loyalty_cards lc
      join contact_identifiers ci on ci.id = lc.contact_identifier_id
      where lc.id = loyalty_card_id
        and ci.user_id = auth.uid()
    )
  );

-- Only merchant staff can insert stamps, and granted_by must be themselves
create policy "stamps_insert_staff"
  on stamps for insert
  with check (
    granted_by = auth.uid()
    and exists (
      select 1 from loyalty_cards lc
      where lc.id = loyalty_card_id
        and is_merchant_staff(lc.merchant_id)
    )
  );

-- ============================================================
-- redemptions
-- ============================================================

-- Merchant staff or card owner can select
create policy "redemptions_select"
  on redemptions for select
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.id = loyalty_card_id
        and is_merchant_staff(lc.merchant_id)
    )
    or exists (
      select 1 from loyalty_cards lc
      join contact_identifiers ci on ci.id = lc.contact_identifier_id
      where lc.id = loyalty_card_id
        and ci.user_id = auth.uid()
    )
  );

-- Only merchant staff can insert redemptions
create policy "redemptions_insert_staff"
  on redemptions for insert
  with check (
    redeemed_by = auth.uid()
    and exists (
      select 1 from loyalty_cards lc
      where lc.id = loyalty_card_id
        and is_merchant_staff(lc.merchant_id)
    )
  );
