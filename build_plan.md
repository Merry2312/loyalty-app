# Passport MVP — Build Plan

This document is your step-by-step guide to building the MVP. Each phase has a clear goal, a definition of done, and notes on gotchas to watch for. Work through phases in order — later phases depend on earlier ones being solid.

---

## Phase 1 — Project setup and Supabase schema

**Goal:** A running local dev environment with the full database schema and RLS policies in place.

### Steps

1. Create a new Vite + React + TypeScript project
   ```bash
   pnpm create vite passport --template react-ts
   cd passport
   pnpm install
   ```

2. Install dependencies
   ```bash
   pnpm add @supabase/supabase-js @tanstack/react-query react-router-dom react-hook-form zod @hookform/resolvers
   pnpm add -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. Create a new Supabase project at supabase.com. Copy the URL and anon key into `.env.local`.

4. Install Supabase CLI and initialise locally
   ```bash
   pnpm add -D supabase
   npx supabase init
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

5. Write migration `001_initial_schema.sql` — create all tables as defined in CLAUDE.md.

6. Write migration `002_rls_policies.sql` — implement all RLS rules. Enable RLS on every table with `ALTER TABLE x ENABLE ROW LEVEL SECURITY`.

7. Write migration `003_functions.sql` — implement `issue_stamp()` and `claim_stamps()` as Postgres functions.

8. Push migrations
   ```bash
   npx supabase db push
   ```

9. Generate TypeScript types from the schema
   ```bash
   npx supabase gen types typescript --linked > src/types/database.ts
   ```

10. Create `src/lib/supabase.ts` — initialise the typed Supabase client.

**Definition of done:** You can open Supabase Table Editor and see all tables. RLS is enabled on every table. TypeScript types are generated and imported without errors.

**Gotcha:** Write the RLS policies carefully and test them manually in the Supabase SQL editor before moving on. A misconfigured policy will cause confusing auth bugs later that are hard to trace.

---

## Phase 2 — Auth (magic link login)

**Goal:** A working login screen. Users can enter their email, receive a magic link, and land on a post-auth redirect.

### Steps

1. Create `src/hooks/useAuth.ts` — wraps Supabase auth session, exposes `user`, `signIn(email)`, `signOut()`.

2. Create `src/pages/auth/Login.tsx`
   - Single email input + submit button
   - On submit: call `supabase.auth.signInWithOtp({ email })`
   - Show "Check your email" confirmation state after submit
   - Handle the `?next=` redirect param so users land where they intended after login

3. Configure the Supabase Auth redirect URL in the Supabase dashboard to point to your local dev URL (`http://localhost:5173`).

4. Create a route guard component `src/components/RequireAuth.tsx` — redirects to `/login?next={currentPath}` if no session.

5. Create `src/router.tsx` — set up React Router with all routes defined in CLAUDE.md. Wrap customer and merchant routes in `RequireAuth`.

6. Test the full magic link flow end to end.

**Definition of done:** You can log in via magic link and land on a protected route. Unauthenticated access to protected routes redirects to login.

---

## Phase 3 — Merchant: stamp issuance

**Goal:** A logged-in merchant can type a customer email and issue a stamp. This is the core of the product.

### Steps

1. Create a seed script or manually insert a test merchant row in Supabase linked to your logged-in user's `id`. You are the first merchant for now.

2. Create `src/hooks/useMerchant.ts` — fetches merchant data for the current user.

3. Create `src/pages/merchant/Dashboard.tsx`
   - Shows merchant name at top
   - Large, prominent email input field — this is the primary UI
   - "Issue stamp" button
   - On submit: calls the `issue_stamp()` Postgres function via `supabase.rpc('issue_stamp', { p_merchant_id, p_identifier })`
   - Show success state with customer's current stamp count returned from the function
   - Show error state clearly (e.g. invalid email format)
   - Keep the form fast — staff use this during a transaction

4. Add a recent stamps list below the form — last 10 stamps issued today, showing identifier and time. Useful for staff to confirm and catch mistakes.

5. Style for mobile-first. This screen will be used on a phone behind a counter.

**Definition of done:** You can issue a stamp to an email address. The stamp appears in the `stamps` table and `loyalty_cards.stamp_count` increments. The function returns correctly whether the customer already had a card or this is their first visit.

**Gotcha:** Call `issue_stamp()` as a single `supabase.rpc()` call — never split it into multiple client-side queries. The atomicity of the Postgres function is what prevents double-stamps and race conditions.

---

## Phase 4 — Email notifications (Resend)

**Goal:** Customers receive an email every time a stamp is issued.

### Steps

1. Sign up for Resend (resend.com) and get an API key. Add it to `.env.local`.

2. Create a Supabase Edge Function `supabase/functions/send-stamp-notification/index.ts`. This function:
   - Is triggered after `issue_stamp()` via a Postgres trigger or called directly from `issue_stamp()`
   - Accepts `{ identifier, merchant_name, stamp_count, stamps_required, reward_description, app_url }`
   - Calls the Resend API to send the stamp notification email
   - Returns 200 on success, logs errors but does not throw (email failure should not break stamp issuance)

3. For MVP, build the email as a plain HTML string inside the Edge Function — no React Email needed yet. Keep it simple: text-based, clearly branded, one CTA button.

4. Stamp notification email template:
   ```
   Subject: You earned a stamp at {merchant_name} ☕
   
   Hey! You just earned a stamp at {merchant_name}.
   
   You have {stamp_count} of {stamps_required} stamps.
   {if close to reward: "Only {remaining} more until a free {reward_description}!"}
   
   [View your passport →]
   
   If you haven't created your passport account yet, your stamps are saved.
   Click the button above to claim them.
   ```

