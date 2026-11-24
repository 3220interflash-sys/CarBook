# Sri Lanka rules check (24 November 2026)

What the app tells owners to do when papers are due, checked against Sri Lankan sources.
The official pages (dmt.gov.lk, motortraffic.wp.gov.lk, Divisional Secretariat sites) could not be opened from Claude's workspace, so findings rest on search summaries of them plus press and guide sites. Items marked **confirm** should be checked with the Department of Motor Traffic (DMT) or a Divisional Secretariat before launch.

## Findings and what changed in the app

| Topic | What we found | Change |
|---|---|---|
| Emission test (VET) is needed to renew the revenue licence | Confirmed: gazette 1533/17 (2008) made the emission certificate a condition of the revenue licence. | Wording now says "a valid certificate each year to renew". |
| Electric vehicles exempt | Confirmed by the DMT page and every other source. | None. |
| Hybrids exempt | **Conflicting.** The DMT's own page says electric and hybrid vehicles are exempt from the emission certificate for the revenue licence, and LAUGFS Eco Sri (a testing operator) says the same in 2026. Two 2026 guide sites (CarDreams, Induwara) say hybrids must test. No gazette found either way. **Confirm.** | Kept the exemption (it matches the DMT page), but the app and website now tell hybrid owners to check before renewal. |
| How long the emission certificate is valid | **Unclear**: sources say 6 months or one year. **Confirm.** | The app no longer gives a period; it says to test shortly before the licence is due so the certificate is still valid. |
| Brand-new vehicles exempt in their first year | One blog only. **Confirm** before using. | Not added. |
| Revenue licence documents | Registration certificate (CR), last year's licence, insurance certificate, emission certificate; fitness certificate for commercial vehicles (lorries, buses). | Added to "What to do". |
| Online renewal (eRL) | Available for cars, motorcycles, dual-purpose, land vehicles and three-wheelers; not for licences more than two years overdue. | Added the two-year limit. |
| Late renewal | A penalty applies (one 2026 guide gives 10% within 3 months, 20% up to 12 months, 30% after; **confirm** the figures). | App says "renewing late adds a penalty", without figures. |
| Insurance | Third-party cover is compulsory; the certificate is needed for the revenue licence. | Wording made precise; added "make sure new cover starts before the old one ends". |
| Driving licence | Valid 8 years; needs an NTMI medical certificate obtained within about 6 months; renew at DMT Werahera or a district office with the current licence and NIC. | Added to the app. |
| Tyres | The law requires tyres in a fit condition; no clear mm figure found in Sri Lankan law. 1.6 mm is the common international minimum; about 3 mm is widely advised for wet roads. | App now gives these as tyre-shop advice, not as law. |

## Maintenance intervals
The defaults in `INTERVALS` (oil 5,000 km or 6 months, battery check from 3 years, alignment 10,000 km or 12 months, brake fluid and coolant 2 years, and so on) are on the cautious side, which suits Sri Lanka's heat, traffic and dusty roads. They are always shown as defaults with "follow your owner's manual", as the project rules require. No changes.

## Dashboard lights
The advice is general and cautious (red: stop safely and get professional help; check the owner's manual). Nothing Sri Lanka-specific to change.

## Sources
- Department of Motor Traffic, Vehicle Emission Testing: https://dmt.gov.lk/index.php?option=com_content&view=article&id=57&Itemid=174&lang=en
- LAUGFS Eco Sri, Electric and hybrid vehicles 2026 guide: https://www.ecosri.lk/electric-hybrid-vehicles-in-sri-lanka-do-they-still-need-an-emission-test-2026-guide/
- CarDreams, Revenue licence and road tax 2026: https://cardreams.lk/guides/revenue-licence-road-tax-sri-lanka-2026
- Induwara emission test fee calculator: https://induwara.lk/tools/sri-lanka-vehicle-emission-test-fee-calculator
- Western Province Motor Traffic, Revenue licence: https://motortraffic.wp.gov.lk/si/?page_id=860&lang=en
- Kotte Divisional Secretariat, Vehicle revenue licence: http://kotte.ds.gov.lk/index.php/en/service/v.html
- Akuressa Divisional Secretariat, renewal documents: http://www.akuressa.ds.gov.lk/images/PDF/Vehicle_Revenue_License_Renewal.pdf
- readme.lk on eRL limits: https://readme.lk/electronic-revenue-licensing-system-down-again/
- MotorGuide, renewing the revenue licence: https://motorguide.lk/en/news-advice/lets-bring-the-revenue-license-home-in-3-days
- Lanka Websites, renewal process 2026 (penalty tiers): https://lankawebsites.com/blog/automobiles/vehicle-registration-renewal-process-in-sri-lanka-2026
- Driving licence in Sri Lanka (Wikipedia): https://en.wikipedia.org/wiki/Driving_licence_in_Sri_Lanka
- MotorGuide, renewing a driving licence: https://motorguide.lk/en/news-advice/renew-sri-lankan-driving-license
- Tyre rules: https://tyremap.com/tyre-laws/sri-lanka/ and https://lankawebsites.com/blog/automobiles/ultimate-guide-to-tyre-care-on-pothole-ridden-sri-lankan-roads-2026
