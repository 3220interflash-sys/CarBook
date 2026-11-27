"""Builds a one-file copy of the app for the claude.ai preview (an Artifact), so it can be tried with
features that only work there: the Ask chat's real AI answers and reading fill-up photos.
Run from the project folder:  python3 development/tools/build-preview.py [output.html]
The copy inlines styles.css, strings.js, catalogue.js and app.js; it has no offline helper or install
manifest (the preview does not need them). The live app is unchanged. Publish the output with capabilities
{"sample": {"images": true}} so the page may ask Claude and send it the photos the owner picks."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
html = (root / 'index.html').read_text()
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="(icon|apple-touch-icon)"[^>]*>\n?', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + (root / 'styles.css').read_text() + '\n</style>')
for js in ['strings.js', 'catalogue.js', 'app.js']:
    code = (root / js).read_text().replace('</script', '<\\/script')
    html = html.replace(f'<script src="{js}"></script>', f'<script>\n{code}\n</script>')
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'development' / 'preview' / 'carbook-preview.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print('Wrote', out, f'({len(html) // 1024} KB)')
