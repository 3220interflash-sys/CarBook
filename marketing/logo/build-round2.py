# Builds pulse2.html and askpal.html (MotorPal logo round 2). Render with make-round2.js.
import json
base = open('modern.html').read()
css = base[:base.index('<body>')]

def sheet(fname, title, lead, cols, font, weight):
    w = 640 * len(cols) + 180
    head = css.replace('width:2600px', f'width:{w}px').replace('repeat(5,1fr)', f'repeat({len(cols)},1fr)')
    js = 'const ideas=' + json.dumps(cols) + ';'
    body = f'''<body>
<h1>{title}</h1>
<p class="lead">{lead}</p>
<div class="cols" id="cols"></div>
<script>
{js}
let k=0;
const icon=(s,size)=>{{k++;const t=s.replace(/id="(g\\d)"/g,`id="$1_${{k}}"`).replace(/url\\(#(g\\d)\\)/g,`url(#$1_${{k}})`);return `<svg viewBox="0 0 512 512"${{size?` width="${{size}}" height="${{size}}"`:''}}>${{t}}</svg>`}};
const pal=c=>c.startsWith('linear')?`background:${{c}};-webkit-background-clip:text;background-clip:text;color:transparent`:`color:${{c}}`;
const word=(d,dark)=>`<span style="font-family:'{font}',sans-serif;font-weight:{weight};letter-spacing:-.03em;color:${{dark?'#fff':'#0B0B0F'}}">Motor<span style="${{pal(dark?d.palDark:d.pal)}}">Pal</span></span>`;
document.getElementById('cols').innerHTML=ideas.map(d=>`
<div class="col">
 <div class="hero" style="background:${{d.hero}}">${{icon(d.svg)}}</div>
 <div class="lock">${{icon(d.svg)}}${{word(d,false)}}</div>
 <div class="lock" style="background:${{d.dark}}">${{icon(d.svg)}}${{word(d,true)}}</div>
 <div class="sizes" style="padding-top:28px">${{icon(d.svg,96)}}${{icon(d.svg,60)}}${{icon(d.svg,36)}}</div>
 <div class="sw">${{d.sw.map(([c,f])=>`<i style="background:${{c}};color:${{f}}">${{c}}</i>`).join('')}}</div>
 <div class="cap"><small>${{d.tag}}</small><b>${{d.name}}</b><p>${{d.why}}</p></div>
</div>`).join('');
</script></body></html>'''
    open(fname, 'w').write(head + body)
    return w

# ---- Pulse: an uneven heartbeat. Two neighbouring spikes of different heights hint at an M without spelling it.
PULSE = 'M52 300 H112 Q124 300 130 290 Q140 270 150 290 Q156 300 168 300 H184 L198 326 L230 148 L256 322 L280 214 L300 334 L314 300 H344 Q358 300 366 284 Q376 266 386 284 Q392 300 404 300 H414'
def pulse(bg, a, b, dot):
    g = f'<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs>'
    edge = ' stroke="#E4E4EC" stroke-width="8"' if bg == '#FFFFFF' else ''
    return g + f'<rect x="4" y="4" width="504" height="504" rx="116" fill="{bg}"{edge}/><path d="{PULSE}" fill="none" stroke="url(#g1)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><circle cx="446" cy="300" r="24" fill="{dot}"/>'
P = [
 dict(tag='Colour 1', name='Sunset', why='Black with an orange-to-pink beat. Bold and youthful, stands out on any phone screen and on Instagram.',
      svg=pulse('#0B0B0F', '#FF7A18', '#FF2E7E', '#FFFFFF'), hero='#FFEFF4', dark='#0B0B0F',
      pal='linear-gradient(90deg,#FF7A18,#FF2E7E)', palDark='linear-gradient(90deg,#FF7A18,#FF2E7E)',
      sw=[['#0B0B0F','#fff'],['#FF7A18','#0B0B0F'],['#FF2E7E','#fff'],['#FFEFF4','#BE185D']]),
 dict(tag='Colour 2', name='Night drive', why='Deep navy with a cyan-to-violet beat. Calm, techy and premium, like a modern banking app.',
      svg=pulse('#0B1026', '#22D3EE', '#8B5CF6', '#FFFFFF'), hero='#EAF0FF', dark='#0B1026',
      pal='linear-gradient(90deg,#0891B2,#7C3AED)', palDark='linear-gradient(90deg,#22D3EE,#8B5CF6)',
      sw=[['#0B1026','#fff'],['#22D3EE','#0B1026'],['#8B5CF6','#fff'],['#EAF0FF','#4338CA']]),
 dict(tag='Colour 3', name='Clean light', why='A white icon with an indigo-to-pink beat and a dark dot. Fresh and friendly, the lightest feel of the three.',
      svg=pulse('#FFFFFF', '#4F46E5', '#EC4899', '#0B0B0F'), hero='#F1EEFF', dark='#1E1B4B',
      pal='linear-gradient(90deg,#4F46E5,#DB2777)', palDark='linear-gradient(90deg,#A5B4FC,#F9A8D4)',
      sw=[['#FFFFFF','#4F46E5'],['#4F46E5','#fff'],['#EC4899','#fff'],['#0B0B0F','#fff']]),
]
w1 = sheet('pulse2.html', 'MotorPal: the pulse, three colours',
  'An uneven heartbeat: a small beat, two spikes of different heights, a small beat, then the dot. The M is there if you look for it, not spelled out. Font: Unbounded.',
  P, 'Unbounded', 700)

