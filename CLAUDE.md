# Passport — Loyalty Platform MVP

## Project overview

Passport is a centralised loyalty platform. Merchants register their business and issue stamps to customers via email or phone lookup. Customers accumulate stamps across merchants in a single "passport" interface. No app download is required to receive stamps — customers are notified by email and can create an account at their leisure to view their passport.

The MVP targets a single independent coffee shop as the first merchant.

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript | Vite for bundling |
| Styling | Tailwind CSS v3 | Mobile-first throughout |
| Backend / DB | Supabase | Postgres + Auth + Realtime + Storage |
| Email | Resend | Transactional email via resend.com |
| Hosting | Vercel | Frontend deployment |
| Package manager | pnpm | Faster installs |

---

## Repository structure

```
passport/
├── CLAUDE.md
├── .env.local                  # never commit — see .env.example
├── .env.example
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_functions.sql
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx
    │
    ├── lib/
    │   ├── supabase.ts          # typed supabase client
    │   ├── resend.ts            # email sending helpers
    │   └── utils.ts
    │
    ├── types/
    │   └── database.ts          # generated supabase types
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useLoyaltyCard.ts
    │   └── useMerchant.ts
    │
    ├── components/
    │   ├── ui/                  # primitives: Button, Input, Badge, etc.
    │   ├── StampGrid.tsx        # renders stamps in passport view
    │   ├── PassportCard.tsx     # one card per merchant in passport
    │   └── MerchantHeader.tsx
    │
    └── pages/
        ├── customer/
        │   ├── Passport.tsx     # main customer view — all their cards
        │   └── CardDetail.tsx   # stamps for a single merchant
        ├── merchant/
        │   ├── Dashboard.tsx    # stamp issuance + redemption view
        │   └── Settings.tsx     # reward rules, branding
        └── auth/
            ├── Login.tsx
            └── Claim.tsx        # "you have stamps waiting" signup flow
```

---

## Database schema

### Tables

**`contact_identifiers`**
Stores raw email/phone inputs before they are linked to a user account. This is the core of the deferred-signup model.

```sql
id            uuid primary key
identifier    text not null unique   -- email address (lowercase, trimmed)
user_id       uuid references auth.users nullable
created_at    timestamptz default now()
```

**`merchants`**

```sql
id              uuid primary key
name            text not null
slug            text not null unique  -- used in URLs e.g. /m/rosetta-coffee
stamp_icon_url  text                  -- optional custom stamp image
brand_color     text default '#000000'
owner_id        uuid references auth.users not null
created_at      timestamptz default now()
```

**`merchant_staff`**
Links additional staff accounts to a merchant.

```sql
id           uuid primary key
merchant_id  uuid references merchants not null
user_id      uuid references auth.users not null
created_at   timestamptz default now()
```

**`stamp_rules`**
Defines reward thresholds. One active rule per merchant for MVP.

```sql
id                  uuid primary key
merchant_id         uuid references merchants not null
stamps_required     int not null default 10
reward_description  text not null   -- e.g. "Free filter coffee"
is_active           boolean default true
created_at          timestamptz default now()
```

**`loyalty_cards`**
One row per contact_identifier per merchant.

```sql
id                      uuid primary key
merchant_id             uuid references merchants not null
contact_identifier_id   uuid references contact_identifiers not null
stamp_count             int not null default 0
created_at              timestamptz default now()
last_stamped_at         timestamptz
unique (merchant_id, contact_identifier_id)
```

**`stamps`**
Immutable audit log. Never delete rows from this table.

```sql
id               uuid primary key
loyalty_card_id  uuid references loyalty_cards not null
granted_by       uuid references auth.users not null  -- must be merchant staff
created_at       timestamptz default now()
```

**`redemptions`**

```sql
id               uuid primary key
loyalty_card_id  uuid references loyalty_cards not null
stamp_rule_id    uuid references stamp_rules not null
redeemed_at      timestamptz default now()
redeemed_by      uuid references auth.users not null  -- merchant staff
```

---

## Row Level Security rules

These are non-negotiable. Implement before building any frontend.

