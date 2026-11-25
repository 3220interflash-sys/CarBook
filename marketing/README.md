# Marketing, artwork and decks

Everything we use to show MotorPal to people: the brand, posts, videos, one-pagers, decks and the store listing.
New artwork, posts, videos, decks and listing material go in this folder.

| What | Where |
|---|---|
| Logo (final, "Four pillars", deep mint on black) | `logo/final/` (SVG, PNG, Canva-ready PDF, how-to note) |
| Logo explorations and the Logo Studio | `logo/` and https://claude.ai/artifact/3sof6fvxcFHr7bPCqZVqRo |
| Instagram posts: English (16), Sinhala (16), Tamil (10) | `instagram/posts`, `instagram/posts-si`, `instagram/posts-ta`; captions in `instagram/posts-copy-english.md`, Tamil plan in `instagram/plan-tamil.md` |
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
