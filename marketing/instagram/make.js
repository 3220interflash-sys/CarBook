// Draws the first 10 Instagram posts as 1080x1350 PNGs.
// Run from the project folder: node marketing/instagram/make.js
// Needs Playwright (pre-installed in Claude's cloud sessions) and internet for the font.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'posts');

const I = {
  tyre: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2"/><path d="M12 3v4.8M12 16.2V21M3 12h4.8M16.2 12H21M5.6 5.6l3.4 3.4M15 15l3.4 3.4M18.4 5.6L15 9M9 15l-3.4 3.4"/>',
  oil: '<path d="M3 10.5h8.5l2.5 2.5h3.5l3-3v6.5a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3z"/><path d="M7 10.5V8h4M8 8V6.5h2M20.5 5.5c0 1.2.9 1.7.9 2.6a.9.9 0 0 1-1.8 0c0-.9.9-1.4.9-2.6z"/>',
  flag: '<path d="M5 21V4M5 4h13l-2.5 4L18 12H5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  traffic: '<rect x="7" y="2.5" width="10" height="19" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  brake: '<circle cx="12" cy="12" r="6"/><path d="M12 8.8v3.8M12 15.2v.1"/><path d="M4.2 7.2a9.5 9.5 0 0 0 0 9.6M19.8 7.2a9.5 9.5 0 0 1 0 9.6"/>',
  gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><path d="M7 16h.01M17 16h.01"/>',
  rain: '<path d="M7 15.5h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4-1A4.5 4.5 0 0 0 7 15.5z"/><path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2"/>',
  chain: '<rect x="2.5" y="9" width="8" height="6" rx="3"/><rect x="13.5" y="9" width="8" height="6" rx="3"/><path d="M9 12h6"/>',
  thermo: '<path d="M12 3v9.5"/><circle cx="12" cy="15.5" r="2.6"/><path d="M12 5.5h3M12 8.5h3"/><path d="M3 21c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  smoke: '<path d="M7 18.5h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4-1A4.5 4.5 0 0 0 7 18.5z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M10 11h4M10.5 13.5h3"/>',
  door: '<path d="M5 3h10l4 5v13H5z"/><rect x="8" y="10" width="6" height="4" rx="1"/>',
  temp: '<path d="M12 3v9.5"/><circle cx="12" cy="15" r="2.4"/><path d="M12 5.5h3M12 8.5h3"/><path d="M3 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/>',
  engine: '<path d="M5 9.5h2.5V7.5h4V6h3v1.5h2.5l2 2h2.5v6H19l-2 2.5H8.5l-2-2.5H5z"/><path d="M2.5 10.5v4.5M5 12.5H2.5"/>',
  beam: '<path d="M13 6c-3.5 0-3.5 12 0 12 3.5 0 7-2.7 7-6s-3.5-6-7-6z"/><path d="M3 8.5h6M3 12h6M3 15.5h6"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  wash: '<path d="M4 18l1.4-3.8A2 2 0 0 1 7.3 13h9.4a2 2 0 0 1 1.9 1.2L20 18v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.5H7v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M8 3.5s1.5 1.8 1.5 2.8a1.5 1.5 0 0 1-3 0C6.5 5.3 8 3.5 8 3.5zM16 2.5s1.5 1.8 1.5 2.8a1.5 1.5 0 0 1-3 0c0-1 1.5-2.8 1.5-2.8zM12 6s1.5 1.8 1.5 2.8a1.5 1.5 0 0 1-3 0C10.5 7.8 12 6 12 6z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  flood: '<path d="M5 12l1.3-3.5A2 2 0 0 1 8.2 7h7.6a2 2 0 0 1 1.9 1.5L19 12v2H5z"/><path d="M2 17c2.5 0 2.5-1.6 5-1.6s2.5 1.6 5 1.6 2.5-1.6 5-1.6 2.5 1.6 5 1.6M2 21c2.5 0 2.5-1.6 5-1.6s2.5 1.6 5 1.6 2.5-1.6 5-1.6 2.5 1.6 5 1.6"/>',
  beach: '<circle cx="17" cy="6.5" r="3"/><path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M6 11V5M3.5 6.5C4.5 4.5 7.5 4.5 8.5 6.5"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M16 7l2.5 2.5M13.5 9.5L16 12"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M7.5 5.2c2.2 3.6 2.2 10 0 13.6M16.5 5.2c-2.2 3.6-2.2 10 0 13.6"/><path d="M8.4 8.5l1.1.3M8.9 12h1.1M8.4 15.5l1.1-.3M15.6 8.5l-1.1.3M15.1 12H14M15.6 15.5l-1.1-.3"/>',
  rust: '<path d="M4 15l1.6-4.4A2 2 0 0 1 7.5 9h9a2 2 0 0 1 1.9 1.6L20 15v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-9v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><circle cx="8" cy="14.5" r="1.2"/><circle cx="15.5" cy="13" r=".9"/><circle cx="12" cy="15.5" r=".7"/>',
  vote: '<path d="M4 12h16v8H4zM8 12V5h8v7"/><path d="M10 8.5l1.5 1.5 3-3"/>'
};
const ic = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;

