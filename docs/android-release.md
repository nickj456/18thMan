# Releasing the Android app

The Android app is a **Trusted Web Activity (TWA)**: a small Android package that opens
18thman.app full-screen in Chrome, with no URL bar. There's no second codebase. Website
deploys reach the app instantly, and you only rebuild the Android package to change its
name, icon or start URL.

**It's consumption-only.** Google Play requires Play Billing for digital subscriptions
sold inside an app, so the app hides every way to buy: pricing, Stripe checkout, the
billing portal, shop purchases and upgrade links. Coaches who already pay sign in and
keep their tier. New subscriptions happen on the website. How that works is in
`web/src/lib/app-shell.ts`.

| Setting | Value |
|---|---|
| Package ID | `app.eighteenthman.twa` — **permanent once uploaded** |
| Start URL | `/dashboard?source=twa` — the `source=twa` is what hides purchases |
| Host | `18thman.app` |
| App name / launcher name | `18th Man — Rugby League Coaching` / `18th Man` |
| Theme colour / background / nav bar | `#e8560a` / `#0a0a0a` / `#0a0a0a` |
| Display / orientation | `standalone` / `default` (lets tablets rotate for the designer) |
| Notification delegation | Off (the site doesn't send web push yet) |

## 1. Before you start

- [ ] **Account deletion. This blocks submission.** Play requires apps with sign-up to
  let users delete their account in the app *and* through a web link. The privacy policy
  says "delete your account at any time from your profile settings", but no such
  feature exists yet; only admins can delete users. Build it first.
- [ ] Google Play developer account ($25 one-off). If it's a *personal* account created
  after Nov 2023, Google requires a closed test with 12+ testers for 14 days before you
  can publish to production. An *organisation* account (needs a D-U-N-S number) skips
  this. Check the current rule in Play Console.
- [ ] This branch is merged and deployed. Check these respond:
  `https://18thman.app/manifest.webmanifest`, `/offline`, `/sw.js`.

## 2. Build the app package

**Easiest: PWABuilder.** Go to <https://www.pwabuilder.com>, enter `https://18thman.app`,
then choose *Package for stores → Android → Generate package*. Under **Options**, enter
the values from the table above. Then:

- Signing key: **Create new**. The zip you download contains the `.aab` (upload this
  to Play), `signing.keystore`, and `signing-key-info.txt` with its passwords.
- **Store the keystore and passwords in your password manager, outside the repo.**
  Every future update must be signed with it. `.gitignore` blocks `*.keystore`, `*.aab`,
  `signing-key-info.txt` and `android-app/`, but don't rely on that.

**Alternative: Bubblewrap CLI.** This needs JDK 17 and the Android SDK; the CLI offers
to install both. Run it in a folder outside the repo, or in `android-app/`, which is
ignored:

```bash
npx @bubblewrap/cli init --manifest https://18thman.app/manifest.webmanifest
# answer the prompts with the table above, then:
npx @bubblewrap/cli build
```

## 3. Upload to Play Console

1. Create the app: Sports category, free.
2. Keep **Play App Signing** on (the default). Google holds the real signing key; your
   keystore becomes the *upload* key, and Google support can reset it if lost.
3. Upload the `.aab` to **Internal testing** first, then Closed testing (if your account
   needs it), then Production.

## 4. Connect the app to the site (asset links)

Without this, the app opens with a browser URL bar across the top.

1. In Play Console, go to **Test and release → App integrity → App signing** and copy
   the **SHA-256** of the *App signing key certificate*. If you'll install test builds
   outside Play, also copy the upload key's SHA-256 (from `signing-key-info.txt` or the
   same page).
2. In Vercel → Project → Settings → Environment Variables (Production), add:
   `ANDROID_TWA_SHA256_FINGERPRINTS` = `AA:BB:…,CC:DD:…` (comma-separated).
3. Redeploy, then check: `curl https://18thman.app/.well-known/assetlinks.json`.
   It returns 404 until a valid fingerprint is set. Malformed entries are logged and
   skipped.

## 5. Store listing

- Privacy policy: `https://18thman.app/legal/privacy`
- Account deletion URL: whatever step 1 produces
- **Data safety** form, as far as the codebase shows:
  - Collected: email, name and profile, user content (drills, sessions, messages,
    uploaded videos for analysis), app activity (Vercel Analytics).
  - Payments go through Stripe on the website only, never in the app.
  - Data is encrypted in transit, and users can request deletion.
- Target audience: adults (coaches). Choosing under-13s brings in the Families policy.
- Assets: 512×512 icon (`web/public/icons/icon-512.png`), a 1024×500 feature graphic,
  and at least 2 phone screenshots.

## 6. Test on a real device (internal track)

- [ ] Opens with no URL bar. If you see a URL bar, the fingerprints are wrong (step 4).
- [ ] `/pricing` shows "Plans and purchases aren't available in the Android app".
- [ ] The sidebar shows **My Library**, not **Shop**.
- [ ] Settings has no *Manage billing* or *View plans*.
- [ ] The chat limit, coaching groups and drill-save prompts show no upgrade links.
- [ ] `/clubs` (with no club) has no create or upgrade buttons.
- [ ] `/sessions` at the free limit has no "Upgrade your club" button.
- [ ] `/analysis` (Coaching Eye) shows "can't be placed in the Android app" instead of the request form.
- [ ] In airplane mode, opening a page shows the "You're offline" screen.
- [ ] Open a `18thman.app` link from Gmail: it opens in the app with purchases still
  hidden (Chrome's `android-app://` referrer covers deep links).
- [ ] The same phone's normal Chrome browser still shows pricing, so the app flag
  hasn't leaked out of the app.

## Known gaps

- **The AI coach can still mention prices.** `api/chat/route.ts`'s system prompt
  describes tiers and prices, and it doesn't know which shell it's in. That's low risk,
  but if a reviewer flags it, send the shell flag with chat requests.
- The Play Designer opens in a new tab, which on Android means Chrome, outside the app.
- Users can't upgrade in the app. If Android turns out to matter, look at Play's UK
  *user choice billing*, or Play Billing through the Digital Goods API, to add in-app
  upgrades. Either means running a second billing system alongside Stripe in
  `getEffectiveTier`.