- `stamps`: INSERT allowed only if `granted_by` is the authenticated user AND that user is linked to the merchant via `merchants.owner_id` or `merchant_staff`.
- `loyalty_cards`: SELECT allowed if the authenticated user owns the linked `contact_identifier` (via `contact_identifiers.user_id`) OR is a merchant staff member for that merchant.
- `merchants`: SELECT is public. INSERT/UPDATE only by `owner_id`.
- `redemptions`: INSERT allowed only by merchant staff. SELECT allowed by merchant staff or the card owner.

---

## Key functions (Supabase DB functions)

**`issue_stamp(p_merchant_id, p_identifier)`**
Called by merchant dashboard. Does the following atomically:
1. Normalises identifier (lowercase, trim)
2. Upserts into `contact_identifiers`
3. Upserts into `loyalty_cards`
4. Inserts into `stamps`
5. Increments `loyalty_cards.stamp_count`
6. Returns the updated card + whether a reward threshold has been crossed
7. Triggers email notification (via Supabase Edge Function)

This must be a Postgres function so the auth check and stamp write are atomic. Never do this as multiple client-side calls.

**`claim_stamps(p_identifier, p_user_id)`**
Called after a new user verifies their email. Links all `contact_identifiers` rows matching that email to the new `user_id`.

---

## Application routes

```
/                        → redirect to /passport if authed, else /login
/login                   → magic link login for customers and merchants
/claim                   → "you have stamps waiting" — post-signup claim flow

/passport                → customer: all loyalty cards
/passport/:merchantSlug  → customer: detail view for one merchant

/m/:merchantSlug         → merchant: stamp issuance dashboard (staff view)
/m/:merchantSlug/settings → merchant: reward rules + branding
```

Route protection: use a wrapper component that checks Supabase session. Redirect unauthenticated users to `/login` with `?next=` param.

---

## Auth model

Single Supabase Auth instance. Role is determined by database rows, not auth metadata.

- A user is a **merchant** if they have a row in `merchants` (owner_id) or `merchant_staff`.
- A user is a **customer** if they have linked `contact_identifiers`.
- A user can be both.

Login method: **magic link only** for MVP. No passwords. Reduces friction and removes password reset complexity.

---

## Email notifications (Resend)

Two transactional emails for MVP:

**1. Stamp notification** (sent on every stamp)
- Subject: `You earned a stamp at {merchant_name} ☕`
- Body: merchant name, current stamp count, stamps needed for reward, CTA button → `/claim?email={encoded_email}`
- Sent to the raw identifier even if no account exists yet

**2. Reward unlocked** (sent when stamp_count reaches threshold)
- Subject: `You've earned a free {reward_description} at {merchant_name} 🎉`
- Body: reward description, instructions to show staff, CTA to view passport

Use Resend's React Email templates for both. Keep them simple for MVP — no heavy HTML.

---

## Environment variables

```bash
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server/edge functions only — never expose to client
RESEND_API_KEY=
VITE_APP_URL=                # e.g. https://passport.app or http://localhost:5173
```

---

## Build order

See the step-by-step build plan document for the full breakdown. At a high level:

1. Supabase project + schema + RLS
2. Auth (magic link login)
3. Merchant dashboard — stamp issuance flow
4. Email notifications via Resend
5. Customer passport view
6. Claim flow (link stamps to new account)
7. Merchant settings (reward rules, branding)
8. Polish + demo prep

---

## Code conventions

- All database calls go through typed helper functions in `src/lib/` — never raw Supabase queries inline in components.
- Use `React Query` (TanStack Query) for all async data fetching and cache management.
- Form handling with `react-hook-form` + `zod` for validation.
- All user-facing strings in plain English — no i18n needed for MVP.
- Prefer named exports over default exports for components.
- Every Supabase query must handle the error case explicitly — never silently ignore `error` from Supabase responses.

---

## What is explicitly out of scope for MVP

Do not build these. Park them.

- Native iOS / Android apps
- SMS notifications
- Limited-time or seasonal stamps
- Cross-merchant challenges or gamification
- Self-serve merchant onboarding (you onboard the first merchant manually)
- Payments or subscription billing
- Multi-location merchant support
- Staff PIN / role management beyond owner access
- Analytics dashboard beyond basic stamp counts