// ---- slide templates ----
const cover = s => `<div class="slide dark"><div class="glow"></div>
  <div class="kick">${s.kick}</div><h1>${s.title}</h1>${s.sub ? `<p class="sub">${s.sub}</p>` : ''}
  <div class="art">${ic(s.icon, 'big')}</div>${s.swipe !== false ? '<div class="swipe">Swipe <span>→</span></div>' : ''}</div>`;
const vs = s => `<div class="slide grey"><div class="kick g">${s.kick || 'Meanwhile'}</div>
  <div class="vs one"><div class="who">${s.a[0]}</div><p>${s.a[1]}</p>${ic(s.ai || 'flag', 'vi')}</div>
  <div class="vsx">vs</div>
  <div class="vs two"><div class="who">${s.b[0]}</div><p>${s.b[1]}</p>${ic(s.bi || 'q', 'vi')}</div></div>`;
const card = s => `<div class="slide grey"><div class="kick g">${s.kick}</div>
  <div class="card">${s.icon ? `<div class="ci ${s.tone || ''}">${ic(s.icon)}</div>` : ''}<h2>${s.title}</h2>${s.body ? `<p>${s.body}</p>` : ''}${s.note ? `<p class="note">${s.note}</p>` : ''}</div></div>`;
const quiz = s => `<div class="slide grey"><div class="kick g">Quick quiz</div><h2 class="qh">${s.q}</h2>
  <div class="opts">${s.opts.map((o, i) => `<div class="opt"><b>${'ABCD'[i]}</b><span>${o}</span></div>`).join('')}</div>${s.foot ? `<p class="qf">${s.foot}</p>` : ''}</div>`;
const list = s => `<div class="slide grey"><div class="kick g">${s.kick}</div><h2 class="lh">${s.title}</h2>
  <div class="lst">${s.items.map(x => `<div class="li"><span class="tick ${s.cross ? 'x' : ''}">${ic(s.cross ? 'cross' : 'check')}</span><span>${x}</span></div>`).join('')}</div>${s.note ? `<p class="qf">${s.note}</p>` : ''}</div>`;
const end = s => `<div class="slide yellow"><div class="kick y">${s.kick || 'Your turn'}</div><h1 class="eh">${s.title}</h1>${s.sub ? `<p class="esub">${s.sub}</p>` : ''}
  <div class="acts"><span>${ic('q')}Comment</span><span><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>Save</span><span><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5z"/></svg>Share</span></div></div>`;
const tyreArt = () => `<div class="slide grey"><div class="kick g">Find the code</div>
  <div class="tyrebox"><svg viewBox="0 0 600 600" class="tyresvg"><circle cx="300" cy="300" r="280" fill="#1B2420"/><circle cx="300" cy="300" r="176" fill="#E9EEEB"/><circle cx="300" cy="300" r="120" fill="#C9D3CE"/><circle cx="300" cy="300" r="40" fill="#9AA79F"/>
  ${Array.from({ length: 36 }, (_, i) => `<rect x="296" y="22" width="8" height="26" rx="3" fill="#2E3A35" transform="rotate(${i * 10} 300 300)"/>`).join('')}
  <path id="arc" d="M120 300 A180 180 0 0 1 480 300" fill="none"/><text font-family="Plus Jakarta Sans" font-weight="700" font-size="26" fill="#6E7C75" letter-spacing="3"><textPath href="#arc" startOffset="12%">DOT  XX7  4LC</textPath></text>
  <rect x="352" y="102" width="150" height="74" rx="37" fill="#FFC425" transform="rotate(32 427 139)"/><text x="427" y="152" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="44" fill="#2A2000" transform="rotate(32 427 139)">2319</text></svg></div>
  <div class="decode"><div><b>23</b><span>week of the year</span></div><div><b>19</b><span>year: 2019</span></div></div>
  <p class="qf c">Look for 4 digits, often in an oval, on the side of the tyre.</p></div>`;
