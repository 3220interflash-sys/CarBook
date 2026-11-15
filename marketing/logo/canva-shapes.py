# Works out the MotorPal mark as separate Canva shapes (path, viewBox, position, size) for a given placement.
import math, json, sys
MOUTH, RING, HW, DOT, GAP_PX, PARTS = 27, 42, 19, 22, 22, 4
CX, CY = 244, 256
RO, RI = 150 + RING / 2, 150 - RING / 2
GAP = GAP_PX / (2 * math.pi * 150) * 360
SEG = (360 - 2 * MOUTH - (PARTS - 1) * GAP) / PARTS
P = lambda d, r: (CX + r * math.cos(math.radians(d)), CY + r * math.sin(math.radians(d)))

def sector(a0, a1):
    pts = [P(a0 + (a1 - a0) * i / 40, RO) for i in range(41)] + [P(a1 - (a1 - a0) * i / 40, RI) for i in range(41)]
    cmd = [('M', P(a0, RO)), ('A', RO, 0, 1, P(a1, RO)), ('L', P(a1, RI)), ('A', RI, 0, 0, P(a0, RI)), ('Z',)]
    return cmd, pts
def hand(deg, side):
    t = math.radians(deg); u = (math.cos(t), math.sin(t)); n = (side * math.sin(t), -side * math.cos(t))
    r = HW / 2; L = math.sqrt((RO - r) ** 2 - r ** 2)
    A = (CX, CY); B = (CX + n[0] * HW, CY + n[1] * HW); C = (B[0] + u[0] * L, B[1] + u[1] * L); D = (CX + u[0] * L, CY + u[1] * L)
    sweep = 1 if (n[0] * u[1] - n[1] * u[0]) > 0 else 0
    mid = (CX + n[0] * r + u[0] * L, CY + n[1] * r + u[1] * L)
    pts = [A, B, C, D] + [(mid[0] + r * math.cos(a / 20 * 2 * math.pi), mid[1] + r * math.sin(a / 20 * 2 * math.pi)) for a in range(20)]
    return [('M', A), ('L', B), ('L', C), ('A', r, 0, sweep, D), ('Z',)], pts
def circle(cx, cy, r):
    return [('M', (cx - r, cy)), ('A', r, 0, 1, (cx + r, cy)), ('A', r, 0, 1, (cx - r, cy)), ('Z',)], [(cx - r, cy - r), (cx + r, cy + r)]
def tile(rad=120, s=512):
    k = rad
    return [('M', (k, 0)), ('L', (s - k, 0)), ('A', k, 0, 1, (s, k)), ('L', (s, s - k)), ('A', k, 0, 1, (s - k, s)), ('L', (k, s)), ('A', k, 0, 1, (0, s - k)), ('L', (0, k)), ('A', k, 0, 1, (k, 0)), ('Z',)], [(0, 0), (s, s)]

def to_shape(cmd, pts, color, ox, oy, scale):
    minx = min(p[0] for p in pts); miny = min(p[1] for p in pts); maxx = max(p[0] for p in pts); maxy = max(p[1] for p in pts)
    f = lambda p: f'{p[0] - minx:.2f} {p[1] - miny:.2f}'
    d = []
    for c in cmd:
        if c[0] in 'ML': d.append(f'{c[0]}{f(c[1])}')
        elif c[0] == 'A': d.append(f'A{c[1]:.2f} {c[1]:.2f} 0 {c[2]} {c[3]} {f(c[4])}')
        else: d.append('Z')
    w, h = maxx - minx, maxy - miny
    return dict(type='insert_shape', path=' '.join(d), view_box_width=round(w, 2), view_box_height=round(h, 2),
                left=round(ox + minx * scale, 2), top=round(oy + miny * scale, 2), width=round(w * scale, 2), height=round(h * scale, 2), color=color)

def mark(ox, oy, scale, with_tile=True):
    out = []
    if with_tile: out.append(to_shape(*tile(), '#0F172A', ox, oy, scale))
    for i in range(PARTS):
        a0 = MOUTH + i * (SEG + GAP); out.append(to_shape(*sector(a0, a0 + SEG), '#A3E635', ox, oy, scale))
    out.append(to_shape(*hand(MOUTH, 1), '#FFFFFF', ox, oy, scale))
    out.append(to_shape(*hand(-MOUTH, -1), '#FFFFFF', ox, oy, scale))
    out.append(to_shape(*circle(CX, CY, DOT), '#FFFFFF', ox, oy, scale))
    return out

if __name__ == '__main__':
    ox, oy, scale, t = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4] == '1'
    print(json.dumps(mark(ox, oy, scale, t)))
