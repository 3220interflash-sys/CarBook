# Builds clock.html: the chatty gauge with two clock hands that form a subtle mouth. Render with make-clock.js.
src = open('build-face.py').read().split('A = chomp')[0]
exec(src)  # sheet(), tile(), ring(), colours
segs = ''.join(ring(244, 256, LIME, '171 1000', 35, off=-(171 + 22) * i) for i in range(4))
hands = lambda d, w=24: f'<path d="{d}" fill="none" stroke="{W}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
A = tile(segs + hands('M334 222 L244 256 L322 286'))                          # symmetric, no eye
B = tile(segs + hands('M334 222 L244 256 L322 286') + f'<circle cx="262" cy="174" r="22" fill="{W}"/>')  # with eye
C = tile(segs + hands('M342 256 L244 256 L300 304'))                          # clock-like: long and short hand
base = dict(hero='#E9EEF6', dark=NAVY, pal='#65A30D', palDark=LIME,
            sw=[['#0F172A','#fff'],['#334155','#fff'],['#A3E635','#0F172A'],['#E9EEF6','#0F172A']])
cols = [
 dict(base, tag='Version A', name='Open smile', svg=A,
      why='No dots. Two equal hands open towards the gap like a gentle open mouth. Clean and subtle: a clock, a gauge and a face, depending on how you look.'),
 dict(base, tag='Version B', name='Open smile with an eye', svg=B,
      why='The same hands, with a small eye kept above. The face reads straight away; a little less subtle.'),
 dict(base, tag='Version C', name='Clock hands', svg=C,
      why='A long hand and a short hand, like a real clock. The most “time and reminders”, with the mouth only hinted at.'),
]
sheet('clock.html', 'MotorPal: the gauge with clock hands',
      'The dot is gone. Two clock hands meet in the middle and open towards the gap, so together they quietly suggest a mouth.',
      cols, 'Space Grotesk', 700)
