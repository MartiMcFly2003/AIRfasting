# AIR — Claude Code Launch Brief v2
## August Soft Launch Build (3-week scope)

---

## What you are building

AIR is a **cycle-aware fasting calendar**. It shows users which days in their hormonal or lunar cycle are generally supportive of fasting, displayed as coloured phase blocks (Inhale / Bloom / Radiate / Exhale). Within fasting-supportive blocks, users can pick their own fasting days and log them. The app does not prescribe how long to fast — the user chooses. Educational content about fasting durations appears as contextual information, not as targets.

**Tech stack:** Next.js (React) · Supabase (auth + database) · Stripe (subscriptions + promo codes) · Vercel (hosting) · PostHog (analytics) · Tailwind CSS · Resend (email) · Public moon phase API

---

## Three-tier structure

### Free tier
- Calendar showing phase blocks (Inhale / Bloom / Radiate / Exhale) in colour, indicating where in the cycle fasting is generally possible vs. not
- Moon highlight days visible (Ekadashi, Full Moon, New Moon) as information only
- Plain fasting tracker — start/stop stopwatch, logs duration
- Current month only

### Premium tier ($14.99/month — 1-month free trial)
- Everything in Free, plus:
- **Personal fasting planner** — user picks specific fasting days within supportive phase blocks; chosen days are marked on the calendar
- **Duration setting** — user sets planned fasting hours for each chosen day
- **Tracker with target notification** — when the user starts the tracker on a planned day, a notification fires when their planned duration is reached; one-tap option to extend by 1 hour (and repeat); for personal tracking only
- **Notifications** — reminders before planned fasting days
- **Full monthly calendar** — current + upcoming months
- **Forecasted calendar** — future months show forecasted phase blocks based on average cycle length; updates automatically when user logs a new period at a different date than predicted
- **Menopause mode** — user can indicate periods have stopped; calendar switches to moon-cycle-based phase blocks
- **Promotional codes** — Premium can be unlocked via promo code
- **Standard prep/refeed guidance** — one set of general guidance for everyone (day before a planned fast, day after); not personalised by diet type in this version

### Add-ons tier (placeholder — not built for August, architecture only)
- Faith-based calendar dates (placeholder slot in UI — "Coming soon")
- Tailored nutrition advice (placeholder)
- Online challenge sign-up (placeholder — August cohort uses Telegram separately)
- Promotional codes apply to add-ons too
- Build the data model and UI slot; do not build the content

---

## Design system

**Colors:**
- Background: `#0B0B0F` (Obsidian)
- Text: `#F6F3EC` (Warm Ivory)
- Accent: `#FFBA6A` (Sunset Coral)
- Gold: `#FFC971` (Solar Gold)
- Secondary: `#B7BCC6` (Moon Silver)

**Phase block colours (calendar):**
- Inhale (Days 1–10): warm gold / amber glow
- Bloom (Days 11–15): soft rose / pink
- Radiate (Days 16–19): coral / sunset orange
- Exhale (Days 20–28): cool silver / grey-blue

**Typography:**
- Headings: Cinzel Light (Google Fonts)
- Body: Inter Light
- Accents: DM Sans Medium

**Feel:** dark, atmospheric, cinematic. Not a health tracker — a cycle awareness portal.

---

## Onboarding (5 screens for August)

**Screen 1 — Identity**
- Gender → Woman / Man / Prefer to self-describe / Prefer not to say
- Age → number input (minimum 18 enforced)

**Screen 2 — Cycle status** (shown if gender = Woman or self-describe)
- Is your cycle currently: Regular / Irregular / No longer have periods / Not sure
- First day of last period → date picker (if regular or irregular)
- Months since last period → dropdown (if no longer have periods)

**Screen 3 — Fasting experience**
- Have you tried dry fasting before? Yes / No / Not sure
- Have you tried water fasting before? Yes / No

**Screen 4 — Health & safety gate (Protocol 0)**
- Q29: Eating disorder history → Yes currently / Yes in the past still working through it / Yes fully recovered / No / Prefer not to say
- Q29b: Binge-eating tendency → Yes often / Sometimes / Rarely or never / Prefer not to say
- **If Q29 = "Yes currently" OR "Yes still working through it", OR Q29b = "Yes often":**
  → Set `plan_type = "professional_guided"`
  → Show Protocol 0 screen (warm, non-clinical referral to 1:1 session)
  → Do not generate calendar

**Screen 5 — Goals**
- What brings you to AIR? (multi-select): Hormonal balance / Cycle awareness / Spiritual practice / General wellness / Energy / Other

---

## Track derivation (backend, never shown to user)

```
if plan_type = "professional_guided" → no calendar generated
if gender = Man → track = "no_cycle"
if cycle = "not sure" → track = "gentle_starter"
if cycle = regular AND has period date → track = "menstrual"
if cycle = irregular → track = "moon_sync"
if no periods < 3 months → track = "moon_sync_bridging"
if no periods 3+ months OR menopause indicated → track = "weekly_rhythm"
```

