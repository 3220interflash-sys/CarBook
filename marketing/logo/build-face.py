# Builds face.html: the gauge that is also a friendly face. Render with make-face.js.
src = open('build-round2.py').read()
exec(src[:src.index('# ---- Pulse')])  # gives sheet()
NAVY, TRACK, LIME, W = '#0F172A', '#334155', '#A3E635', '#FFFFFF'
tile = lambda inner: f'<rect width="512" height="512" rx="120" fill="{NAVY}"/>' + inner
def ring(cx, cy, color, dash, rot, cap='butt', off=0):
    return (f'<circle cx="{cx}" cy="{cy}" r="150" fill="none" stroke="{color}" stroke-width="44" stroke-linecap="{cap}" '
            f'stroke-dasharray="{dash}" stroke-dashoffset="{off}" transform="rotate({rot} {cx} {cy})"/>')
SEG = '171 22 171 22 171 22 171 400'   # four segments around a 290 degree ring, mouth open to the right
def chomp(colors):
    segs = ''.join(ring(244, 256, c, f'171 1000', 35, off=-(171 + 22) * i) for i, c in enumerate(colors))
    return tile(segs + f'<circle cx="250" cy="178" r="26" fill="{W}"/>'
                f'<path d="M196 300 L300 256" stroke="{W}" stroke-width="26" stroke-linecap="round"/><circle cx="196" cy="300" r="26" fill="{W}"/>')
A = chomp([LIME] * 4)
C = chomp(['#A3E635', '#22D3EE', '#FBBF24', '#A78BFA'])
B = tile(ring(256, 276, TRACK, '707 942', 135, 'round') + ring(256, 276, LIME, '500 942', 135, 'round') +
         f'<circle cx="208" cy="246" r="24" fill="{W}"/><circle cx="304" cy="246" r="24" fill="{W}"/>'
         f'<path d="M204 312 Q256 352 308 312" fill="none" stroke="{LIME}" stroke-width="24" stroke-linecap="round"/>')
base = dict(hero='#E9EEF6', dark=NAVY, pal='#65A30D', palDark=LIME,
            sw=[['#0F172A','#fff'],['#334155','#fff'],['#A3E635','#0F172A'],['#E9EEF6','#0F172A']])
cols = [
 dict(base, tag='Pal and gauge', name='The chatty gauge', svg=A,
      why='The dial opens on one side like a mouth, with an eye above. The needle rises towards the mouth like a cheeky grin, and still reads as a gauge. Its four segments are the four things MotorPal looks after.'),
 dict(base, tag='Pal and gauge', name='The happy gauge', svg=B,
      why='A classic gauge with two eyes and a smile where the needle would be. The dial in the green is the reading; the smile is the pal. The gentlest, friendliest version.'),
 dict(base, tag='Pal and gauge, colour coded', name='The chatty gauge, four colours', svg=C,
      why='Same face, but each segment has its own colour: reminders, service, fuel and costs, warranties. The same four colours can run through the app.',
      sw=[['#0F172A','#fff'],['#A3E635','#0F172A'],['#22D3EE','#0F172A'],['#FBBF24','#0F172A']]),
]
sheet('face.html', 'MotorPal: the gauge with a face',
      'A round face with an open mouth that is also a gauge. Drawn our own way (an outline dial in navy and lime, not a solid yellow circle) so it is clearly MotorPal and not a game character.',
      cols, 'Space Grotesk', 700)
