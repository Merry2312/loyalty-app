-- 001_initial_schema.sql
-- Creates all base tables for the Passport loyalty platform

-- contact_identifiers: stores raw email/phone before linked to a user account
create table if not exists contact_identifiers (
  id            uuid primary key default gen_random_uuid(),
  identifier    text not null unique,
  user_id       uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);

-- merchants
create table if not exists merchants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  stamp_icon_url  text,
  brand_color     text not null default '#000000',
  owner_id        uuid not null references auth.users on delete restrict,
  created_at      timestamptz not null default now()
);

-- merchant_staff: links additional staff accounts to a merchant
create table if not exists merchant_staff (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  unique (merchant_id, user_id)
);

-- stamp_rules: defines reward thresholds (one active rule per merchant for MVP)
create table if not exists stamp_rules (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants on delete cascade,
  stamps_required     int not null default 10,
  reward_description  text not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- loyalty_cards: one row per contact_identifier per merchant
create table if not exists loyalty_cards (
  id                      uuid primary key default gen_random_uuid(),
  merchant_id             uuid not null references merchants on delete cascade,
  contact_identifier_id   uuid not null references contact_identifiers on delete cascade,
  stamp_count             int not null default 0,
  created_at              timestamptz not null default now(),
  last_stamped_at         timestamptz,
  unique (merchant_id, contact_identifier_id)
);

-- stamps: immutable audit log — never delete rows from this table
create table if not exists stamps (
  id               uuid primary key default gen_random_uuid(),
  loyalty_card_id  uuid not null references loyalty_cards on delete restrict,
  granted_by       uuid not null references auth.users on delete restrict,
  created_at       timestamptz not null default now()
);

-- redemptions
create table if not exists redemptions (
  id               uuid primary key default gen_random_uuid(),
  loyalty_card_id  uuid not null references loyalty_cards on delete restrict,
  stamp_rule_id    uuid not null references stamp_rules on delete restrict,
  redeemed_at      timestamptz not null default now(),
  redeemed_by      uuid not null references auth.users on delete restrict
);
