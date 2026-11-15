# Builds pillars-colours.html: the "Four pillars" logo in eight colour options. Render with make-pillars-colours.js.
import math
src = open('build-round2.py').read()
exec(src[:src.index('# ---- Pulse')])  # gives sheet()
CX, CY, R, RING = 256, 282, 150, 44
RO, RI = R + RING / 2, R - RING / 2
DEG = 360 / (2 * math.pi * R); SEG, GAP, START = 160 * DEG, 22 * DEG, 135
P = lambda d, r: (CX + r * math.cos(math.radians(d)), CY + r * math.sin(math.radians(d)))
f = lambda p: f'{p[0]:.2f} {p[1]:.2f}'
sector = lambda a0, a1: f'M{f(P(a0, RO))} A{RO} {RO} 0 0 1 {f(P(a1, RO))} L{f(P(a1, RI))} A{RI} {RI} 0 0 0 {f(P(a0, RI))} Z'
def mark(tile, segs, needle, edge=None):
    e = f' stroke="{edge}" stroke-width="8"' if edge else ''
    out = f'<rect x="4" y="4" width="504" height="504" rx="116" fill="{tile}"{e}/>'
    out += ''.join(f'<path d="{sector(START + i * (SEG + GAP), START + i * (SEG + GAP) + SEG)}" fill="{segs[i]}"/>' for i in range(4))
    return out + f'<path d="M256 282 L352 232" stroke="{needle}" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="282" r="30" fill="{needle}"/>'
def opt(n, name, why, tile, segs, needle, pal, palDark, dark, hero, sw, edge=None):
    return dict(tag=f'Option {n}', name=name, why=why, svg=mark(tile, segs, needle, edge), pal=pal, palDark=palDark, dark=dark, hero=hero, sw=sw)
L = lambda c: [c] * 4
cols = [
 opt(1, 'Navy and lime', 'The chosen colours. Fresh, modern and clearly “all in the green”.', '#0F172A', L('#A3E635'), '#FFFFFF', '#65A30D', '#A3E635', '#0F172A', '#E9EEF6',
     [['#0F172A','#fff'],['#A3E635','#0F172A'],['#65A30D','#fff'],['#FFFFFF','#0F172A']]),
 opt(2, 'Four colours', 'Each segment gets its own colour: reminders, service, fuel and costs, warranties. The same colours can label those areas in the app.', '#0F172A',
     ['#A3E635','#22D3EE','#FBBF24','#A78BFA'], '#FFFFFF', '#65A30D', '#A3E635', '#0F172A', '#E9EEF6',
     [['#A3E635','#0F172A'],['#22D3EE','#0F172A'],['#FBBF24','#0F172A'],['#A78BFA','#0F172A']]),
 opt(3, 'Night drive', 'Deep navy with electric cyan. Calm, techy and premium, like a banking app.', '#0B1026', L('#22D3EE'), '#FFFFFF', '#0891B2', '#22D3EE', '#0B1026', '#E6F4FA',
     [['#0B1026','#fff'],['#22D3EE','#0B1026'],['#0891B2','#fff'],['#FFFFFF','#0B1026']]),
 opt(4, 'Sunset', 'Black with segments that warm from orange to pink. Bold and youthful; stands out on Instagram.', '#0B0B0F',
     ['#FF7A18','#FF5A3D','#FF3E5E','#FF2E7E'], '#FFFFFF', '#E11D63', '#FF5A6E', '#0B0B0F', '#FFEFF4',
     [['#0B0B0F','#fff'],['#FF7A18','#0B0B0F'],['#FF2E7E','#fff'],['#FFEFF4','#BE185D']]),
 opt(5, 'Forest and gold', 'Deep green with goldfish yellow, the colours CarBook started with. Warm, trusted and local.', '#0B3D2E', L('#FFC425'), '#FFFFFF', '#0A7F55', '#FFC425', '#0B3D2E', '#E8F3EE',
     [['#0B3D2E','#fff'],['#FFC425','#0B3D2E'],['#0A7F55','#fff'],['#FFFFFF','#0B3D2E']]),
 opt(6, 'Indigo and coral', 'Rich indigo with soft coral. Friendly and a little playful, still classy.', '#312E81', L('#FF8A80'), '#FFFFFF', '#4F46E5', '#FF8A80', '#1E1B4B', '#EEF0FF',
     [['#312E81','#fff'],['#FF8A80','#312E81'],['#4F46E5','#fff'],['#FFFFFF','#312E81']]),
 opt(7, 'Royal blue and sky', 'Strong blue with light sky blue. Feels safe, official and trustworthy, like a bank or insurer.', '#1D4ED8', L('#BAE6FD'), '#FFFFFF', '#1D4ED8', '#7DD3FC', '#0C1E4A', '#E0ECFF',
     [['#1D4ED8','#fff'],['#BAE6FD','#0C1E4A'],['#0C1E4A','#fff'],['#FFFFFF','#1D4ED8']]),
 opt(8, 'Clean white', 'A white icon with green segments and a navy needle. The lightest, cleanest feel; looks good on any phone wallpaper.', '#FFFFFF', L('#16A34A'), '#0F172A', '#16A34A', '#4ADE80', '#0F172A', '#EEF1F4',
     [['#FFFFFF','#16A34A'],['#16A34A','#fff'],['#0F172A','#fff'],['#4ADE80','#0F172A']], edge='#E2E8F0'),
]
sheet('pillars-colours.html', 'MotorPal: colour options',
      'The “Four pillars” logo in eight colour combinations. Same shape; only the colours change. Font: Plus Jakarta Sans.', cols, 'Plus Jakarta Sans', 700)
s = open('pillars-colours.html').read().replace('repeat(8,1fr)', 'repeat(4,1fr)')
s = s.replace(f'width:{640 * 8 + 180}px', f'width:{640 * 4 + 180}px')
open('pillars-colours.html', 'w').write(s)