Store as `user_profiles.track`.

---

## Calendar signal and phase block logic

### Protocol 1 — Menstrual track

Standard = 28-day reference cycle. All block lengths scale by: `cycle_length / 28`.
Recalculates from Day 1 when user logs a new period.

| Block | AIR name | Days (of 28) | Colour | Fasting possible? |
|---|---|---|---|---|
| 1 | Inhale | 1–10 | Gold/amber | Yes |
| 2 | Bloom | 11–15 | Rose/pink | No |
| 3 | Radiate | 16–19 | Coral/orange | Yes |
| 4 | Exhale | 20–28 | Silver/grey-blue | No |

**Calendar display:**
- Each phase block is shown as a coloured band across its days — users immediately see the rhythm of the month
- Within Inhale and Radiate blocks: days are available for the user to pick as fasting days (Premium)
- Free: phase blocks visible, but no day-picking
- Individual day icons (🟢 / 💧) only appear once a user has picked that day as a fasting day (Premium)
- Moon highlights (🌕) overlay on any day they fall, regardless of phase

**Forecasted months (Premium):**
- Future months calculated from: last period date + average cycle length
- Shown with a "forecasted" indicator
- If user logs next period on a different date → all future months recalculate automatically

### Protocol 2 — Moon-sync track (irregular / perimenopause)

Same four-block structure and colours. Day 1 = most recent New Moon from API.
More conservative: any body-signal flag → suggest switching to rest days.

### Protocol 3 — Weekly rhythm (menopause / men / no-cycle)

- App recommends 5-1-1 or 4-2-1 rhythm (user chooses which)
- **5-1-1:** 5 fasting-possible days, 1 deeper-fasting day, 1 rest/nourish day per week
- **4-2-1:** 4 fasting-possible days, 2 deeper-fasting days, 1 rest/nourish day per week
- User picks which days of the week are their fasting days (Premium planner)
- The rest/nourish day is automatically placed the day after their last chosen fasting day
- Moon highlights (Ekadashi, Full Moon, New Moon) shown as informational signals indicating generally good fasting days — user decides whether to align their picks with these
- No specific day recommendation from the app beyond the moon highlights

---

## Moon highlight overlay

Call moon phase API daily. For Ekadashi, New Moon, Full Moon:
- Show as gold/lunar icon overlay on the calendar day
- On fasting-possible days: shown as a good-day signal
- On rest/nourish days: shown as an intention/spiritual day — no fasting implication
- Moon highlights never convert a rest day into a fasting day

---

## Premium planner — day picking and tracker flow

**Picking a fasting day:**
1. User taps a day inside a fasting-possible block (Inhale or Radiate)
2. A bottom sheet opens: "Plan a fast for [date]"
3. User selects fast type: Dry fast / Water fast
4. User optionally sets planned duration in hours (e.g. 16h)
5. Day is marked on calendar with the appropriate icon

**Tracker flow:**
1. On a planned fasting day, user opens tracker
2. Tracker shows: fast type, planned duration, elapsed time
3. When elapsed time = planned duration → notification fires: "You've reached your [X]h goal. Well done. Extend by 1 hour?"
4. User can tap "Extend 1h" — notification fires again after the extra hour
5. User taps "End fast" at any point → log entry saved
6. **Important:** notifications and duration targets are for personal tracking only. No judgment, no streaks, no "well done" scoring. Just: "You planned X hours — you've reached it."

**If user has no planned duration set:** tracker runs as plain stopwatch with no notification.

---

## Faith calendar (placeholder only — not built for August)

- In the calendar UI, reserve a visual slot or settings toggle: "Faith-based calendar dates — Coming soon"
- In the database, add a `faith_preferences` column (JSON, nullable) — empty for now
- In the add-ons section of account settings, show a placeholder card: "Faith Calendar — unlock dates from your tradition. Available soon."
- Do not build any calendar integration or date sourcing

---

## Prep/refeed guidance (standard — same for everyone)

**Day before a planned fast** (Premium — shown as a gentle prompt):
> "Tomorrow is a fasting day you've planned. Keep meals lighter and easier to digest today. Hydrate well. Avoid heavy meals late at night."

**Day after a fast** (Premium — shown as a gentle prompt):
> "You fasted yesterday. Break gently — start with water, then something light and nourishing. Take your time returning to normal eating."

Same copy for all users regardless of diet style. Store as editable content in Supabase (admin can update without code deployment).

---

## Educational content on fasting durations

Shown as contextual information when a user picks a fasting day or opens the tracker. Not a target or recommendation — just context.

> "An overnight fast is roughly 8–12 hours — from your last meal the evening before to breakfast the next morning. A daytime window extends this further. There's no prescribed duration here — this is entirely your choice based on how you feel."

Store as editable content in Supabase.

---

## Food guidance by phase (general methodology — confirmed)

Shown on the calendar as a daily tip within each phase block.