5. Reward unlocked email — triggered when `stamp_count` reaches `stamps_required`:
   ```
   Subject: You've earned a free {reward_description} at {merchant_name} 🎉
   
   You've collected all your stamps! Show this email to staff to claim your reward.
   
   Free {reward_description} at {merchant_name}
   Valid until you redeem it.
   
   [View passport →]
   ```

6. Deploy the Edge Function
   ```bash
   npx supabase functions deploy send-stamp-notification
   npx supabase secrets set RESEND_API_KEY=your_key
   ```

7. Test with a real email address.

**Definition of done:** Issuing a stamp from the dashboard causes an email to arrive within a few seconds. Reward emails fire correctly at the threshold.

**Gotcha:** Resend requires a verified sending domain in production. For MVP testing you can send from their sandbox (`onboarding@resend.dev`) to your own email. Set up a real domain before showing it to the first merchant.

---

## Phase 5 — Customer: passport view

**Goal:** A logged-in customer can see all their loyalty cards and stamps.

### Steps

1. Create `src/hooks/useLoyaltyCard.ts` — fetches all loyalty cards for the current user's linked contact identifiers.

2. Create `src/components/PassportCard.tsx`
   - Displays merchant name and brand colour
   - Renders a stamp grid (filled vs empty stamps)
   - Shows reward progress e.g. "7 / 10 stamps"
   - Shows "Reward ready!" badge when threshold is met

3. Create `src/components/StampGrid.tsx`
   - Renders N circles/icons in a grid
   - Filled stamps use the merchant's brand colour or stamp icon
   - Empty stamps are outlined
   - Keep it visually satisfying — this is the "passport page" moment

4. Create `src/pages/customer/Passport.tsx`
   - Lists all `PassportCard` components for the user
   - Empty state: "No stamps yet — visit a registered merchant and give them your email"
   - Sort by most recently stamped first

5. Create `src/pages/customer/CardDetail.tsx`
   - Full view of a single merchant's card
   - Shows individual stamp history (dates)
   - Shows reward rules

**Definition of done:** After issuing stamps in Phase 3, logging in as the customer shows their passport with the correct stamp count displayed visually.

---

## Phase 6 — Claim flow (link stamps to new account)

**Goal:** A customer who received a stamp email but has no account can sign up and immediately see their stamps.

### Steps

1. The stamp notification email CTA links to `/claim?email={base64_encoded_email}`.

2. Create `src/pages/auth/Claim.tsx`
   - Pre-fills the email from the query param (read-only)
   - Explains: "You have stamps waiting — create a free account to see your passport"
   - Single button: "Send magic link"
   - On click: trigger magic link to that email, same as normal login

3. After magic link login, detect that the user came from the claim flow (use a flag in `localStorage` or the redirect URL). Call `claim_stamps(email, user_id)` to link the `contact_identifiers` row to the new account.

4. The `claim_stamps()` Postgres function:
   - Finds all `contact_identifiers` rows where `identifier = email`
   - Sets `user_id` on those rows to the authenticated user's id
   - Returns count of cards claimed

5. After claiming, redirect to `/passport`. The passport should now show all previously issued stamps.

6. Handle edge case: user already has an account and clicks an old stamp email link. Detect that `contact_identifiers.user_id` is already set and skip the claim step — just redirect to `/passport`.

**Definition of done:** A fresh email address receives a stamp, clicks the email link, creates an account, and sees their stamp(s) on the passport without any manual steps.

---

## Phase 7 — Merchant settings

**Goal:** A merchant can configure their reward rule and basic branding.

### Steps

1. Create `src/pages/merchant/Settings.tsx`
   - Reward rule: stamps required (number input), reward description (text input)
   - Brand colour picker (simple hex input or basic colour swatches)
   - Merchant display name

2. On save: update `merchants` and `stamp_rules` tables.

3. Validate that `stamps_required` is between 3 and 50.

4. Show a preview of what the customer's stamp card will look like with current settings.

**Definition of done:** Merchant can change their reward from "10 stamps = free coffee" to any other configuration. The passport view reflects the change.

---

## Phase 8 — Demo prep and polish

**Goal:** The app is presentable to a real coffee shop owner.

### Checklist

- [ ] Mobile layout is clean and usable on a real phone (test on actual devices, not just browser devtools)
- [ ] Merchant dashboard works fast — stamp issuance should feel instant
- [ ] Email notifications arrive promptly and look professional
- [ ] Error states are all handled — invalid email, network failure, duplicate stamp within 1 minute (add a cooldown check to `issue_stamp()`)
- [ ] Empty states are friendly and instructive
- [ ] The passport stamp grid is visually satisfying
- [ ] Set up a real Resend sending domain so emails don't go to spam
- [ ] Deploy to Vercel with production environment variables set
- [ ] Seed the app with one real merchant (your demo coffee shop)
- [ ] Do a full end-to-end run-through: issue stamp → receive email → click link → create account → see passport → reach reward threshold → receive reward email

### Demo script

When you sit down with the coffee shop owner:
1. Show the merchant dashboard on your phone — takes 3 seconds to issue a stamp
2. Have them enter their own email
3. Watch the notification arrive on their phone
4. Click through to the passport
5. Issue a few more stamps until the reward threshold — show the reward email

The goal of the demo is not to show features. It is to make them feel the moment a customer gets that first notification.

---

## After the first merchant — what's next

Once you have one paying merchant, the next highest-value additions in order are:

1. **Redemption flow** — staff marks a reward as redeemed in the dashboard, customer's count resets
2. **Limited-time stamps** — "Gold stamp this Saturday" as originally envisioned
3. **Basic merchant analytics** — visit frequency, redemption rate
4. **Multiple merchants** — self-serve onboarding for merchant #2+
5. **Cross-merchant passport** — the full gamified vision

Do not build any of these until merchant #1 is live and paying.