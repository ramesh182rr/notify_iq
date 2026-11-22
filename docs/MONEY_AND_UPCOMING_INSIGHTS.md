# Money and upcoming insights

**Status:** Implemented 2026-11-22 (extractor version 1, schema v7). Deterministic and on-device only, with no model or network.

## What it does

From notification text that already passed the privacy gate, NotifyIQ extracts:

- **Money movements:** amount, currency (INR default; USD/EUR/GBP), debit or credit, merchant or counterparty, channel (UPI/card/ATM/bank transfer/wallet) and a spend category.
- **Dated actions:** bill due, subscription renewal, expiry, appointment and task, each with a due date and optional time.
- **Subscriptions:** flagged from renewal or mandate wording and known subscription merchants. Repeat payments with a steady amount and a weekly, monthly, quarterly or yearly spacing are detected from history, with an estimated next date.

Results are stored in `notification_insights` (one row per source event, `ON DELETE CASCADE`), so deleting, expiring or clearing a notification removes its insight. Migration v7 backfills existing history.

UI:
- **Insights → Money:** spent, received and net for 7 days, this month or 30 days; spending by category; top places; subscriptions and repeat payments; recent payments.
- **Insights → Coming up:** items grouped Overdue, This week and Later.
- **Home:** a "Coming up" card and a "This month" card.

Each item links back to its source, and users can mark it **Not a payment** or **Not relevant**. That removes it from totals and lists but keeps the notification. Optional reminders ("Day before, 9 AM", "Morning of, 9 AM", "1 hour before") use generic lock-screen text and their own alarm identity, and are rescheduled after reboot.

## Categories and money dashboard (extractor v2, schema v8)

**Spending categories:** food & dining, snacks & cafés, groceries, fuel, transport, tickets & travel, movies & fun, subscriptions, shopping, bills & recharges, rent & home, health, education, personal care, loans & insurance, investments, sent to people, cash, other.

**Income categories:** salary, refunds, cashback & rewards, interest & dividends, from people, other income.

`MoneyCategorizer` checks the merchant first, then message keywords. Specific categories come before general ones. Keywords of 4 characters or fewer must equal a whole merchant word ("ola" never matches "Coca-Cola", "vi" never matches "Ravi").

**User corrections:** any payment can be recategorised, optionally "always for this place". That stores a local merchant rule in `app_preferences` (`merchant_categories_v1`). Per-payment overrides live in `notification_insights.category_override`. Stored insights are recomputed automatically when `InsightExtractor.VERSION` changes; overrides and dismissals are kept.

**Insights → Money** (`moneyAnalytics`):
- Money out and in, each compared with the previous period of equal length.
- Net, count and per-day average, plus a month-end projection once at least 3 days of the month have passed.
- A Spending | Income toggle with a category treemap and expandable category rows showing their top 3 places.
- A daily money-flow chart with in and out on separate labelled scales, so one salary credit does not flatten everyday spending.
- A month calendar heatmap.
- Weekday and time-of-day spending patterns.
- "Did you know" cards: biggest payment, biggest day, most frequent place, small spends under ₹200, weekend share.
- Subscriptions, and a recent payments list with category editing.

All charts are built from plain React Native Views, so no native chart dependency was added.

**Category accuracy** (`MoneyCategoryEvaluationTest`, 56 synthetic spend and income alerts written before running): first run 55/56 correct (0.982). The only miss was a "reversed … for failed transaction" credit, which the failed-payment guard had blocked; completed reversals are now allowed through. After the fix: 1.000. The build gate is ≥ 0.90.

## Accuracy approach

Precision comes first: when a message is ambiguous, nothing is extracted. Explicit negatives include:
- balances, available or credit limits, and minimum-due lines;
- offers, cashback promotions, coupons, "save ₹…" and pre-approved loans;
- failed, declined or "couldn't process" payments;
- future or requested money ("will be debited", "to be paid", "you'll be charged after the trial", collect requests);
- UPI counterparty wording ("debited … credited to x@upi" is a debit);
- Hinglish direction ("X ne ₹500 bheje" is money in; "aapne … bheje" is money out).

Day-first numeric dates are assumed (Indian convention). Dates without a year resolve to the next occurrence, allowing up to 30 days in the past. Weekday names and today/tomorrow/"in N days" are supported. Hindi "kal" is deliberately ignored because it is ambiguous (yesterday or tomorrow).

## Evaluation (JVM, `InsightExtractionEvaluationTest`)

Synthetic labelled notifications in English, Hindi and Hinglish:
- **Dev:** 88 cases, used for tuning, and gates the build.
- **Holdout:** 40 cases, written before tuning.
- **Holdout 2:** 30 cases, written after the first round of fixes but before running them.

| Set | Money P / R | Amount acc. | Direction acc. | Merchant acc. | Action P / R | Due-date acc. |
|---|---|---|---|---|---|---|
| Holdout, first unseen run | 0.933 / 0.875 | 1.000 | 0.929 | 1.000 | 1.000 / 1.000 | 1.000 |
| Holdout 2, first unseen run | 0.846 / 0.917 | 1.000 | 1.000 | 1.000 | 0.917 / 0.846 | 1.000 |
| Dev / Holdout / Holdout 2 after generic fixes | 1.000 / 1.000 | 1.000 | 1.000 | 1.000 | 1.000 / 1.000 | 1.000 |

**The first-run rows are the honest estimate for phrasing the rules have not seen.** Amounts and dates were never misread when detected. Errors were about whether a message should count: a future charge or a failed payment counted as spend, or a new phrasing was missed. All sets are now tuned, so the next unbiased number must come from a fresh set or from real-device feedback. The remaining known gap is two subscription flags where only a brand name signals the subscription; recurring-payment detection covers those over time.

## Platform limitation (Android 15+)

Android 15 marks notifications it considers OTP-like as sensitive and hides their text from third-party listeners. On the API 35 emulator this was triggered by standalone 4–8 digit numbers or short alphanumeric codes such as "A/c XX1234", "A/c ending 1234", "card ending 4455" and "code SAVE150". The same alert without that token was delivered. NotifyIQ cannot opt out: the exempting permission is reserved for system roles. These events are discarded per R-012. As a result, many direct bank SMS-style alerts may be missing on Android 15+, while payment-app alerts ("₹180 paid to Swiggy"), bills, renewals, expiries and appointments mostly arrive. The Money screen states this. Behaviour on Samsung and other OEM builds is unverified.

## Not covered yet

- Travel bookings (flights, trains) as dated items.
- Generic meetings without "meeting with/on/at".
- Weekday names without a preposition in some phrasings.
- Currency conversion.
- Budgets.
- Per-merchant user corrections (only dismissal exists).
