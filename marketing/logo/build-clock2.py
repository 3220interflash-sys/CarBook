# Builds clock2.html: Open smile with a centre dot, hands reaching the ends of the dial, one thinner like a clock.
import math
src = open('build-face.py').read().split('A = chomp')[0]
exec(src)
CX, CY = 244, 256
segs = ''.join(ring(CX, CY, LIME, '171 1000', 35, off=-(171 + 22) * i) for i in range(4))
def pt(deg, r): return f'{CX + r * math.cos(math.radians(deg)):.0f} {CY + r * math.sin(math.radians(deg)):.0f}'
def hand(deg, r, w): return f'<path d="M{CX} {CY} L{pt(deg, r)}" stroke="{W}" stroke-width="{w}" stroke-linecap="round"/>'
dot = f'<circle cx="{CX}" cy="{CY}" r="30" fill="{W}"/>'
A = tile(segs + hand(-35, 150, 14) + hand(35, 150, 30) + dot)   # thin hand up, thick hand down, both meet the ends of the dial
B = tile(segs + hand(-35, 150, 30) + hand(35, 150, 14) + dot)   # thick hand up, thin hand down
C = tile(segs + hand(-35, 116, 14) + hand(35, 116, 30) + dot)   # same as A, stopping just short of the dial
base = dict(hero='#E9EEF6', dark=NAVY, pal='#65A30D', palDark=LIME,
            sw=[['#0F172A','#fff'],['#334155','#fff'],['#A3E635','#0F172A'],['#E9EEF6','#0F172A']])
cols = [
 dict(base, tag='Version A', name='Thin hand up', svg=A,
      why='The centre dot is back. Both hands run right out to the ends of the dial, so the gap becomes the open mouth. The thin minute hand on top, the thicker hour hand below.'),
 dict(base, tag='Version B', name='Thick hand up', svg=B,
      why='The same, with the thick hand on top and the thin one below. Feels a little more like a grin turned upward.'),
 dict(base, tag='Version C', name='Hands with breathing room', svg=C,
      why='Like A, but the hands stop just short of the dial. Lighter and airier; the mouth is a touch more subtle.'),
]
sheet('clock2.html', 'MotorPal: open smile, refined',
      'A centre dot, two clock hands that reach the ends of the dial, one thinner than the other. The gap becomes the mouth.',
      cols, 'Space Grotesk', 700)
