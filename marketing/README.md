# Marketing, artwork and decks

Everything we use to show MotorPal to people: the brand, posts, videos, one-pagers, decks and the store listing.
New artwork, posts, videos, decks and listing material go in this folder.

| What | Where |
|---|---|
| Logo (final, "Four pillars", deep mint on black) | `logo/final/` (SVG, PNG, Canva-ready PDF, how-to note) |
| Logo explorations and the Logo Studio | `logo/` and https://claude.ai/artifact/3sof6fvxcFHr7bPCqZVqRo |
| Instagram posts: English (16), Sinhala (16), Tamil (10) | `instagram/posts`, `instagram/posts-si`, `instagram/posts-ta`; captions in `instagram/posts-copy-english.md`, Tamil plan in `instagram/plan-tamil.md` |
| Teaser clip (10 s, 1080 x 1920, no logo or name: a scan line reveals hairline instrument-style icons in thin HUD rings (calendar, chart, check engine, battery, oil, fuel), placed unevenly with some running off the edges; each flares as the scan passes, flickers into focus, then beats like a heartbeat with a ripple ring, while the whole icon layer keeps moving away from the viewer (shrinking toward the centre, softening slightly); then the neon pulse runs across and lights up "Coming soon" letter by letter in thin, widely spaced neon-tube lettering in a cinematic title style (Raleway ExtraLight, 40 px, wide letter spacing; white core with mint glow and haze, each letter flickering on as the dot passes); fades to black) | `coming-soon/motorpal-teaser-clip.mp4`; made from `coming-soon/clip.html`, rebuild with `node marketing/coming-soon/render-clip.js` |
| "Coming soon" story video (10 s, 1080 x 1920: one white dot runs the pulse and draws the gauge, the needle jerks up, then the dot glides off the line, lights the name letter by letter and drops into the label) | `coming-soon/motorpal-coming-soon-story.mp4`; made from `coming-soon/story.html`, rebuild with `node marketing/coming-soon/render-story.js` |
| "Coming soon" still for all socials (neon pulse tracing the gauge, name, Coming soon): square, 4:5 portrait and 9:16 story | `coming-soon/`; rebuild with `node marketing/coming-soon/make.js` |
| LinkedIn launch posts (5, with captions) | `linkedin/posts/`, captions in `linkedin/captions.md`; rebuild with `node marketing/linkedin/make.js` |
| Short videos (three 20-second parts and a 60-second cut) | `video/out/` |
| One-pagers (CarBook and MotorPal versions) | `one-pager/` |
| Google Play listing text and images | `play-store/` |
| Investor deck | https://claude.ai/artifact/EZeDmWJobdKvvpjmXynyx5 (private until shared) |
| Executive summary | https://claude.ai/artifact/5vrULRNaNY8dttCR1fCfdz and an earlier version at https://claude.ai/artifact/XFKVcTdgdtJZnHJfFb9G5T |
| Project and marketing plan | see `research/README.md` |

Still in the old CarBook look: the investor deck, the executive summary, the videos, the original one-pager and the Play Store screenshots.

Zip files of the posts (in `instagram/zips/`) are not saved to GitHub; they can be rebuilt with `node marketing/instagram/make.js` (add `si` or `ta` for the other languages).
