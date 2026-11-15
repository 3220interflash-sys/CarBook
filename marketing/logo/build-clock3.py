# Builds clock2.html: Open smile with a centre dot, hands reaching the ends of the dial, one thinner like a clock.
import math
src = open('build-face.py').read().split('A = chomp')[0]
exec(src)
CX, CY = 244, 256
segs = ''.join(ring(CX, CY, LIME, '171 1000', 35, off=-(171 + 22) * i) for i in range(4))
def pt(deg, r): return f'{CX + r * math.cos(math.radians(deg)):.0f} {CY + r * math.sin(math.radians(deg)):.0f}'
def hand(deg, r, w): return f'<path d="M{CX} {CY} L{pt(deg, r)}" stroke="{W}" stroke-width="{w}" stroke-linecap="round"/>'
dot = f'<circle cx="{CX}" cy="{CY}" r="30" fill="{W}"/>'
A = tile(segs + hand(-35, 150, 18) + hand(35, 150, 18) + dot)
B = tile(segs + hand(-35, 150, 24) + hand(35, 150, 24) + dot)
C = tile(segs + hand(-35, 150, 30) + hand(35, 150, 30) + dot)
base = dict(hero='#E9EEF6', dark=NAVY, pal='#65A30D', palDark=LIME,
            sw=[['#0F172A','#fff'],['#334155','#fff'],['#A3E635','#0F172A'],['#E9EEF6','#0F172A']])
cols = [
 dict(base, tag='Version A', name='Fine hands', svg=A, why='Both hands the same, kept fine. The most elegant; the green dial leads.'),
 dict(base, tag='Version B', name='Medium hands', svg=B, why='Both hands the same, a medium weight. Balanced, and still clear at small sizes.'),
 dict(base, tag='Version C', name='Bold hands', svg=C, why='Both hands the same, bold. The mouth reads strongest; the most playful.'),
]
sheet('clock3.html', 'MotorPal: open smile, equal hands',
      'A centre dot, two clock hands that reach the ends of the dial, both the same thickness. The gap becomes the mouth.',
      cols, 'Space Grotesk', 700)
