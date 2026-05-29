# 18th Man Platform Guide

## Navigation
The sidebar contains all main sections. On mobile, tap the menu icon (top-left) to open it.

## Drill Library (`/drills`)
Browse all drills. Filter by category, difficulty, age group, and player count using the top bar.
- Click a drill to view its full details, YouTube video (if attached), and AI coaching guide.
- Save drills to your personal list using the bookmark icon.
- Rate and comment on drills from the detail page.
- For specific drill content and recommendations, visit /drills directly.

## Drill Designer (`/drills/new`)
Build your own drills on an interactive pitch canvas.
- Choose a pitch background: full pitch, half pitch, in-goal, or blank.
- Place attackers, defenders, cones, balls, arrows, lines, zones, and text labels.
- Set drill metadata: title, category, difficulty, age group, player count.
- Paste a YouTube URL to attach a video — an AI coaching guide is auto-generated.
- Visibility: Public (everyone), Club only (club members), Private (you only).
- Save drafts and return to edit later.

## Session Planner (`/sessions`)
Build and manage training sessions.
- Add drills by searching the library, set duration for each, drag to reorder.
- Total session time is calculated automatically.
- Share a session via a private link — no login required for the recipient.
- Export as PDF (Club tier required).
- Generate an AI summary of any session from its detail page.
- Deliver mode (`/sessions/[id]/deliver`) walks you through each drill in sequence.

## Coach Chat (`/chat`)
Three chat modes:
- **AI Coach** (`/chat/ai`) — rugby league specialist. Free users get 20 messages/day; Club tier is unlimited.
- **S&C Specialist** (`/chat/sc`) — strength and conditioning programs.
- **Community** (`/chat/community`) — shared forum threads for all coaches.
- **Direct Messages** (`/chat/dm`) — private 1:1 messages with other coaches.

## My Club (`/clubs`)
Each user belongs to one club. Club admins manage membership, invite users, and configure the club.
- Club-tier benefits: unlimited drills, club-private drills, coaching groups, collaborative sessions, AI guidance, PDF export, unlimited AI chat.
- New users get a 48-hour full-access trial after creating their 3rd drill.
- Pricing: £19.99/month per club.

## My Groups (`/groups`)
Coaching groups are sub-teams within your club (e.g. Forwards Unit, Attack Group). Requires club membership.
- Group admins can invite/remove members and manage the group.
- Groups share session blocks and collaborative editing.
- Each group has an AI Guidance page that analyses training history and suggests the next session focus (GameSenseRL methodology).
- Game Stats: track live match statistics per group (`/groups/[id]/game-stats`).
- Squad management: manage player records and reviews (`/groups/[id]/squad`).

## Weekly Focus (`/weekly-focus`)
Set a coaching focus for the week to keep sessions aligned.

## Podcasts (`/podcasts`)
Browse and save rugby league coaching podcasts. Play directly in the app.

## Wellbeing (`/wellbeing`)
Access rugby league player and coach wellbeing resources.

## Coaching Eye / Video Analysis (`/analyze`)
Upload and annotate video clips for match and session review.

## Match Reviews (`/my-reviews`)
Create and manage structured match review reports.

## Settings (`/settings`)
Update account preferences, notification settings, and connected accounts.

## Profile (`/profile`)
Edit your public coaching profile — display name, bio, club, coaching level, avatar, and social links.

## Subscriptions & Billing
- Free tier: 20 drills, unlimited sessions, 20 AI messages/day, community access.
- Club tier (£19.99/month): everything unlimited, coaching groups, collaborative sessions, AI guidance, PDF export.
- Trial: 48-hour full Club access, triggered automatically after your 3rd drill.
- To upgrade: visit `/clubs` and ask your club admin, or go to `/settings`.

## Resources
Static reference pages available to all users from the sidebar:
- **Positions Guide** (`/positions`) — coaching focus and responsibilities for every position, from Fullback to Middle Forwards.
- **Age Groups Guide** (`/age-groups`) — skill objectives and development priorities from Under 7s to Under 18s.
- **Fundamental Skills** (`/skills`) — technique breakdowns for Grip/Catch/Pass, Draw & Pass (2v1), and Front-On Tackle.
- **Tag Rugby Rules** (`/tag-rugby`) — full rules for Tag Rugby, useful for junior and modified games.
- **How-to & FAQ** (`/how-to`) — guides and FAQs about using the 18th Man platform.

## Admin (admin users only)
Admin panel at `/admin` — the main admin dashboard.
- **Users** (`/admin/users`) — view, edit roles, manage subscriptions for all users.
- **Clubs** (`/admin/clubs`) — create clubs, manage members, set club admins.
- **Groups** (`/admin/groups`) — manage coaching groups and group admins.
- **Categories** (`/admin/categories`) — add, edit, and reorder drill categories.
- **Drill Approval** (`/admin/drills`) — review and approve or reject submitted drills.
- **Import Playlist** (`/admin/import-playlist`) — bulk-import drills from a YouTube playlist.
- **Email** (`/admin/email`) — compose and send email campaigns to users.
- **Wellbeing** (`/admin/wellbeing`) — manage wellbeing resources.
- **Content Engine** (`/admin/content-engine`) — AI-powered content generation tools.
