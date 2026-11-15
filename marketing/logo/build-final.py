# Builds final.html: the MotorPal mark. Bold equal hands that sit flush against the ends of the green dial.
import math
src = open('build-face.py').read().split('A = chomp')[0]
exec(src)
CX, CY, R, RW, HW = 244, 256, 150, 44, 30      # dial centre, radius, ring width, hand width
segs = ''.join(ring(CX, CY, LIME, '171 1000', 35, off=-(171 + 22) * i) for i in range(4))
def hand(deg, side):
    # A hand along the ray at `deg`, shifted half its width into the gap so one edge lines up with the end of the green segment.
    t = math.radians(deg); u = (math.cos(t), math.sin(t)); n = (side * math.sin(t), -side * math.cos(t))
    o = (n[0] * HW / 2, n[1] * HW / 2); end = R + RW / 2
    x1, y1 = CX + o[0], CY + o[1]; x2, y2 = CX + u[0] * end + o[0], CY + u[1] * end + o[1]
    return f'<path d="M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}" stroke="{W}" stroke-width="{HW}" stroke-linecap="butt"/>'
MARK = tile(segs + f'<clipPath id="dial"><circle cx="{CX}" cy="{CY}" r="{R + RW / 2}"/></clipPath><g clip-path="url(#dial)">' + hand(35, 1) + hand(-35, -1) + '</g>' + f'<circle cx="{CX}" cy="{CY}" r="32" fill="{W}"/>')
open('motorpal-mark.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{MARK}</svg>')
base = dict(hero='#E9EEF6', dark=NAVY, pal='#65A30D', palDark=LIME,
            sw=[['#0F172A','#fff'],['#334155','#fff'],['#A3E635','#0F172A'],['#E9EEF6','#0F172A']])
cols = [dict(base, tag='Chosen direction', name='Open smile, seamless', svg=MARK,
      why='Bold, equal hands from the centre dot. Each hand sits flush against the end of the green dial, so white and green join without a gap. A clock, a gauge and a friendly open mouth in one.')]
sheet('final.html', 'MotorPal', 'The mark, with the hands joined seamlessly to the dial.', cols, 'Space Grotesk', 700)