const lightsArt = () => `<div class="slide dark"><div class="glow"></div><div class="kick">Dashboard lights</div><h1 class="lt">They work like traffic lights.</h1>
  <div class="lights">
   <div class="lrow"><span class="dash r">${ic('oil')}</span><div><b>Red</b><span>Stop safely, now.</span></div></div>
   <div class="lrow"><span class="dash a">${ic('engine')}</span><div><b>Amber</b><span>Get it checked soon.</span></div></div>
   <div class="lrow"><span class="dash b">${ic('beam')}</span><div><b>Blue or green</b><span>Just information. Relax.</span></div></div>
  </div></div>`;
const chainArt = () => `<div class="slide grey"><div class="kick g">The order matters</div>
  <div class="chainv">
   <div class="step"><span class="n">1</span>${ic('smoke')}<div><b>Emission test</b><span>Not needed for electric and hybrid</span></div></div><div class="arrow">↓</div>
   <div class="step"><span class="n">2</span>${ic('shield')}<div><b>Insurance</b><span>Must be valid</span></div></div><div class="arrow">↓</div>
   <div class="step last"><span class="n">3</span>${ic('disc')}<div><b>Revenue licence</b><span>Needs the two above</span></div></div>
  </div><p class="qf c">Miss one, and the whole chain stalls.</p></div>`;

const myth = s => `<div class="slide grey"><div class="kick g">${s.kick || 'Myth vs fact'}</div>
  ${s.pairs.map(([m, f]) => `<div class="mf"><div class="m"><span class="tag bad">${ic('cross')}Myth</span><p>${m}</p></div><div class="f"><span class="tag ok">${ic('check')}Fact</span><p>${f}</p></div></div>`).join('')}</div>`;
const T = { cover, vs, card, quiz, list, end, tyreArt, lightsArt, chainArt, myth };

