# Builds pillars-vibrant.html: twelve sharp, vibrant colour options for the "Four pillars" logo.
src = open('build-pillars-colours.py').read()
exec(src[:src.index('def opt(')])  # sheet(), mark geometry
def mark2(tile, segs, needle, grad=None):
    defs = ''
    if grad:
        defs = f'<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{grad[0]}"/><stop offset="1" stop-color="{grad[1]}"/></linearGradient></defs>'
        tile = 'url(#g1)'
    out = defs + f'<rect width="512" height="512" rx="120" fill="{tile}"/>'
    out += ''.join(f'<path d="{sector(START + i * (SEG + GAP), START + i * (SEG + GAP) + SEG)}" fill="{segs[i]}"/>' for i in range(4))
    return out + f'<path d="M256 282 L352 232" stroke="{needle}" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="282" r="30" fill="{needle}"/>'
L = lambda c: [c] * 4
n = 8
def opt(name, why, tile, segs, needle, pal, palDark, dark, hero, sw, grad=None):
    global n; n += 1
    return dict(tag=f'Option {n}', name=name, why=why, svg=mark2(tile, segs, needle, grad), pal=pal, palDark=palDark, dark=dark, hero=hero, sw=sw)
cols = [
 opt('Electric violet', 'Vivid violet with a sunshine-yellow dial. Loud, confident and impossible to miss.', '#6D28D9', L('#FDE047'), '#FFFFFF', '#6D28D9', '#FDE047', '#1E0B3D', '#F1EAFF',
     [['#6D28D9','#fff'],['#FDE047','#1E0B3D'],['#1E0B3D','#fff'],['#FFFFFF','#6D28D9']]),
 opt('Neon mint', 'Jet black with a glowing mint dial. Sharp and techy, like a sports watch.', '#050505', L('#00F5A0'), '#FFFFFF', '#00A86B', '#00F5A0', '#050505', '#E6FFF5',
     [['#050505','#fff'],['#00F5A0','#050505'],['#00A86B','#fff'],['#FFFFFF','#050505']]),
 opt('Electric blue and orange', 'Pure electric blue with a hot orange dial. Sporty, energetic, high contrast.', '#0055FF', L('#FF8A00'), '#FFFFFF', '#0055FF', '#FF8A00', '#001A4D', '#E5EEFF',
     [['#0055FF','#fff'],['#FF8A00','#001A4D'],['#001A4D','#fff'],['#FFFFFF','#0055FF']]),
 opt('Racing red', 'Bold racing red with a white dial and black needle. Fast, iconic, very motorsport.', '#E10600', L('#FFFFFF'), '#111111', '#E10600', '#FF4D45', '#111111', '#FFE9E8',
     [['#E10600','#fff'],['#FFFFFF','#E10600'],['#111111','#fff'],['#FF4D45','#111111']]),
 opt('Tangerine', 'Bright tangerine with a white dial and dark needle. Warm, cheerful and friendly.', '#FF6B00', L('#FFFFFF'), '#1A1A1A', '#E85D00', '#FF8A33', '#1A1A1A', '#FFF0E5',
     [['#FF6B00','#fff'],['#FFFFFF','#E85D00'],['#1A1A1A','#fff'],['#FF8A33','#1A1A1A']]),
 opt('Hot pink', 'Black with a hot pink dial. Fashion-bright and youthful; made for Instagram.', '#0A0A0A', L('#FF2D95'), '#FFFFFF', '#E0007A', '#FF2D95', '#0A0A0A', '#FFE8F4',
     [['#0A0A0A','#fff'],['#FF2D95','#fff'],['#E0007A','#fff'],['#FFFFFF','#0A0A0A']]),
 opt('Lime pop', 'The tile itself is lime, with a navy dial and needle. A bright, fresh twist on the chosen colours.', '#A3E635', L('#0F172A'), '#0F172A', '#4D7C0F', '#A3E635', '#0F172A', '#F2FCE3',
     [['#A3E635','#0F172A'],['#0F172A','#fff'],['#4D7C0F','#fff'],['#FFFFFF','#0F172A']]),
 opt('Teal and sunshine', 'Strong teal with a sunshine-yellow dial. Tropical and upbeat; feels very Sri Lankan coast.', '#00A3A3', L('#FFE600'), '#FFFFFF', '#008080', '#FFE600', '#003D3D', '#E0F7F7',
     [['#00A3A3','#fff'],['#FFE600','#003D3D'],['#003D3D','#fff'],['#FFFFFF','#00A3A3']]),
 opt('Magenta to purple', 'A magenta-to-purple gradient tile with a white dial and yellow needle. Rich and modern, like a music app.', '#FF0080', L('#FFFFFF'), '#FFE600', '#C026D3', '#FF4FA3', '#1A0526', '#FBE8FF',
     [['#FF0080','#fff'],['#7928CA','#fff'],['#FFE600','#1A0526'],['#FFFFFF','#7928CA']], grad=('#FF0080', '#7928CA')),
 opt('Ocean gradient', 'A blue-to-cyan gradient tile with a white dial. Clean, fresh and trustworthy.', '#2563EB', L('#FFFFFF'), '#0B1B3F', '#2563EB', '#22D3EE', '#0B1B3F', '#E5F3FF',
     [['#2563EB','#fff'],['#06B6D4','#0B1B3F'],['#0B1B3F','#fff'],['#FFFFFF','#2563EB']], grad=('#2563EB', '#06B6D4')),
 opt('Sunrise gradient', 'An orange-to-pink gradient tile with a white dial. Warm, bold and full of energy.', '#FF7A18', L('#FFFFFF'), '#1A1A1A', '#E8590C', '#FF7A59', '#1A1A1A', '#FFF0E8',
     [['#FF7A18','#1A1A1A'],['#FF2E7E','#fff'],['#1A1A1A','#fff'],['#FFFFFF','#E8590C']], grad=('#FF9A18', '#FF2E7E')),
 opt('Rainbow pillars', 'Black with four vivid segments: green, blue, yellow and pink. Each pillar has its own bright colour.', '#0A0A0A',
     ['#00E676','#2979FF','#FFD600','#FF2D95'], '#FFFFFF', '#2979FF', '#00E676', '#0A0A0A', '#EEF2F7',
     [['#00E676','#0A0A0A'],['#2979FF','#fff'],['#FFD600','#0A0A0A'],['#FF2D95','#fff']]),
]
sheet('pillars-vibrant.html', 'MotorPal: sharp and vibrant colours',
      'Twelve brighter colour options for the “Four pillars” logo. Same shape; font: Plus Jakarta Sans.', cols, 'Plus Jakarta Sans', 700)
s = open('pillars-vibrant.html').read().replace('repeat(12,1fr)', 'repeat(4,1fr)').replace(f'width:{640 * 12 + 180}px', f'width:{640 * 4 + 180}px')
open('pillars-vibrant.html', 'w').write(s)