| Phase | Guidance |
|---|---|
| Inhale (Days 1–10) | Oestrogen-supportive foods. Seed cycling: flaxseed + pumpkin seed. Lighter eating around fasting days. |
| Bloom (Days 11–15) | Protein, minerals, high-fibre foods. Stable blood glucose. Gut support. |
| Radiate (Days 16–19) | Low-carb on fasting days. Medium carbs if energy drops. |
| Exhale (Days 20–28) | Progesterone-supportive foods: root vegetables, seeds, complex carbs. No strict restriction. |

Store as editable content in Supabase (admin-editable without code deployment).

---

## Stripe setup

- Free tier: no payment required
- Premium: $14.99/month; 1-month free trial on first signup; auto-reverts to Free if not upgraded
- Trial reminder notification 3 days before expiry
- **Promotional codes:** implement Stripe coupon/promo code system; codes can apply to Premium subscription or add-on purchases; UI field for promo code entry at checkout
- Add-ons: Stripe products created as placeholders (no content attached yet); purchasable but show "Coming soon" after payment confirmation
- Stripe Customer Portal for subscription management
- Webhook: on payment confirmed → update `user_profiles.role` in Supabase

---

## Database schema (Supabase)

```sql
users (
  id uuid primary key,
  email text unique,
  created_at timestamp default now()
)

user_profiles (
  user_id uuid references users primary key,
  gender text,
  age integer,
  role text default 'free',        -- 'free' | 'premium' | 'professional_guided'
  plan_type text default 'standard', -- 'standard' | 'professional_guided'
  track text,                       -- 'menstrual' | 'moon_sync' | 'moon_sync_bridging' | 'weekly_rhythm' | 'no_cycle' | 'gentle_starter'
  weekly_rhythm text,               -- '5-1-1' | '4-2-1' (Protocol 3 only)
  cycle_length integer default 28,
  last_period_date date,
  menopause_mode boolean default false,
  dry_fasting_experience boolean,
  water_fasting_experience boolean,
  goals text[],
  faith_preferences jsonb,          -- placeholder, null for now
  marketing_opt_in boolean default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamp,
  updated_at timestamp default now()
)

fast_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users,
  planned_date date,
  fast_type text,                   -- 'dry' | 'water'
  planned_hours numeric,            -- null if no duration set
  created_at timestamp default now()
)

fast_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users,
  plan_id uuid references fast_plans, -- null if unplanned
  started_at timestamp,
  ended_at timestamp,
  fast_type text,
  planned_hours numeric,
  actual_minutes integer,
  extended boolean default false,   -- true if user extended via +1h button
  created_at timestamp default now()
)

content (
  id uuid primary key default gen_random_uuid(),
  key text unique,                  -- e.g. 'education_duration', 'prep_day_before', 'refeed_day_after', 'food_inhale' etc.
  value text,
  updated_at timestamp default now()
)
```

Row Level Security: users can only read/write their own rows in all tables.
`content` table: readable by all authenticated users; writable by admin only.

---

## Pages (August scope)

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/sign-up` | Signup |
| `/log-in` | Login |
| `/onboarding` | 5-screen onboarding flow |
| `/protocol-0` | Professional-guided referral screen |
| `/dashboard` | Home — today's phase + quick actions |
| `/calendar` | Monthly calendar with phase blocks and planned fasts |
| `/tracker` | Active fasting timer |
| `/account` | Profile, subscription, cycle settings, promo code entry |

---

## Leave out of August build

Do not build these — add after the August cohort:
- Full 11-screen onboarding (screens 6, 7, 9, 10 deferred)
- Faith calendar content and integration (placeholder only)
- Diet-specific prep/refeed guidance (use standard copy for now)
- Courses
- Content library (articles)
- Admin panel UI (use Supabase dashboard directly for August)
- AI chatbot
- Add-on content (slot and Stripe product only)

---

## Security checklist before launch

- [ ] Stripe card data never touches server (Stripe Checkout hosted pages only)
- [ ] Stripe webhooks validated with `stripe-signature` header
- [ ] Supabase RLS enabled on all tables
- [ ] All API keys in environment variables — never in code
- [ ] Health screening answers (Q29, Q29b) treated as sensitive data
- [ ] GDPR: marketing opt-in stored and respected
- [ ] Minimum age 18 enforced at signup

---

## First message to paste into Claude Code

> "You are helping me build a web app called AIR — a cycle-aware fasting calendar. Here is the full build brief. Start by setting up the project structure using Next.js, Supabase, Stripe, Tailwind CSS, and PostHog. Use the design system in this brief: dark obsidian background #0B0B0F, warm ivory text #F6F3EC, Cinzel Light for headings, Inter Light for body. Do not begin building features until the project structure and environment variables are confirmed and working. Ask me one question at a time if you need clarification. The most important feature is the calendar with its phase blocks — we will build that carefully once the foundation is in place."
>
> [paste this entire brief after that message]