// ---- the 10 posts ----
const POSTS = [
  { name: '01-pit-stop', slides: [
    { t: 'cover', kick: 'Box box, machan', title: 'An F1 crew changes 4 tyres in <em>under 2 seconds.</em>', sub: 'When did you last even look at yours?', icon: 'flag' },
    { t: 'vs', a: ['F1 team', 'Knows exactly when every part is due. Down to the lap.'], b: ['Us', '“Oil change? I think it was around Avurudu… which Avurudu, not sure.”'] },
    { t: 'quiz', q: 'When was your last oil change?', opts: ['I know the exact date', 'Around Avurudu time?', 'Oil… change?'], foot: 'No judgement. (A little judgement.)' },
    { t: 'card', kick: 'The usual rule', icon: 'oil', title: 'Many garages suggest about every 5,000 km or 6 months.', body: 'Whichever comes first.', note: 'Your owner’s manual may say different, and the manual always wins.' },
    { t: 'end', title: 'You don’t need a pit crew. You just need to remember.', sub: 'Comment your answer: A, B or C?' }
  ]},
  { name: '02-tyre-birthday', slides: [
    { t: 'cover', kick: 'Did you know?', title: 'Your tyres have a <em>birthday.</em>', sub: 'And it’s written right on them.', icon: 'tyre' },
    { t: 'tyreArt' },
    { t: 'card', kick: 'Why it matters', icon: 'clock', title: 'Tyres age, even if they look fine.', body: 'The rubber slowly hardens and cracks, and grip gets worse, especially in the rain.', note: 'Many tyre makers suggest getting them checked from about 5 years old.' },
    { t: 'end', title: 'Go find yours now.', sub: 'If it says 2016, we need to talk. Comment your tyre’s birth year.' }
  ]},
  { name: '03-dashboard-lights', slides: [
    { t: 'cover', kick: 'That orange thing', title: 'What is that <em>light</em> on my dashboard?', sub: 'A quick guide for people who just hope it goes away.', icon: 'engine' },
    { t: 'lightsArt' },
    { t: 'card', kick: 'The Aladdin’s lamp', icon: 'oil', tone: 'red', title: 'That red “lamp” is oil pressure.', body: 'Pull over safely and switch off the engine. Then call a mechanic or breakdown help.', note: 'Do not “just get home first”. Engines don’t forgive that one.' },
    { t: 'end', title: 'Which light has haunted YOUR dashboard?', sub: 'Symbols differ between makes. Your owner’s manual has the full list.' }
  ]},
  { name: '04-colombo-traffic', slides: [
    { t: 'cover', kick: 'Good news, bad news', title: 'Colombo traffic is officially <em>“severe driving”.</em>', sub: 'Your car agrees.', icon: 'traffic' },
    { t: 'card', kick: 'Check your manual', icon: 'wrench', title: 'Many manuals have a “severe conditions” schedule.', body: 'It covers lots of stop-and-go traffic, short trips, heat and dust.' },
    { t: 'list', kick: 'Sound familiar?', title: 'Your daily drive:', items: ['Galle Road at 5.30pm', 'Baseline Road on a Friday', '32°C and AC on full', 'Dust from the roadworks'] },
    { t: 'card', kick: 'What it means', icon: 'clock', title: 'Your vehicle may need servicing more often.', body: 'If that’s your daily drive, look up the severe schedule in your manual tonight.' },
    { t: 'end', title: 'Sri Lankan traffic: basically a motorsport.', sub: 'Tag the friend who lives on Baseline Road.' }
  ]},
  { name: '05-whats-in-a-service', slides: [
    { t: 'cover', kick: '“Baas, full service eka”', title: 'But what’s actually <em>in</em> a service?', sub: 'Save this for your next garage visit.', icon: 'wrench' },
    { t: 'list', kick: 'Usually in a basic service', title: 'Changed and checked:', items: ['New engine oil and oil filter', 'Brakes and tyres checked', 'Lights, wipers and battery checked', 'Fluids topped up'] },
    { t: 'list', kick: 'Often added at bigger services', title: 'Depends on your km:', items: ['Air filter and cabin filter', 'Spark plugs', 'Brake fluid', 'Coolant'], note: 'Your owner’s manual lists exactly when.' },
    { t: 'card', kick: 'Before they start', icon: 'q', title: '“What exactly will you change today, and what will it cost?”', body: 'Agree the list before the work begins.' },
    { t: 'end', kick: 'When you pick it up', title: '“Can I see the old parts?”', sub: 'A good mechanic won’t mind at all.' }
  ]},
  { name: '06-brake-squeal', slides: [
    { t: 'cover', kick: 'That squeal when you brake?', title: 'It’s not a bug. It’s a <em>feature.</em>', sub: 'Your car is literally saying “please”.', icon: 'sound' },
    { t: 'card', kick: 'How it works', icon: 'brake', title: 'Many brake pads have a small metal tab.', body: 'When the pad wears thin, the tab touches the disc and squeals on purpose.' },
    { t: 'vs', kick: 'Meanwhile', a: ['F1 brakes', 'Glow red-hot every lap. That’s the plan.'], b: ['Your brakes', 'Shouldn’t be singing. That’s a warning.'], ai: 'brake', bi: 'sound' },
    { t: 'end', title: 'Brakes are not a “next month” job.', sub: 'Squealing, grinding or feels different? Get them checked by a professional.' }
  ]},
  { name: '07-tyre-pressure', slides: [
    { t: 'cover', kick: 'Plot twist', title: 'The right tyre pressure is <em>not</em> the number on the tyre.', icon: 'gauge' },
    { t: 'card', kick: 'The number on the tyre', icon: 'cross', tone: 'red', title: 'That’s the maximum it can take.', body: 'Not what your vehicle needs.' },
    { t: 'card', kick: 'The right number', icon: 'door', title: 'Look inside the driver’s door.', body: 'There’s usually a sticker there, or it’s in your manual. Check when the tyres are cold.' },
    { t: 'list', kick: 'Too little air means', title: 'Low pressure can cost you:', items: ['More fuel', 'Less grip', 'Faster tyre wear'], cross: true },
    { t: 'end', title: 'Free air at the fuel shed, machan.', sub: 'When did you last check? “The shed uncle did it” counts. Once.' }
  ]},
  { name: '08-monsoon-mode', slides: [
    { t: 'cover', kick: 'Monsoon mode', title: 'Your tyres vs a <em>Wellawatte</em> flood.', sub: 'Who wins?', icon: 'rain' },
    { t: 'vs', a: ['F1 wet tyres', 'Built to clear dozens of litres of water every second.'], b: ['Your tyres', 'Worn smooth since 2019. Good luck.'], ai: 'tyre', bi: 'rain' },
    { t: 'card', kick: 'Why tread matters', icon: 'drop', title: 'The grooves push water out of the way.', body: 'So the rubber can grip the road. Worn grooves mean sliding on water.' },
    { t: 'list', kick: 'Before the rains', title: 'Two-minute check:', items: ['Tyre tread depth', 'Wiper blades', 'All lights working', 'Slow down, leave more space'] },
    { t: 'end', title: 'Never drive into water if you can’t see the road.', sub: 'Send this to the family WhatsApp group.' }
  ]},
  { name: '09-three-date-chain', slides: [
    { t: 'cover', kick: 'The secret boss level', title: 'Sri Lanka’s <em>three-date chain.</em>', sub: 'Every vehicle owner plays it. Every year.', icon: 'chain' },
    { t: 'chainArt' },
    { t: 'quiz', q: 'Without checking, how many of your 3 expiry dates do you know?', opts: ['All 3. Obviously.', '1 or 2', 'Zero. Is that bad?'], foot: 'Usually discovered at the worst possible time.' },
    { t: 'end', title: 'Be honest. 0, 1, 2 or 3?', sub: 'Comment below. No judgement. (A little judgement.)' }
  ]},
  { name: '10-water-is-not-coolant', slides: [
    { t: 'cover', kick: '“Radiator ekata watura daala hari”', title: 'Water is <em>not</em> coolant.', sub: 'Not quite, anyway.', icon: 'thermo' },
    { t: 'list', kick: 'Coolant does more', title: 'What coolant does:', items: ['Helps stop overheating', 'Raises the boiling point', 'Protects the metal inside from rust'] },
    { t: 'card', kick: 'The honest rule', icon: 'drop', title: 'Water in an emergency? OK.', body: 'Leaving it there forever? Not OK. Ask your mechanic which coolant your vehicle uses.', note: 'And never open a hot radiator cap. Ever.' },
    { t: 'end', title: 'In 32°C traffic, your engine works harder than you do.', sub: 'Give it the right drink.' }
  ]}
  ,{ name: '11-washed-not-serviced', slides: [
    { t: 'cover', kick: 'Weekend car wash', title: 'Washed is not <em>serviced.</em>', sub: 'Sorry to be the one to tell you.', icon: 'wash' },
    { t: 'myth', pairs: [['“The car wash is done, so the oil is also fine.”', 'A wash cleans the outside. Engine oil gets changed on its own schedule, at a garage.'], ['“Tyres are shining, so they must be new.”', 'Tyre polish only makes the sides look good. The tread, the part that grips the road, is still the same age.']] },
    { t: 'list', kick: 'What a car wash actually does', title: 'Lovely, but only:', items: ['Cleans the outside', 'Vacuums the inside', 'Makes the tyres shiny', 'Makes you feel good (valid)'] },
    { t: 'card', kick: 'Free tip', icon: 'oil', title: 'While it’s shining, check the oil.', body: 'Ask the attendant to open the bonnet and check the oil level with the dipstick. Takes one minute.' },
    { t: 'end', title: 'Shiny tyres. 2016 date code. Plot twist.', sub: 'Tag the friend whose car is always washed but never serviced.' }
  ]},
  { name: '12-what-wax-does', slides: [
    { t: 'cover', kick: 'The Sri Lankan sun is not joking', title: 'What does <em>waxing</em> your car actually do?', icon: 'sparkle' },
    { t: 'card', kick: 'In one line', icon: 'sparkle', title: 'Wax is sunscreen for your paint.', body: 'It adds a thin protective layer against strong sun, rain, bird droppings, tree sap and sea salt.' },
    { t: 'list', kick: 'How often?', title: 'A simple rule:', items: ['Roughly every 3 months', 'More often if you park outside or near the sea', 'Water stops forming little beads? Time to wax'] },
    { t: 'myth', pairs: [['“Wax will fix my scratches.”', 'It can hide very fine marks a little. Deeper scratches need a body and paint shop.'], ['“I’ll wax it once and forget.”', 'Wax wears off with washing and sun. It’s a regular job, like sunscreen.']] },
    { t: 'end', title: 'Park under a mango tree? Wax is not optional.', sub: 'Tag the friend whose car is the crows’ favourite.' }
  ]},
  { name: '13-car-went-swimming', slides: [
    { t: 'cover', kick: 'Monsoon season, round two', title: 'Your car went <em>swimming.</em> Now what?', sub: 'What to do, and what not to do, after a flood.', icon: 'flood' },
    { t: 'list', kick: 'If water got inside', title: 'Please don’t:', cross: true, items: ['Try to start the engine', '“Just check if it works”', 'Drive through water when you can’t see the road'], note: 'Starting a flooded engine can turn a repair into a replacement.' },
    { t: 'list', kick: 'Instead, do this', title: 'The calm plan:', items: ['Take photos for insurance', 'Call your insurer and a mechanic', 'Get it towed to the garage', 'Let them check oil, fuel and electrics'] },
    { t: 'card', kick: 'Before the rains', icon: 'shield', title: 'Check your insurance covers floods.', body: 'Flood damage often needs extra cover, sometimes called natural perils cover. Ask your insurer what your policy includes.' },
    { t: 'end', title: 'Your car is not a boat. No matter how confident you feel.', sub: 'Send this to someone who parks in a low spot.' }
  ]},
  { name: '14-sea-view-parking', slides: [
    { t: 'cover', kick: 'Island life', title: 'Sea view parking comes with a <em>price.</em>', sub: 'Salt air loves metal. A bit too much.', icon: 'beach' },
    { t: 'vs', kick: 'Same view, different feelings', a: ['Galle Face sunset', 'Beautiful. 10 out of 10. Would park again.'], b: ['Your car, a year later', 'Quietly collecting salt. And rust.'], ai: 'beach', bi: 'rust' },
    { t: 'card', kick: 'What’s happening', icon: 'rust', title: 'Salt speeds up rust.', body: 'Sea breeze carries salt that settles on your vehicle, especially underneath, where nobody ever looks.' },
    { t: 'list', kick: 'Near the sea? Do this', title: 'Easy habits:', items: ['Rinse with fresh water, underneath too', 'Wax regularly to protect the paint', 'Look for rust bubbles on edges and under doors', 'Ask your mechanic to check underneath at services'] },
    { t: 'end', title: 'Negombo, Galle, Mount Lavinia, Jaffna, Trinco?', sub: 'Tag a friend whose car lives by the beach.' }
  ]},
  { name: '15-you-dont-need-aiya', slides: [
    { t: 'cover', kick: 'For every woman who drives', title: 'You don’t need to call <em>Aiya.</em>', sub: '(Or Thaththa. Or your husband. They can relax.)', icon: 'key' },
    { t: 'vs', kick: 'Meet the family “car expert”', a: ['Aiya', 'Kicks the tyre. Says “it’s fine”. Goes back to the cricket.'], b: ['You, with the facts', 'Know the dates, the last service and what to ask. Actually fine.'], ai: 'tyre', bi: 'key' },
    { t: 'list', kick: 'Be the expert in 5 steps', title: 'Know these 5 things:', items: ['Your 3 expiry dates', 'When the last oil change was', 'Your tyre pressure (it’s on the door)', 'What red and amber lights mean', 'Always ask to see the old parts'] },
    { t: 'card', kick: 'At the garage', icon: 'q', title: '“What exactly will you change, and what will it cost?”', body: 'Ask it calmly, every time. Confidence at the garage is just good questions.', note: 'Knowing your car isn’t a man thing or a woman thing. It’s an owner thing.' },
    { t: 'end', title: 'Tag the woman who’s the real car expert in your family.', sub: 'Aiya can stay. As the passenger.' }
  ]},
  { name: '16-cricket-politics-car', slides: [
    { t: 'cover', kick: 'Our two national sports', title: 'Cricket, politics and your <em>car.</em>', sub: 'More in common than you think.', icon: 'ball' },
    { t: 'card', kick: 'Cricket lesson', icon: 'ball', title: 'Don’t leave it to the last over.', body: 'Renewals, oil, tyres. Chasing everything at the very end only works in the highlights.' },
    { t: 'card', kick: 'Cricket lesson, part 2', icon: 'clock', title: 'Your service record is a batting average.', body: 'One big innings doesn’t count. Steady, regular services do.' },
    { t: 'card', kick: 'Politics lesson', icon: 'vote', title: 'Promises come and go. Your revenue licence comes every year.', body: 'Only one of them reliably turns up on time. Make sure it’s yours.' },
    { t: 'end', title: 'Harder to follow: the score, the news, or your service dates?', sub: 'Comment below. Be honest.' }
  ]}
];

