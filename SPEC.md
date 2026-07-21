# 18th Man — Product Specification

Rugby league coaching platform for coaches to design drills, plan sessions, and connect with the coaching community.

---

## Features

### Landing Page
- Hero section — rugby league imagery, app pitch
- Feature highlights with screenshots
- Social proof (coach count, drill count)
- Sign up / Log in CTAs

### Auth (Supabase)
- Email + password sign up / login
- Social login: Google, Facebook, Apple, GitHub
- Password reset via email
- Session managed by Supabase JWT

### User Profile
- Avatar, display name, bio
- Club / team affiliation
- Coaching level / experience
- Coaching qualifications / certs
- Social media links (Twitter/X, Facebook, Instagram, YouTube, LinkedIn)
- Public profile URL: `/profile/[username]`

### Coach Chat — 3 modes
- **AI Assistant** — streaming chat with rugby league AI coach. Each conversation has a title. Conversations saved to history.
- **Direct Messages** — 1:1 conversations between coaches. Real-time via Supabase subscriptions.
- **Community Discussions** — forum-style threads. Any coach can start a topic, others reply.

### Drill Library
- Browse / search / filter by category
- Categories editable by Admin
- Each drill: title, description, category, visual diagram, difficulty, age group, player count
- Comments + ratings per drill
- Share / save to personal collection
- **YouTube Import** — paste a YouTube URL, system fetches the transcript, AI generates a structured coaching guide (overview, coaching points, how to perform, key cues, variations). Video embeds on the drill detail page alongside the AI guide.

### Drill Designer
- React Konva canvas — rugby pitch backgrounds
- Players, arrows, equipment, zones, text
- Equipment icons: Tackle Bag, Tackle Shield, Flag/Pole, Marker Disc, Agility Ladder
- Agility Ladder is resizable — drag a corner handle to stretch it; rungs recount automatically
- Fullscreen mode — expands canvas to fill the browser window; floating Save button stays accessible
- Persistent player icon size — set S/M/L once; all subsequent placements use that size; changing size also resizes the currently selected player
- Undo/redo, save as drill, export PNG/PDF
- Desktop-first, tablet-accessible

### Session Planner
- Build ordered session from drill library
- Assign time per drill segment
- Export session as PDF
- Share session with other coaches

### Admin Panel
- Manage users — view, role assignment, suspend
- Admin user notes — private per-user notes visible only to admins (stored in `admin_user_notes` table)
- Content Engine — AI-generated social media posts (tip / drill / thought / announcement) tailored per platform (X, Facebook, Instagram, LinkedIn), admin-only
- Manage drill categories — add / edit / delete / reorder
- Moderate community discussions
- Site stats dashboard
- Shop — create, edit, publish/unpublish, delete sellable products (see below)

### Shop
- Public storefront (`/shop`, `/shop/[id]`) — no account required to browse or buy
- Products (PDFs, videos, bundles) sold one-time, unlocked by subscription tier, or both
- Guest checkout via Stripe — no account required; download link emailed after payment
- Logged-in members download instantly from `/shop/library`; already-included-by-tier and already-purchased items both resolve to instant download
- Refunding a purchase in Stripe revokes the buyer's access
- Admin CRUD at `/admin/shop` — create/edit products, upload PDF/video content, publish/unpublish, delete

---

## Roles & Permissions

| Feature                  | Admin | Coach | Viewer    |
|--------------------------|-------|-------|-----------|
| Browse drills            | ✅    | ✅    | ✅        |
| Create / share drills    | ✅    | ✅    | ❌        |
| Use drill designer       | ✅    | ✅    | ❌        |
| Rate & comment drills    | ✅    | ✅    | ❌        |
| AI coaching chat         | ✅    | ✅    | ❌        |
| Direct messages          | ✅    | ✅    | ❌        |
| Community discussions    | ✅    | ✅    | Read only |
| Session planner          | ✅    | ✅    | ❌        |
| Edit drill categories    | ✅    | ❌    | ❌        |
| Manage users & roles     | ✅    | ❌    | ❌        |
| Moderate content         | ✅    | ❌    | ❌        |

---

## Database Schema (Supabase Postgres)

```
profiles              — id, username, display_name, avatar_url, bio, club, coaching_level, role
social_links          — user_id, platform, url
drill_categories      — id, name, slug, order, created_by (admin)
drills                — id, title, description, category_id, canvas_json, preview_image_url, author_id, difficulty, age_group, player_count
drill_ratings         — drill_id, user_id, rating, comment
conversations         — id, title, type (ai | dm | community), created_by
conversation_participants — conversation_id, user_id
messages              — id, conversation_id, sender_id, content, created_at
session_plans         — id, title, coach_id, drills_order (jsonb), total_duration
admin_user_notes      — user_id, note, updated_at (admin-only; separate from profiles to keep out of user-readable RLS)
products              — id, title, description, content_type (pdf|video|bundle), price_cents, min_subscription_tier, storage_path, preview_image_url, is_published, created_by
purchases              — id, user_id (nullable), guest_email (nullable — one of the two is always set), product_id, stripe_checkout_session_id, stripe_payment_intent_id, status (completed|refunded), amount_paid_cents
```

---

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui
- **Auth & DB**: Supabase (Postgres + Auth + Realtime)
- **Drill Designer**: React Konva
- **AI Chat**: Vercel AI SDK + AI Gateway
- **Deployment**: Vercel
