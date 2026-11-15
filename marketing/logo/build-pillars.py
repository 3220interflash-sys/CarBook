# The final MotorPal logo ("Four pillars"): a gauge whose dial is four segments
# (reminders, service records, fuel and costs, warranties) with a needle in the green.
# Writes clean, layered, editable SVGs into final/.
import math
NAVY, LIME, LIME_DARK, W, INK = '#0F172A', '#A3E635', '#65A30D', '#FFFFFF', '#0B0B0F'
CX, CY, R, RING = 256, 282, 150, 44
RO, RI = R + RING / 2, R - RING / 2
DEG = 360 / (2 * math.pi * R)            # degrees per pixel along the dial
SEG, GAP, START = 160 * DEG, 22 * DEG, 135
P = lambda d, r: (CX + r * math.cos(math.radians(d)), CY + r * math.sin(math.radians(d)))
f = lambda p: f'{p[0]:.2f} {p[1]:.2f}'
def sector(a0, a1):
    return f'M{f(P(a0, RO))} A{RO} {RO} 0 0 1 {f(P(a1, RO))} L{f(P(a1, RI))} A{RI} {RI} 0 0 0 {f(P(a0, RI))} Z'
names = ['reminders', 'service-records', 'fuel-and-costs', 'warranties']
def mark(tile=True):
    o = []
    if tile: o.append(f'  <rect id="tile" width="512" height="512" rx="120" fill="{NAVY}"/>')
    o.append('  <g id="dial">')
    o += [f'    <path id="segment-{i + 1}-{names[i]}" d="{sector(START + i * (SEG + GAP), START + i * (SEG + GAP) + SEG)}" fill="{LIME}"/>' for i in range(4)]
    o.append('  </g>')
    o.append(f'  <path id="needle" d="M256 282 L352 232" stroke="{W}" stroke-width="28" stroke-linecap="round" fill="none"/>')
    o.append(f'  <circle id="hub" cx="256" cy="282" r="30" fill="{W}"/>')
    return '\n'.join(o)
HEAD = ('<?xml version="1.0" encoding="UTF-8"?>\n<!-- MotorPal logo, "Four pillars". The four dial segments stand for reminders, service records, '
        'fuel and costs, and warranties. Colours: navy #0F172A, lime #A3E635, darker green #65A30D, white #FFFFFF. Name font: Plus Jakarta Sans Bold (free, Google Fonts). -->\n')
def word(motor, pal):
    return (f'  <text id="name" x="410" y="262" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="700" font-size="190" letter-spacing="-7.6">'
            f'<tspan fill="{motor}">Motor</tspan><tspan fill="{pal}">Pal</tspan></text>')
files = {
 'motorpal-icon.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n{mark()}\n</svg>\n',
 'motorpal-mark-only.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n<!-- The mark without its tile, for dark backgrounds. -->\n{mark(False)}\n</svg>\n',
 'motorpal-logo-light.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="400" viewBox="0 0 1360 400">\n  <rect id="background" width="1360" height="400" fill="#FFFFFF"/>\n  <g id="icon" transform="translate(40 40) scale(0.625)">\n{mark()}\n  </g>\n{word(INK, LIME_DARK)}\n</svg>\n',
 'motorpal-logo-dark.svg': f'{HEAD}<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="400" viewBox="0 0 1360 400">\n  <rect id="background" width="1360" height="400" fill="{NAVY}"/>\n  <g id="icon" transform="translate(40 40) scale(0.625)">\n{mark(False)}\n  </g>\n{word(W, LIME)}\n</svg>\n',
}
for n, s in files.items(): open('final/' + n, 'w').write(s)
