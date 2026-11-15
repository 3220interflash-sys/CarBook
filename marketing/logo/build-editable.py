# Writes clean, layered, editable SVG files of the MotorPal logo into editable/.
import math
NAVY, LIME, W, INK = '#0F172A', '#A3E635', '#FFFFFF', '#0B0B0F'
# Settings chosen by the owner in the Logo Studio.
MOUTH, RING, HW, DOT, GAP_PX, PARTS = 27, 42, 19, 22, 22, 4
CX, CY = 244, 256
RO, RI = 150 + RING / 2, 150 - RING / 2
def P(deg, r): t = math.radians(deg); return (CX + r * math.cos(t), CY + r * math.sin(t))
f = lambda p: f'{p[0]:.2f} {p[1]:.2f}'
GAP = GAP_PX / (2 * math.pi * 150) * 360
SEG = (360 - 2 * MOUTH - (PARTS - 1) * GAP) / PARTS
START = MOUTH
def sector(a0, a1):
    return (f'M{f(P(a0, RO))} A{RO} {RO} 0 0 1 {f(P(a1, RO))} L{f(P(a1, RI))} '
            f'A{RI} {RI} 0 0 0 {f(P(a0, RI))} Z')
segments = [sector(START + i * (SEG + GAP), START + i * (SEG + GAP) + SEG) for i in range(PARTS)]
def hand(deg, side):
    t = math.radians(deg); u = (math.cos(t), math.sin(t)); n = (side * math.sin(t), -side * math.cos(t))
    L = math.sqrt(RO ** 2 - HW ** 2)
    pts = [(CX, CY), (CX + n[0] * HW, CY + n[1] * HW), (CX + n[0] * HW + u[0] * L, CY + n[1] * HW + u[1] * L), (CX + u[0] * RO, CY + u[1] * RO)]
    return 'M' + ' L'.join(f(p) for p in pts) + ' Z'
names = ['Reminders', 'Service records', 'Fuel and costs', 'Warranties']
def mark(tile=True, ink=W):
    out = []
    if tile: out.append(f'  <rect id="tile" width="512" height="512" rx="120" fill="{NAVY}"/>')
    out.append('  <g id="dial">')
    out += [f'    <path id="segment-{i + 1}-{names[i].lower().replace(" ", "-")}" d="{d}" fill="{LIME}"/>' for i, d in enumerate(segments)]
    out.append('  </g>')
    out.append(f'  <g id="hands" fill="{ink}">\n    <path id="hand-lower" d="{hand(MOUTH, 1)}"/>\n    <path id="hand-upper" d="{hand(-MOUTH, -1)}"/>\n  </g>')
    out.append(f'  <circle id="centre-dot" cx="{CX}" cy="{CY}" r="{DOT}" fill="{ink}"/>')
    return '\n'.join(out)
HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- MotorPal logo. Colours: navy #0F172A, lime #A3E635, white #FFFFFF. Font for the name: Plus Jakarta Sans Bold (free from Google Fonts). -->\n'
def word(x, y, size, motor, pal):
    return (f'  <text id="name" x="{x}" y="{y}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="700" font-size="{size}" letter-spacing="{-0.04 * size:.1f}">'
            f'<tspan fill="{motor}">Motor</tspan><tspan fill="{pal}">Pal</tspan></text>')
files = {
 'motorpal-icon.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n{mark()}\n</svg>\n',
 'motorpal-mark-only.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n<!-- The mark without its tile, for use on dark backgrounds. -->\n{mark(tile=False)}\n</svg>\n',
 'motorpal-logo-light.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="400" viewBox="0 0 1360 400">\n  <rect id="background" width="1360" height="400" fill="#FFFFFF"/>\n  <g id="icon" transform="translate(40 40) scale(0.625)">\n{mark()}\n  </g>\n{word(410, 262, 190, INK, "#65A30D")}\n</svg>\n',
 'motorpal-logo-dark.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="400" viewBox="0 0 1360 400">\n  <rect id="background" width="1360" height="400" fill="{NAVY}"/>\n  <g id="icon" transform="translate(40 40) scale(0.625)">\n{mark(tile=False)}\n  </g>\n{word(410, 262, 190, W, LIME)}\n</svg>\n',
}
for name, svg in files.items(): open('editable/' + name, 'w').write(svg)
print(list(files))
