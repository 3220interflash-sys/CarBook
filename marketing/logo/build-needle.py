# Builds needle.html: the 10c logo with the needle and centre dot at different transparencies, plus full-colour options.
src = open('build-pillars-vibrant.py').read()
exec(src[:src.index('cols = [')])
B, M, MD = '#050505', '#00A86B', '#006E47'
dial = ''.join(f'<path d="{sector(START + i * (SEG + GAP), START + i * (SEG + GAP) + SEG)}" fill="{M}"/>' for i in range(4))
def svg(color, op):
    # Needle and dot are grouped so they fade as one piece, with no brighter spot where they overlap.
    return (f'<rect width="512" height="512" rx="120" fill="{B}"/>{dial}<g opacity="{op}">'
            f'<path d="M256 282 L352 232" stroke="{color}" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="282" r="30" fill="{color}"/></g>')
opts = [('A', 'Solid white', 'Needle and dot in full white. The crispest and most readable at tiny sizes.', '#FFFFFF', 1),
        ('B', 'White, 85%', 'Just a hint of see-through. Softer, still very clear.', '#FFFFFF', .85),
        ('C', 'White, 70%', 'Clearly soft. The green dial leads; the needle sits back.', '#FFFFFF', .7),
        ('D', 'White, 55%', 'Quite see-through. Very subtle and moody; can fade at small sizes.', '#FFFFFF', .55),
        ('E', 'Full mint', 'Needle and dot in the same mint as the dial. One colour, very clean.', M, 1)]
cols = [dict(tag=f'Version {t}', name=n, why=w, svg=svg(c, o), pal=MD, palDark=M, dark=B, hero='#E6FFF5',
             sw=[[B, '#fff'], [M, B], [MD, '#fff'], ['#FFFFFF', B]]) for t, n, w, c, o in opts]
sheet('needle.html', 'MotorPal: needle and dot options', 'Deep mint (10c). The needle and centre dot fade together as one piece. Font: Plus Jakarta Sans.', cols, 'Plus Jakarta Sans', 700)
