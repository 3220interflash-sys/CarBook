# Builds gauge.html: four ways to build MotorPal's brand values into the Gauge logo. Render with make-gauge.js.
import json, importlib.util, sys
spec = importlib.util.spec_from_file_location('r2', 'build-round2.py')
src = open('build-round2.py').read()
sheet_src = src[:src.index('# ---- Pulse')]
exec(sheet_src)  # gives sheet()

NAVY, TRACK, LIME, W = '#0F172A', '#334155', '#A3E635', '#FFFFFF'
def tile(inner): return f'<rect width="512" height="512" rx="120" fill="{NAVY}"/>' + inner
def arc(color, dash, w=44, cap='round', off=0): return f'<circle cx="256" cy="282" r="150" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="{cap}" stroke-dasharray="{dash}" stroke-dashoffset="{off}" transform="rotate(135 256 282)"/>'
needle = lambda x, y: f'<path d="M256 282 L{x} {y}" stroke="{W}" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="282" r="30" fill="{W}"/>'

A = tile(arc(TRACK, '707 942') + arc(LIME, '236 942', off=-471) + needle(360, 264))
B = tile(arc(TRACK, '707 942') + arc(LIME, '707 942') +
         '<path d="M196 284 L240 328 L334 226" fill="none" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>')
C = tile(arc(LIME, '160 22 160 22 160 22 160 400', 44, 'butt') + needle(352, 232))
D = tile('<path d="M150 388 L112 446 L206 420 Z" fill="#A3E635" stroke="#A3E635" stroke-width="20" stroke-linejoin="round"/>' +
         arc(TRACK, '707 942') + arc(LIME, '500 942') + needle(352, 232))
base = dict(hero='#E9EEF6', dark=NAVY, pal='#65A30D', palDark=LIME,
            sw=[['#0F172A','#fff'],['#334155','#fff'],['#A3E635','#0F172A'],['#E9EEF6','#0F172A']])
cols = [
 dict(base, tag='Value: peace of mind', name='Always in the green', svg=A,
      why='The dial is grey until the last stretch, which is green, and the needle sits in it. The promise: with MotorPal, your vehicle is always in the green.'),
 dict(base, tag='Value: done right', name='The tick gauge', svg=B,
      why='The needle becomes a tick inside a full green dial. The promise: everything due has been done. Simple, positive, easy to remember.'),
 dict(base, tag='Value: all in one place', name='Four pillars', svg=C,
      why='The dial is four segments: reminders, service records, fuel and costs, warranties. All lit means everything is covered. Each segment can be a colour inside the app.'),
 dict(base, tag='Value: a pal you can ask', name='The talking gauge', svg=D,
      why='A small speech-bubble tail on the dial. The gauge is talking to you: a friend that tells you where you stand, in plain words.'),
]
sheet('gauge.html', 'MotorPal Gauge: putting the brand’s values into the logo',
      'Same navy, lime and Space Grotesk. Each version adds one small idea that says what MotorPal promises.', cols, 'Space Grotesk', 700)
