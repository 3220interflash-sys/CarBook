# Development

How the app and website are built, and the tools we use while building them.

## Where the code lives
The app's own files stay in the main folder, not in here: `index.html`, `app.js`, `strings.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, the icons and `privacy.html`.
They have to stay there because the live app address (https://3220interflash-sys.github.io/CarBook/) and every phone that has installed the app load them from that spot. Moving them would break the link and installed copies.

The public website is in `website/` (live at https://3220interflash-sys.github.io/CarBook/website/).

`CLAUDE.md` in the main folder explains how the app is organised and the rules it follows.

## Tools
| Tool | What it does |
|---|---|
| `tools/app-screenshots.js` | Retakes the six app screenshots the website shows. Start the app with `python3 -m http.server 8080`, then run `node development/tools/app-screenshots.js`. |

New development notes, scripts and technical plans (for example the photo-reading server or the Play Store packaging) go in this folder.
