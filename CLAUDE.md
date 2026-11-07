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
- **Phase 1 (now):** document vault with expiry reminders, fuel log, service log with oil details, component condition, "Ask" questions for the mechanic, cost summary.
- **Phase 2 (later):** selective sharing, verification levels, garage-confirmed entries, maintenance score, buyer tools.
- Deadlines cascade: emission test, then insurance, then revenue licence. Electric and hybrid vehicles are exempt from the emission test.
- Intervals in `INTERVALS` are defaults only. The owner's manual comes first. Never state invented specs as fact.
- The Ask feature suggests questions and never diagnoses. Brakes and tyres always push toward a professional check.

## Phase 2 groundwork already in the data
Every record has `id`, `vid` (vehicle id, separate from any owner), `createdAt`, `source` ("owner" for now; later "receipt" and "garage"), and an optional photo. Keep it that way. Never silently overwrite history: add `updatedAt` and, when sharing arrives, an audit trail. Docs, fuel and service records carry `visibility: 'private'`. Renewing a document keeps the old expiry in `history`.

## Design rules
Friendly, modern and relaxed, not corporate. Soft mint background, rounded white cards with soft shadows, one green brand colour (from the icon), a bold green "next up" card on Today, colour-coded status pills (green fine, amber soon, red due), a floating tab bar, pill-shaped buttons. Bricolage Grotesque for headings and numbers, DM Sans for text (system fonts are the offline fallback). Sentence case, no all-caps labels, no emoji. Large tap targets (48px or more). Light and dark mode. Must work offline and on small phones. Keep Sinhala and Tamil in mind: no fixed-width text, leave room for longer words.

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
