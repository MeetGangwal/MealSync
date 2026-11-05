# UI/UX redesign — progress note

Status: **application UI/UX phase ready for review** (uncommitted). GitHub Actions / CI-CD work has not started.

## Design system (`frontend/src/index.css`)
- **Colour:** charcoal surfaces with one lime accent (`#C8F169`).
  - Dark is the default theme; light is an alternative.
  - The theme choice is stored only when the user toggles it, under `mealsync_theme_choice`.
  - In the light theme, accent-coloured text and borders use olive (`--accent-ink`) for contrast. Status colours always come with a text label.
- **Rules:** no gradients, glows or blur. Borders come before shadows. Radii are restrained (6–16 px).
- **Type:** Inter for the interface; Instrument Serif for editorial headings (landing page, greetings, confirmations).
- **Spacing:** 4–64 px scale.
- **Motion:** short transitions (120–320 ms, ease-out):
  - dialog, toast and popover entrance;
  - add-to-cart quantity bump;
  - landing scroll-reveal.
  `prefers-reduced-motion` disables all of them.

## Shared components (`frontend/src/components/Shared.jsx`)
- **Navigation:** Logo, Sidebar, Topbar (with page title), and the `CUSTOMER_NAV` / `ADMIN_NAV` models.
- **Dialogs:** `Modal` renders through a portal. It traps focus, closes on Escape, locks scroll, and returns focus to the opener (or to `#main` if the opener is gone). `ConfirmDialog` asks before consequential actions.
- **Feedback:** `Toaster` (context `showToast`), `EmptyState`, `Spinner`, `ProgressBar`.
- **Food images:** `MealImage` lazy-loads with a fixed aspect ratio. Missing or broken photos fall back to a neutral tile, never a different dish.
- **Orders and slots:**
  - `SlotPicker` groups slots by meal and marks full or ended slots as unavailable.
  - `OrderTimeline` reflects the stored status only.
  - `StatusBadge` always shows a text label.

## Images
- **Sources:** 41 dish photos plus one hero, from Wikimedia Commons, all CC0, public domain, CC BY or CC BY-SA.
- **Processing:** cropped to 800×600 WebP (hero 1440×1200 and 800×600), about 2.8 MB in total, in `frontend/public/images`.
- **Credits:** author, licence and source for each photo are in `src/data/imageCredits.json`. A Photo credits dialog is linked from the landing footer and the app sidebar.
- **Mapping:** `lib/menuImages.js` maps a dish name to its photo. An explicit `https://` or `/` image URL saved on a product takes precedence.
- **No photo:** Cheese Burst Maggi (no accurate free photo was found).
- **Approximate photo:** Mini Meal Thali uses a generic vegetarian thali photo.

## Screens
- **Landing (`pages/LandingPage.jsx`):**
  - hero;
  - how it works;
  - live in-stock dishes from `/api/meals`;
  - the three counters;
  - call to action;
  - footer.
  No invented statistics or testimonials.
- **Sign in / register:** photo panel, inline errors, and a route back to the landing page.
- **Routing:** hash routes (`#/login`, `#/my-orders`, …), so reload and the browser Back button work. Admin routes are navigation only; the server authorises every call.
- **Student screens:**
  - Home leads with the next action;
  - Today's menu shows photos, category counts and a details dialog;
  - checkout is a three-step flow with slot recovery;
  - the confirmation shows the QR ticket and timeline;
  - My orders has filters, confirmed cancellation, "Order these again", and 30 s refresh while orders are active;
  - QR tickets show the server's ticket value;
  - Meal plans;
  - Profile asks before discarding unsaved edits.
- **Staff (`AllOrdersPage.jsx`):**
  - the queue board shows New, Preparing and Ready columns;
  - a counter filter separates the thali counter from other dishes (derived from item category);
  - each order has one next-step action, cancellation asks for confirmation, and the board refreshes quietly every 20 s;
  - a history table with CSV export.
- **Admin:**
  - Product catalog has thumbnails, validated forms, a preview, visibility switches and confirmed deactivation;
  - Counter sale uses real slot labels, accessible payment options and debounced customer search, and its receipt is fixed;
  - Users & roles;
  - report pages from the previous phase.

## Defects fixed along the way
- **Active orders:** cancelled and completed orders counted as active, because of a case mismatch with the server's statuses.
- **Fake success:** cancel and status updates reported success on network failure.
- **Broken features removed:** order rating (no backend), mock notifications, and special instructions (never sent to the server).
- **QR codes:** encoded client-made JSON instead of the server's `qrCodeData`.
- **Counter receipt:** read non-existent fields, so it showed "undefined".
- **Order times:** were shown 5.5 h early. `Order` now exposes `orderTimeUtc`; a test was added.
- **Stale app after deploys:** `nginx.conf` now revalidates `index.html` (security headers kept).

## Verification (latest run)
- **Backend:** `./mvnw verify` passed 114/114 tests.
- **Frontend:** `npm run lint` exits 0 (warnings only); `npm test` passes 22/22; `npm run build` succeeds.
- **Smoke test:** `scripts/smoke-test.sh http://localhost:3080` passed 38/38.
- **Browser checks:**
  - landing at 1440 and 375 px, in both themes;
  - sign-in;
  - student home, menu and full checkout: a cash order placed and then cancelled with the test student;
  - order queue, product catalog and counter sale at desktop size, and the queue at 375 px;
  - no horizontal overflow and no buttons under 32 px tall on the checked pages.

## Known limitations
- The UI/UX notes and reference images mentioned in the brief were not in the workspace. The design follows the principles written in the brief.
- There is no counter-staff role: staff use administrator accounts. Order status is per order, not per counter.
- The server does not check slot times; the UI only hides slots that have ended.
- Notifications are session-local; status updates use polling, not push.
- The JS bundle is about 770 kB (Recharts), and code-splitting was not done. Google Fonts load from a CDN, with system-font fallback.
- Kubernetes still runs the earlier images.

## Next step
Review, then commit. After that, the GitHub Actions / CI-CD phase.