const CSS = `
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;font-family:"Plus Jakarta Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
svg{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;padding:110px 90px 150px;display:flex;flex-direction:column}
.dark{background:linear-gradient(150deg,#0B3B2B,#0E5A43 70%,#0F6A4E);color:#fff}
.glow{position:absolute;right:-220px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(255,196,37,.32),transparent 65%)}
.grey{background:#F2F4F3;color:#111A16}
.yellow{background:#FFC425;color:#2A2000}
.kick{position:relative;display:inline-flex;align-self:flex-start;padding:12px 26px;border-radius:999px;background:rgba(255,255,255,.14);font-size:32px;font-weight:700;color:#FFD966}
.kick.g{background:#E2F4EB;color:#0A6E4A}.kick.y{background:rgba(255,255,255,.55);color:#2A2000}
h1{position:relative;margin-top:56px;font-size:108px;line-height:1.02;font-weight:800;letter-spacing:-.035em}
h1 em{font-style:normal;color:#FFC425}
.sub{position:relative;margin-top:36px;font-size:44px;line-height:1.3;color:rgba(255,255,255,.82);max-width:820px}
.art{position:absolute;right:90px;bottom:170px;width:300px;height:300px;border-radius:84px;background:#FFC425;color:#2A2000;display:grid;place-items:center;transform:rotate(-6deg);box-shadow:0 30px 60px -20px rgba(0,0,0,.5)}
.big{width:190px;height:190px;stroke-width:1.5}
.swipe{position:absolute;left:90px;bottom:180px;font-size:34px;font-weight:700;color:rgba(255,255,255,.75)}.swipe span{color:#FFC425}
.card{margin-top:60px;padding:70px 64px;border-radius:56px;background:#fff;box-shadow:0 2px 4px rgba(17,26,22,.04),0 30px 60px -30px rgba(17,26,22,.25)}
.ci{width:150px;height:150px;border-radius:44px;background:#E2F4EB;color:#0A6E4A;display:grid;place-items:center;margin-bottom:46px}
.ci svg{width:96px;height:96px}.ci.red{background:#FEECEB;color:#B42318}
h2{font-size:70px;line-height:1.1;font-weight:800;letter-spacing:-.03em}
.card p{margin-top:28px;font-size:42px;line-height:1.4;color:#45534C}
.card .note{margin-top:30px;padding-top:30px;border-top:3px solid #EEF1EF;font-size:36px;color:#0A6E4A;font-weight:600}
.vs{position:relative;margin-top:40px;padding:56px 60px;border-radius:52px;min-height:330px}
.vs.one{background:#0B3B2B;color:#fff}.vs.two{background:#fff;box-shadow:0 30px 60px -30px rgba(17,26,22,.25)}
.who{display:inline-block;padding:10px 24px;border-radius:999px;font-size:30px;font-weight:800;background:#FFC425;color:#2A2000}
.vs.two .who{background:#E2F4EB;color:#0A6E4A}
.vs p{margin-top:28px;font-size:52px;line-height:1.2;font-weight:700;letter-spacing:-.02em;max-width:720px}
.vi{position:absolute;right:50px;top:46px;width:90px;height:90px;opacity:.5}
.vsx{align-self:center;margin:-26px 0;z-index:2;width:110px;height:110px;border-radius:50%;background:#FFC425;color:#2A2000;display:grid;place-items:center;font-size:40px;font-weight:800;position:relative}
.qh{margin-top:56px;font-size:82px}
.opts{margin-top:56px;display:flex;flex-direction:column;gap:26px}
.opt{display:flex;align-items:center;gap:34px;padding:34px 40px;border-radius:40px;background:#fff;font-size:46px;font-weight:700;box-shadow:0 20px 40px -26px rgba(17,26,22,.3)}
.opt b{flex:none;width:90px;height:90px;border-radius:50%;background:#0B3B2B;color:#FFC425;display:grid;place-items:center;font-size:44px}
.qf{margin-top:auto;font-size:38px;color:#56645D;font-weight:600}.qf.c{text-align:center}
.lh{margin-top:56px;font-size:76px}
.lst{margin-top:44px;display:flex;flex-direction:column;gap:22px}
.li{display:flex;align-items:center;gap:30px;padding:26px 34px;border-radius:36px;background:#fff;font-size:46px;font-weight:700;box-shadow:0 20px 40px -26px rgba(17,26,22,.3)}
.tick{flex:none;width:76px;height:76px;border-radius:50%;background:#0A7F55;color:#fff;display:grid;place-items:center}.tick svg{width:44px;height:44px;stroke-width:3}
.tick.x{background:#B42318}
.eh{margin-top:70px;font-size:104px;color:#2A2000}
.esub{margin-top:40px;font-size:46px;line-height:1.35;font-weight:600;max-width:860px}
.acts{margin-top:auto;display:flex;gap:22px}
.acts span{display:inline-flex;align-items:center;gap:14px;padding:22px 34px;border-radius:999px;background:#2A2000;color:#FFC425;font-size:34px;font-weight:800}
.acts svg{width:44px;height:44px;stroke-width:2.2}
.tyrebox{margin:30px auto 0;width:640px;height:640px}.tyresvg{width:640px;height:640px;stroke:none}
.decode{display:flex;gap:26px;margin-top:20px}
.decode div{flex:1;padding:30px 36px;border-radius:40px;background:#fff;box-shadow:0 20px 40px -26px rgba(17,26,22,.3)}
.decode b{display:block;font-size:90px;font-weight:800;color:#0A7F55;line-height:1}.decode span{font-size:36px;font-weight:600;color:#56645D}
.lt{font-size:92px}
.lights{position:relative;margin-top:60px;display:flex;flex-direction:column;gap:28px}
.lrow{display:flex;align-items:center;gap:40px;padding:34px 40px;border-radius:44px;background:rgba(0,0,0,.25)}
.dash{flex:none;width:160px;height:160px;border-radius:44px;background:#070C0A;display:grid;place-items:center}
.dash svg{width:100px;height:100px;stroke-width:1.8}
.dash.r{color:#FF5A47}.dash.r svg{filter:drop-shadow(0 0 10px #FF5A47)}
.dash.a{color:#FFB21E}.dash.a svg{filter:drop-shadow(0 0 10px #FFB21E)}
.dash.b{color:#4DA8FF}.dash.b svg{filter:drop-shadow(0 0 10px #4DA8FF)}
.lrow b{display:block;font-size:56px;font-weight:800}.lrow span{font-size:42px;color:rgba(255,255,255,.82)}
.chainv{margin-top:60px;display:flex;flex-direction:column;align-items:stretch}
.step{display:flex;align-items:center;gap:34px;padding:38px 44px;border-radius:44px;background:#fff;box-shadow:0 20px 40px -26px rgba(17,26,22,.3)}
.step svg{width:84px;height:84px;color:#0A6E4A;flex:none}
.step.last{background:#0B3B2B;color:#fff}.step.last svg{color:#FFC425}.step.last span{color:rgba(255,255,255,.8)}
.step .n{flex:none;width:76px;height:76px;border-radius:50%;background:#FFC425;color:#2A2000;display:grid;place-items:center;font-size:40px;font-weight:800}
.step b{display:block;font-size:54px;font-weight:800}.step span{font-size:36px;color:#56645D}
.arrow{align-self:center;font-size:64px;font-weight:800;color:#0A7F55;line-height:1.2}
.mf{margin-top:36px;border-radius:48px;background:#fff;overflow:hidden;box-shadow:0 30px 60px -30px rgba(17,26,22,.25)}
.mf .m,.mf .f{padding:30px 46px}.mf .m{background:#FEF3F2}
.mf p{margin-top:14px;font-size:38px;line-height:1.28;font-weight:700;letter-spacing:-.01em}.mf .f p{font-weight:600;color:#33413A}
.tag{display:inline-flex;align-items:center;gap:10px;padding:10px 22px 10px 16px;border-radius:999px;font-size:30px;font-weight:800}
.tag svg{width:34px;height:34px;stroke-width:3}.tag.bad{background:#B42318;color:#fff}.tag.ok{background:#0A7F55;color:#fff}
.foot{position:absolute;left:90px;right:90px;bottom:64px;display:flex;justify-content:space-between;align-items:center;font-size:30px;font-weight:700}
.mark{display:inline-flex;align-items:center;gap:14px}.mark i{width:46px;height:46px;border-radius:14px;background:#FFC425;display:grid;place-items:center;color:#2A2000}.mark i svg{width:30px;height:30px}
.dark .foot{color:rgba(255,255,255,.7)}.grey .foot{color:#8A968F}.yellow .foot{color:#5C4A10}.yellow .mark i{background:#2A2000;color:#FFC425}
.dots{display:flex;gap:12px}.dots i{width:16px;height:16px;border-radius:50%;background:currentColor;opacity:.3}.dots i.on{opacity:1}
`;

const car = '<svg viewBox="0 0 24 24"><path d="M4 15l1.6-4.4A2 2 0 0 1 7.5 9h9a2 2 0 0 1 1.9 1.6L20 15v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-9v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 15h16"/></svg>';
const page = (html, i, n) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=block"><style>${CSS}</style></head>
<body>${html.replace(/<\/div>$/, `<div class="foot"><span class="mark"><i>${car}</i>CarBook</span>${n > 1 ? `<span class="dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div></div>`)}</body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const post of POSTS) {
    for (let i = 0; i < post.slides.length; i++) {
      const s = post.slides[i];
      await p.setContent(page(T[s.t](s), i, post.slides.length), { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: path.join(OUT, `${post.name}-${i + 1}.png`) });
    }
    console.log(post.name, post.slides.length, 'slides');
  }
  await b.close();
})();
