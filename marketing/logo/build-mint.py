# Builds mint.html: Neon mint (option 10) in three slightly darker shades.
src = open('build-pillars-vibrant.py').read()
exec(src[:src.index('cols = [')])
B = '#050505'
shades = [('10a', 'Mint, a touch darker', '#00DB8F', '#00905E'), ('10b', 'Mint, darker', '#00C47F', '#007F53'), ('10c', 'Deep mint', '#00A86B', '#006E47')]
cols = [dict(tag=f'Option {t}', name=nm, why=f'Black tile with a {c.upper()} dial and a white needle.', svg=mark2(B, L(c), '#FFFFFF'),
             pal=pd, palDark=c, dark=B, hero='#E6FFF5', sw=[[B, '#fff'], [c, B], [pd, '#fff'], ['#FFFFFF', B]]) for t, nm, c, pd in shades]
sheet('mint.html', 'MotorPal: Neon mint, a bit darker', 'Three darker shades of the mint dial. Font: Plus Jakarta Sans.', cols, 'Plus Jakarta Sans', 700)
