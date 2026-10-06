# 18th Man Platform Guide

## Navigation
The sidebar contains all main sections. On mobile, tap the menu icon (top-left) to open it.

## Drill Library (`/drills`)
Browse all drills. Filter by category, difficulty, age group, and player count using the top bar.
- Click a drill to view its full details, YouTube video (if attached), and AI coaching guide.
- Save drills to your personal list using the bookmark icon.
- Rate and comment on drills from the detail page.
- For specific drill content and recommendations, visit /drills directly.

## Drill Designer (`/drills/new`, or `/drills/[id]/edit` for an existing drill)
Build your own drills on an interactive pitch canvas. The tool palette on the left is grouped into Players (attacker, defender, plus the S/M/L player size), Equipment (cone, ball, tackle bag, tackle shield, flag, marker disc, agility ladder), Movement (run, pass, dotted line, kick), Mark-up (zone, label) and Pitch. Undo, Delete and Clear sit at the bottom of the palette. The bar under the canvas holds PNG download, Animate (a keyframe timeline, with Preview & Export), Show/Hide details and Fullscreen.
- Choose a pitch background under Pitch: full pitch, half pitch, grid, or in-goal area. The rotate button turns the pitch vertical.
- Keyboard shortcuts: V select, A attacker, D defender, C cone, B ball, F flag, R run, P pass, K kick, Z zone, T label (tackle bag, tackle shield, marker disc, agility ladder and dotted line have no key). Ctrl+Z (Cmd+Z on Mac) undoes, Delete or Backspace removes the selected piece, and Esc cancels a line you are drawing, clears the selection and returns to Select. On desktop, a tool's tooltip shows its key. Shortcuts work while the pitch or palette has focus; after typing in the details form or using the timeline, the bar under the canvas, a menu or a dialog, click the pitch to use them again.
- Pieces can only be dragged in Select mode (press V or Esc). With a drawing tool active, dragging over a player draws the line instead of moving the player.
- The Drill Details panel on the right can be hidden with "Hide details" in the bar under the canvas. It starts hidden when the window is narrower than 1280px (most tablets), and while it is hidden Save sits in that bar. On screens narrower than 768px the canvas is unavailable and only the details form is shown.
- Set drill metadata: title, category, difficulty, age group, player count.
- Paste a YouTube URL to attach a video — an AI coaching guide is auto-generated.
- Visibility: Public (everyone), "<your club> only" (club members; needs Club access and a club), or Only me (just you).
- Save the drill and come back to edit it later from its page. Clicking a link away from the designer, closing the tab or refreshing with unsaved changes asks you to confirm first.

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
- **AI Coach** (`/chat/ai`) — rugby league specialist. Free users get 5 messages/day; Club tier is unlimited.
- **S&C Specialist** (`/chat/sc`) — strength and conditioning programs.
- **Community** (`/chat/community`) — shared forum threads for all coaches.
- **Direct Messages** (`/chat/dm`) — private 1:1 messages with other coaches.

## My Club (`/clubs`)
Each user belongs to one club. Club admins manage membership, invite users, and configure the club.
- Club-tier benefits: unlimited drills, club-private drills, coaching groups, collaborative sessions, AI guidance, PDF export, unlimited AI chat.
- New users get a 48-hour full-access trial the first time they save a drill.
- Pricing: £19.99/month per club.

## My Groups (`/groups`)
Coaching groups are sub-teams within your club (e.g. Forwards Unit, Attack Group). Requires club membership.
- Go to [My Groups](/groups) and select a group to open its dashboard.
- From a group's dashboard you can access: Game Stats, Squad, Blocks (session plans), AI Guidance, and group settings.
- **Game Stats** — track live match statistics. Navigate there via [My Groups](/groups) → select your group → Game Stats.
- **Squad** — manage player records and reviews. Navigate via [My Groups](/groups) → select your group → Squad.
- **AI Guidance** — analyses training history and suggests the next session focus using GameSenseRL methodology. Navigate via [My Groups](/groups) → select your group → AI Guidance.
- Group admins can invite/remove members and manage the group from the group settings page.

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
- Free tier: unlimited drill designer use (saving starts a one-time 48h trial), unlimited sessions, 5 AI messages/day, community access.
- Club tier (£19.99/month): everything unlimited, coaching groups, collaborative sessions, AI guidance, PDF export.
- Trial: 48-hour full Club access, triggered automatically the first time a free-tier coach tries to save a drill.
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
