# NotifyIQ — Google Play listing kit

Prepared 2026-11-22 for version 1.6 (versionCode 7). Everything here describes the current build. Re-check Play Console wording before submitting, because form questions change.

## Assets (`docs/store/graphics/`)

| File | Play field | Size |
|---|---|---|
| `icon-512.png` | App icon | 512×512, 32-bit PNG, same design as the adaptive launcher icon |
| `feature-graphic-1024x500.png` | Feature graphic | 1024×500 |
| `screenshot-1_home.png` … `screenshot-8_privacy.png` | Phone screenshots (2–8) | 1200×2400 (exactly 2:1, within Play's limit) |

The screenshots use **fictional synthetic data only** (`StoreDemoDataSeeder`, an opt-in androidTest). To regenerate:

1. Install the debug app and the test APK.
2. Run `adb shell am instrument -w -e class com.notifyiq.StoreDemoDataSeeder -e notifyiqSeedDemo true com.notifyiq.test/androidx.test.runner.AndroidJUnitRunner`.
3. Capture raw screens.
4. Run `uv run --with pillow python -I docs/store/tools/make_store_assets.py <raw_dir> docs/store/graphics`.
5. Delete the demo history afterwards.

## Store text

**App name (≤30):** `NotifyIQ: Notification History` (30)

**Short description (≤80):** `Private notification history, spending insights and due dates. Stays on phone.` (78)

**Full description (≤4000):**

> NotifyIQ keeps a private, searchable history of the notifications you receive, and helps you understand them, without sending anything off your phone.
>
> **Never lose a notification**
> • Search everything you kept, even after you swiped it away
> • Save, archive or delete items, and filter by app, category or date
> • Group repeats so busy apps don't flood your history
>
> **See where your money goes**
> • Spending and income worked out from your payment alerts
> • Automatic categories: food, snacks & cafés, groceries, fuel, transport, tickets & travel, movies, subscriptions, shopping, bills and more
> • Money-in categories: salary, refunds, cashback, interest and transfers
> • Charts: daily money flow, spending calendar, weekday and time-of-day patterns
> • Spot subscriptions and repeat payments, and fix any category with one tap
>
> **Never miss what's coming up**
> • Bills due, renewals, plan expiries, appointments and tasks found in your notifications
> • Optional reminders before the due date
>
> **Private by design**
> • No internet access: NotifyIQ is installed without Android's internet permission, so it cannot send your data anywhere
> • No account, no ads, no analytics, no AI or cloud processing
> • One-time codes, passwords and card numbers are discarded, never stored
> • Exclude any app, choose how long history is kept, delete anything at any time
> • Optional App lock with your fingerprint, face or PIN
>
> NotifyIQ only sees notifications Android shares with it after you turn on Notification access. Insights are estimates from notification text, not a bank statement. Always check important details with your bank or provider. Android 15 and later hide some bank alerts from apps like NotifyIQ, so money totals can be incomplete.

**Category:** Productivity (alternative: Tools). **Tags:** notification history, notification log, expense tracker, bill reminder, privacy.

**Release notes (1.6):** "Private notification history with money insights, upcoming dates, charts and optional App lock. Everything stays on your phone."

## Play Console answers (verify wording at submission)

- **Privacy policy URL:** host `docs/store/site/privacy-policy.html` (and `terms.html`), for example on GitHub Pages, and paste the URL. **Owner action.** Regenerate with `node --experimental-strip-types docs/store/tools/build-legal-html.mjs` whenever `legalContent.ts` changes.
- **App access:** all functionality is available without login. Reviewer note: "Open the app, tap *Open notification access settings*, allow NotifyIQ, then return. On Android 13+ sideloaded builds may require *Allow restricted settings*; Play installs do not."
- **Ads:** No ads.
- **Data safety:**
  - *Does your app collect or share any of the required user data types?* **No.** NotifyIQ processes notification content only on the device. It has no internet permission and transmits nothing, which matches Play's definition of "not collected".
  - Encryption in transit: not applicable, because nothing is transmitted.
  - Deletion: users can delete all data in-app (Privacy → Delete all notification history) or by uninstalling.
- **Content rating (IARC):** a utility/productivity app. No violence, sexual content, gambling, drugs or user-generated public content; no sharing of location; no in-app purchases. Expect "Everyone"/"3+".
- **Target audience:** 18 and over is recommended (finance-related insights, notification access). This keeps the app outside Families policy obligations.
- **Financial features declaration:** NotifyIQ does not move money, offer loans, provide banking, crypto or investment services, or connect to banks. It only summarises notification text on the device. Choose the option that it provides **no** financial products or services, and re-read the current list before submitting. **Owner decision.**
- **Health apps:** not a health app. Appointments are generic reminders from notification text.
- **Sensitive permissions:** NotifyIQ uses a NotificationListenerService that the user grants in system settings, with in-app education shown before the settings handoff. It does not use SMS, Call Log, Accessibility, location or QUERY_ALL_PACKAGES. `USE_BIOMETRIC` is a normal permission, used only for App lock.
- **News / government / COVID:** No.

## Owner checklist before submission

1. Choose the developer name and support email shown on the listing and in the policy contact section.
2. Host the privacy policy and terms; add the URL in Play Console.
3. Decide markets and governing law, and get the legal text reviewed (`mobile/src/features/legal/legalContent.ts`).
4. Enrol in Play App Signing and upload `dist/NotifyIQ-1.6-release.aab`, signed with the private upload key.
5. Run a closed test track. Use the pre-launch report for crashes, accessibility and Android version coverage.