# ---- Ask a pal with an M: the spokes of the steering wheel form an M; the hub sits in its middle.
def askpal(bg1, bg2, bubble, ink, hub):
    g = f'<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient></defs>'
    return g + (f'<rect width="512" height="512" rx="120" fill="url(#g1)"/>'
      f'<path d="M136 104 H376 A60 60 0 0 1 436 164 V320 A60 60 0 0 1 376 380 H236 L166 434 V380 H136 A60 60 0 0 1 76 320 V164 A60 60 0 0 1 136 104 Z" fill="{bubble}"/>'
      f'<circle cx="256" cy="240" r="100" fill="none" stroke="{ink}" stroke-width="24"/>'
      f'<path d="M204 326 V196 L256 260 L308 196 V326" fill="none" stroke="{ink}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>'
      f'<circle cx="256" cy="262" r="22" fill="{hub}"/>')
A = [
 dict(tag='Colour 1', name='Teal and peach', why='The original colours. Warm and approachable, very “pal”.',
      svg=askpal('#14B8A6', '#0D9488', '#FFFFFF', '#0D9488', '#FDBA74'), hero='#E3F7F5', dark='#134E4A',
      pal='#0D9488', palDark='#FDBA74', sw=[['#0D9488','#fff'],['#134E4A','#fff'],['#FDBA74','#134E4A'],['#E3F7F5','#0D9488']]),
 dict(tag='Colour 2', name='Indigo and coral', why='Deep indigo with a coral hub. More modern and premium, still friendly.',
      svg=askpal('#6366F1', '#4338CA', '#FFFFFF', '#4338CA', '#FF6B6B'), hero='#EEF0FF', dark='#1E1B4B',
      pal='#4F46E5', palDark='#FF8A8A', sw=[['#4338CA','#fff'],['#1E1B4B','#fff'],['#FF6B6B','#fff'],['#EEF0FF','#4338CA']]),
 dict(tag='Colour 3', name='Sunset bubble', why='The bubble itself carries the orange-to-pink gradient on black, matching the pulse. Bold and youthful.',
      svg=askpal('#16161C', '#0B0B0F', '#FF4F5E', '#0B0B0F', '#FFFFFF').replace('fill="#FF4F5E"', 'fill="url(#g2)"').replace('</defs>', '<linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A18"/><stop offset="1" stop-color="#FF2E7E"/></linearGradient></defs>'),
      hero='#FFEFF4', dark='#0B0B0F', pal='linear-gradient(90deg,#FF7A18,#FF2E7E)', palDark='linear-gradient(90deg,#FF7A18,#FF2E7E)',
      sw=[['#0B0B0F','#fff'],['#FF7A18','#0B0B0F'],['#FF2E7E','#fff'],['#FFEFF4','#BE185D']]),
 dict(tag='Colour 4', name='Sky and sun', why='Bright sky blue with a sunny yellow hub. Cheerful and clear, feels safe and easy.',
      svg=askpal('#38BDF8', '#0284C7', '#FFFFFF', '#0369A1', '#FACC15'), hero='#E0F2FE', dark='#0C2D48',
      pal='#0284C7', palDark='#FACC15', sw=[['#0284C7','#fff'],['#0C2D48','#fff'],['#FACC15','#0C2D48'],['#E0F2FE','#0369A1']]),
]
w2 = sheet('askpal.html', 'MotorPal: Ask a pal, with an M',
  'The M sits inside the steering wheel: its legs are the lower spokes and its middle meets the hub. Four colour options. Font: Outfit.',
  A, 'Outfit', 800)
print(w1, w2)
