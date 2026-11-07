# CarBook

A vehicle ownership companion for Sri Lanka. Owners never miss a deadline, keep every service record, and know what to ask their mechanic. The owner is not a developer, so explain technical choices in plain language and keep changes small.

## Run it
Open a terminal in this folder and run `python3 -m http.server 8080`, then visit http://localhost:8080. No build step. Plain HTML, CSS and JavaScript.

## Files
- `index.html`: page shell
- `styles.css`: all styling (design tokens at the top)
- `strings.js`: every word the app shows, in English, Sinhala and Tamil. Missing translations fall back to English
- `app.js`: data, rules, forms and views. Text comes from `strings.js` through `t('key')`, never typed straight into the code
- `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-*.png`: make it installable and work offline. After changing any app file, bump `VERSION` in `sw.js` so phones pick up the new copy. A new file must also be added to `FILES` there

## Product rules
- **Phase 1 (now):** deadlines and renewals, maintenance status with plain explanations, a year-ahead plan with estimated service dates, fuel and spending trends (1 month to 5 years, compared with the period before), service and fuel records, and Ask (a chat about the owner's records, plus questions for the mechanic).
- Estimated service dates use the owner's average km per day from the last year of records. Always label them "estimated".
- Comparisons with an earlier period only show when the records cover all of that period.
- **Phase 2 (later):** selective sharing, verification levels, garage-confirmed entries, maintenance score, buyer tools.
- Deadlines cascade: emission test, then insurance, then revenue licence. Electric and hybrid vehicles are exempt from the emission test.
- Intervals in `INTERVALS` are defaults only. The owner's manual comes first. Never state invented specs as fact.
- The Ask feature suggests questions and never diagnoses. Brakes and tyres always push toward a professional check.

## Phase 2 groundwork already in the data
Every record has `id`, `vid` (vehicle id, separate from any owner), `createdAt`, `source` ("owner" for now; later "receipt" and "garage"), and an optional photo. Keep it that way. Never silently overwrite history: add `updatedAt` and, when sharing arrives, an audit trail. Docs, fuel and service records carry `visibility: 'private'`. Renewing a document keeps the old expiry in `history`.

## Design rules
The app is for owners who are not vehicle experts and want to know they are doing everything right. Plain words, one clear next step, details only when asked.
- White background. Green (`--green`) for the brand and main actions; goldfish yellow (`--yellow`) as the highlight (add button, dates, the car card). Red means needs attention now, amber means coming up soon, green means on track, always with a word next to the colour.
- Four tabs: Home (status, to do, year ahead), My car (papers, maintenance, records, settings), Money (fuel and spending), Ask. One yellow + button adds anything.
- Lists show only a name and a status. Everything else (mileage, cost, garage, oil grade) lives in the detail sheet that opens on tap. Every item's detail explains what it is and what to do in plain language (`about_*` and `todo_*` in `strings.js`).
- Plus Jakarta Sans for everything (system fonts are the offline fallback). Flat bordered lists, no gradients or decorative shadows. Sentence case, no all-caps labels, no emoji. Tap targets of 48px or more. Always light (white): the owner chose this, so there is no dark mode. Must work offline and on small phones. Keep Sinhala and Tamil in mind: no fixed-width text, leave room for longer words.

## Next steps, in order
1. Sinhala and Tamil translations. Text is now in `strings.js`; fill in the `si` and `ta` blocks and have a native speaker check them. A language shows in the picker once it has a `langName`.
2. Local reminders: notifications before deadlines (cascading lead times).
3. Photo reading (pump display, odometer, documents): needs a small backend that calls a vision model. Do not put API keys in the browser.
4. Accounts and cloud backup (needed before Phase 2 sharing). Check Sri Lanka data protection rules first.
5. Real AI wording for the Ask feature, still driven by the rules engine for due dates.
6. Package for the Play Store (Capacitor or a trusted web activity) once real users have tested it.

## Known limits
- Data is stored only on this device. Clearing browser data erases it. Export regularly until cloud backup exists.
- No automatic photo reading yet. Fields are typed by hand.
- Fuel economy assumes the tank is filled each time.
- The Ask chat gives real AI answers only inside the claude.ai preview, which lets a page ask Claude. Everywhere else it answers common questions from the records with simple rules (`localAnswer` in `app.js`). Real AI everywhere needs the small CarBook server from step 3; keep `AI_RULES` as its instructions.
- Status colours were checked for readable contrast in light and dark mode. Re-check them if you change them.
