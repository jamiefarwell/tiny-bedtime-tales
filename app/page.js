'use client';

import { useEffect, useMemo, useState } from 'react';

const THEMES = [
  ['Dinosaur','🦕'],['Dragon','🐉'],['Space','🚀'],['Pirates','🏴‍☠️'],
  ['Princesses','👑'],['Animals','🦁'],['Superheroes','🦸'],['Underwater','🧜'],
  ['Other','✨']
];
const EMOJI = Object.fromEntries(THEMES);
const AGE_BANDS = ['Newborn–1','2–3','4–5','6–7','8–9','10–12','Older kids'];
const FORMATS = {
  standalone:{label:'New adventure',icon:'✨',copy:'A completely fresh world for tonight.'},
  continue:{label:'Continue our world',icon:'📚',copy:'Pick up where their last adventure left off.'},
  special:{label:'A big little moment',icon:'🎈',copy:'Birthdays, school, siblings, holidays and more.'},
  support:{label:'A little reassurance',icon:'💛',copy:'A gentle story around something on their mind.'}
};
const PACKAGES = {
  read:['Read','£2.50','A beautiful story to read together'],
  audio:['Read + listen','£3.00','Story plus calm narration'],
  illustrated:['Illustrated','£4.00','Story, narration and storybook scenes']
};
const PHOTOS = {
  family:'https://images.pexels.com/photos/7938040/pexels-photo-7938040.jpeg?auto=compress&dpr=2&w=1200'
};
const DEFAULT_PROFILE = {
  childName:'', ageBand:'6–7', interests:'', pets:'', friends:'',
  preferredTone:'Magical and adventurous', storyLength:'Bedtime — about 7 minutes', avoid:''
};
const DEFAULT_BRIEF = {theme:'Dragon',customWorld:'',format:'standalone',request:'',occasion:'',packageType:'audio'};
const READY_BOOKS = [
  {
    "id": "jasper-buddy-lost-light",
    "title": "Jasper & Buddy and the Valley of Lost Light",
    "shortTitle": "The Valley of Lost Light",
    "age": "5–8",
    "minutes": 10,
    "category": "Adventure",
    "tags": [
      "Adventure",
      "Friendship",
      "Magic"
    ],
    "strapline": "A glowing adventure about small brave choices, helping others and finding the light you already carry.",
    "description": "When Jasper and his golden dog Buddy find a map hidden beneath a loose floorboard, it leads them into a valley where every lantern has mysteriously gone dark. To help the valley glow again, they must listen to a silent waterfall, cross a bridge made from echoes and discover a kind of light that cannot be carried in a jar.",
    "pages": [
      {
        "heading": "The Map Under the Floorboard",
        "scene": 0,
        "text": "Jasper was meant to be getting ready for bed when Buddy began scratching at the rug.\n\n“Buddy,” Jasper whispered, “that is not your bed.”\n\nBuddy wagged once and scratched again.\n\nUnder the rug was a loose floorboard Jasper had never noticed before. Beneath it lay a folded map, tied with a thread of gold. The paper was soft as an old leaf and covered in tiny painted mountains, rivers and a valley filled with hundreds of glowing lanterns.\n\nAcross the bottom, in crooked silver writing, were six words:\n\nWHEN THE VALLEY GOES DARK, FOLLOW BUDDY.\n\nJasper looked at Buddy.\n\nBuddy looked extremely pleased with himself.\n\nThen every lantern painted on the map went out.\n\nA warm golden dot appeared beside the bedroom door and began drifting down the hallway.\n\nJasper pulled on his little green backpack.\n\n“Just a quick adventure,” he said.\n\nBuddy sneezed.\n\nThey both knew there was no such thing."
      },
      {
        "heading": "A Door Made of Fireflies",
        "scene": 1,
        "text": "The golden dot floated through the kitchen, out into the garden and stopped beside the old apple tree.\n\nAt first there was only bark.\n\nThen one firefly appeared.\n\nThen ten.\n\nThen hundreds.\n\nThey gathered in a tall glowing arch, and where the tree trunk should have been, a path stretched beneath a violet sky.\n\nJasper took Buddy’s paw for exactly one second.\n\n“Ready?”\n\nBuddy stepped through first.\n\nOn the other side, the air smelled of pine needles and warm cinnamon. Mountains rose in the distance. Silver rivers curled between them. Tiny cottages dotted the hills.\n\nBut the valley was dark.\n\nEvery lamp post, window lantern and hanging light was cold.\n\nA fox in a red scarf sat beside the path, holding an empty lantern.\n\n“We have plenty of candles,” she explained, “but none of them remember how to shine.”\n\nJasper unfolded the map.\n\nThree new marks had appeared: a waterfall, a bridge and a castle.\n\nBuddy barked at the waterfall.\n\n“Good choice,” Jasper said.\n\nAnd off they went."
      },
      {
        "heading": "The Waterfall That Forgot to Sing",
        "scene": 2,
        "text": "The waterfall was enormous, but it made no sound at all.\n\nWater tumbled down the cliff in perfect silence.\n\nAt the bottom, a family of otters stared sadly into the pool.\n\n“It used to sing,” said the smallest otter. “When it sang, the blue lanterns lit first.”\n\nJasper listened.\n\nNothing.\n\nBuddy tilted his head.\n\nThen Jasper noticed three smooth stones beside the water. Each had a different mark carved into it: a spiral, a star and a tiny paw.\n\nHe tapped the spiral.\n\nPlink.\n\nHe tapped the star.\n\nPlonk.\n\nBuddy placed one paw on the paw-shaped stone.\n\nBOOOONG.\n\nThe waterfall shivered.\n\nJasper laughed. The otters laughed. Buddy barked and bounced on the stone again.\n\nBOOOONG!\n\nSuddenly the waterfall burst into music—rushing, splashing, chiming music that echoed across the valley.\n\nA blue spark jumped from the water into Jasper’s map.\n\nFar away, one row of lanterns flickered awake.\n\n“One light found,” Jasper said.\n\nBut the map was already pointing toward the bridge."
      },
      {
        "heading": "The Bridge of Echoes",
        "scene": 3,
        "text": "The bridge hung between two cliffs, thin as a ribbon.\n\nBelow it, clouds hid the bottom of the gorge.\n\nJasper’s feet stopped.\n\nBuddy’s feet stopped too.\n\nA wooden sign read:\n\nTHE BRIDGE REPEATS WHAT YOU BRING TO IT.\n\nJasper swallowed.\n\n“What if I fall?”\n\nThe gorge whispered back:\n\nFall… fall… fall…\n\nBuddy pressed against Jasper’s leg.\n\nJasper tried again.\n\n“I can take one step.”\n\nThe gorge answered:\n\nOne step… one step… one step…\n\nSo Jasper did.\n\nThe bridge creaked, but held.\n\n“One more.”\n\nOne more… one more…\n\nHalfway across, Buddy froze. His tail tucked between his legs.\n\nJasper crouched beside him.\n\n“We don’t have to be fearless,” he said. “We just have to do the next small thing together.”\n\nTogether… together… together…\n\nBuddy stood.\n\nStep by step, boy and dog reached the other side.\n\nA warm orange spark lifted from the bridge and settled into the map beside the blue one.\n\nJasper grinned.\n\n“Two.”\n\nBuddy wagged.\n\nThe castle waited ahead."
      },
      {
        "heading": "The Castle with No Lamps",
        "scene": 4,
        "text": "The castle was beautiful even in darkness.\n\nIts towers twisted into the clouds, and hundreds of empty lanterns hung from balconies, gates and trees.\n\nInside the great hall, everyone was trying to relight them.\n\nDragons puffed tiny flames.\n\nInventors wound enormous machines.\n\nA magician shouted words that made his own hat smoke.\n\nNothing worked.\n\nAt the centre of the hall sat a little girl holding a broken paper lantern.\n\nNobody seemed to notice her.\n\nJasper did.\n\n“What happened?”\n\n“It was my gran’s,” she said. “It tore when everyone rushed past.”\n\nJasper sat on the floor. He found tape in his backpack. Buddy gently held one side of the paper while Jasper repaired the other.\n\nIt was not a grand job.\n\nIt was not magical.\n\nBut when the girl smiled, a pink light appeared inside the lantern.\n\nEvery person in the hall stopped.\n\nThe pink light floated into Jasper’s map.\n\nThree sparks now glowed together.\n\nBlue for joy. Orange for courage. Pink for kindness.\n\nSurely that was enough.\n\nBut still, most of the valley remained dark."
      },
      {
        "heading": "The Light They Couldn’t Carry",
        "scene": 5,
        "text": "The map changed again.\n\nThe waterfall, bridge and castle vanished.\n\nIn their place appeared one final instruction:\n\nTAKE THE THREE LIGHTS TO THE HIGHEST HILL.\n\nJasper, Buddy and the girl from the castle climbed together.\n\nThe wind grew stronger.\n\nAt the top stood a stone lantern taller than Jasper.\n\nHe held up the map.\n\nThe blue, orange and pink sparks rose into the air and swirled around the lantern.\n\nFor one wonderful second, it blazed gold.\n\nThen—\n\nPFFT.\n\nDark again.\n\nJasper’s shoulders sank.\n\n“We did everything.”\n\nBuddy nudged his hand.\n\nBehind them, the little girl had stopped to help an old tortoise up the final step.\n\nBelow, the otters were showing castle guards how to make the waterfall sing.\n\nAt the bridge, strangers were crossing slowly together, calling encouragement across the gorge.\n\nJasper stared.\n\nThe valley was full of tiny lights now.\n\nNot in lanterns.\n\nIn people.\n\n“Oh,” he whispered.\n\nThe map had never been teaching them how to carry light.\n\nIt had been teaching them how to make it."
      },
      {
        "heading": "The Storm That Wasn’t Angry",
        "scene": 6,
        "text": "A rumble rolled over the mountains.\n\nEveryone looked up.\n\nA huge purple cloud was drifting into the valley.\n\nThe fox in the red scarf gasped. “The night storm!”\n\nWind rushed over the hill and rattled every dark lantern.\n\nJasper understood.\n\nIf the valley was going to shine, it had to happen now.\n\nHe ran to the stone lantern.\n\n“Don’t light this one!” he shouted. “Light each other’s!”\n\nThe fox shared her candle with the otters.\n\nThe dragons lit the inventors’ lamps.\n\nThe castle girl carried her pink paper lantern to the bridge.\n\nOne light became two.\n\nTwo became ten.\n\nTen became hundreds.\n\nThe storm reached the valley.\n\nRain began to fall.\n\nBut instead of putting the lights out, each raindrop caught their glow and scattered it into the air.\n\nThe whole valley sparkled.\n\nThe purple clouds turned silver.\n\nThe great stone lantern finally blazed—not because of three sparks inside it, but because thousands of little lights were shining all around it.\n\nBuddy barked so loudly the mountains barked back."
      },
      {
        "heading": "The Valley Wakes",
        "scene": 7,
        "text": "From the highest hill, Jasper watched the valley come alive.\n\nBlue lanterns danced beside the waterfall.\n\nOrange lights traced the Bridge of Echoes from one cliff to the other.\n\nPink lanterns glowed in every castle window.\n\nAlong the roads, tiny gold lights appeared wherever somebody stopped to help somebody else.\n\nThe fox handed Jasper her red scarf.\n\n“For the Keeper of the Map.”\n\nJasper shook his head.\n\n“I’m not a keeper.”\n\nThe fox smiled. “Exactly. Keepers hide important things away. You shared yours.”\n\nBuddy received a biscuit shaped like a crown, which he considered a much more sensible reward.\n\nThe map in Jasper’s hands changed one last time.\n\nThe painted valley was bright again.\n\nAt the very edge of the paper, a new path appeared—a path that had not been there before.\n\nJasper quickly folded the map.\n\n“Not tonight,” he told it.\n\nThe path shimmered as if it were laughing.\n\nFor once, the adventure seemed happy to wait."
      },
      {
        "heading": "The Way Home",
        "scene": 8,
        "text": "The firefly door waited beneath the apple tree.\n\nThe fox, the otters, the castle girl and half a dozen tiny dragons came to say goodbye.\n\nBuddy had somehow collected three more biscuits.\n\nJasper did not ask how.\n\nHe stepped through the glowing arch and felt the warm garden grass beneath his feet.\n\nThe kitchen clock had moved forward only seven minutes.\n\n“That,” Jasper said, “is extremely suspicious.”\n\nBack upstairs, he tucked the map beneath his pillow instead of under the floorboard.\n\nThe golden thread around it gave one tiny pulse of light.\n\nBuddy circled his bed three times, then jumped onto Jasper’s blanket and rested his head on Jasper’s knees.\n\nThe room was quiet.\n\nNo waterfalls.\n\nNo echoing bridges.\n\nNo castles.\n\nJust the familiar glow of the hallway light beneath the door.\n\nBut Jasper saw it differently now.\n\nA little light did not have to fill a whole valley.\n\nSometimes it only had to reach the person beside you."
      },
      {
        "heading": "The Light That Stayed",
        "scene": 9,
        "text": "Jasper switched off his bedside lamp.\n\nFor a moment, the room was completely dark.\n\nThen Buddy’s tail thumped once against the blanket.\n\nJasper smiled.\n\nOutside, a firefly blinked beside the apple tree.\n\nOnce.\n\nTwice.\n\nGone.\n\nJasper closed his eyes and thought of the waterfall finding its song, the bridge repeating brave words, and a small paper lantern glowing because somebody had stopped to help.\n\nTomorrow there might be school, muddy shoes, missing socks and absolutely no magical valleys at all.\n\nThat was fine.\n\nHe knew where the smallest kind of magic lived now.\n\nIn trying again.\n\nIn taking one more step.\n\nIn noticing someone who needed you.\n\nIn sharing whatever light you had.\n\nBuddy gave a sleepy sigh.\n\nJasper placed one hand on the dog’s warm fur.\n\nSomewhere very far away—or perhaps not far away at all—a whole valley of lanterns glowed softly through the night.\n\nAnd this time, none of them forgot how to shine."
      }
    ]
  }
];

function readStore(key,fallback){
  if(typeof window==='undefined') return fallback;
  try{const value=window.localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{return fallback;}
}
function writeStore(key,value){try{window.localStorage.setItem(key,JSON.stringify(value));}catch{}}
function uid(){return String(Date.now())+'-'+Math.random().toString(36).slice(2,8);}
function initial(name){return (String(name||'').trim()[0]||'★').toUpperCase();}
function themeEmoji(theme){return EMOJI[theme]||'✨';}
function themeLabel(brief){return brief.theme==='Other'?(brief.customWorld.trim()||'Your own world'):brief.theme;}

function AppHeader({screen,go,start}){
  return <>
    <div className="devbar"><span className="devpill">IN DEVELOPMENT</span><span>Prototype currently being developed by <strong>Greg Godfrey</strong></span></div>
    <header className="appHeader">
      <button className="brand" onClick={()=>go('home')}><span className="brandMoon">☾</span><span>Tiny Bedtime Tales</span></button>
      <div className="desktopActions"><button className="textBtn" onClick={()=>go('ready')}>Ready to read</button><button className="textBtn" onClick={()=>go('library')}>My stories</button><button className="primaryBtn compact" onClick={start}>Create a story</button></div>
      {screen!=='home'&&<button className="headerClose" onClick={()=>go('home')} aria-label="Back home">×</button>}
    </header>
  </>;
}

function BottomNav({screen,go,start,libraryCount}){
  const items=[['home','⌂','Home'],['create','✦','Create'],['ready','▣','Ready'],['library','▤','Stories'],['profile','☺','Profile']];
  return <nav className="bottomNav" aria-label="Main navigation">{items.map(([id,icon,label])=><button key={id} className={screen===id?'active':''} onClick={()=>id==='create'?start():go(id)}><span>{icon}</span><small>{label}{id==='library'&&libraryCount?` ${libraryCount}`:''}</small></button>)}</nav>;
}

function ProfileFields({profile,setProfile,compact=false}){
  function bind(key){return {value:profile[key],onChange:e=>setProfile({...profile,[key]:e.target.value})};}
  if(compact) return <div className="quickProfileFields">
    <div className="field"><label>First name or nickname</label><input className="input" maxLength={24} placeholder="e.g. Isla" {...bind('childName')}/></div>
    <div className="field"><label>Age / story level</label><select className="select" {...bind('ageBand')}>{AGE_BANDS.map(age=><option key={age}>{age}</option>)}</select><small className="fieldHint">Choose what feels right for them.</small></div>
    <div className="field full"><label>What are they into right now?</label><textarea className="textarea short" placeholder="Dinosaurs, gymnastics, drawing, space…" {...bind('interests')}/></div>
  </div>;
  return <div className="profileFields">
    <div className="field"><label>First name or nickname</label><input className="input" maxLength={24} placeholder="e.g. Isla" {...bind('childName')}/></div>
    <div className="field"><label>Age / story level</label><select className="select" {...bind('ageBand')}>{AGE_BANDS.map(age=><option key={age}>{age}</option>)}</select><small className="fieldHint">Choose the level that suits them — it does not have to match their age exactly.</small></div>
    <div className="field full"><label>Interests & hobbies</label><textarea className="textarea" placeholder="Dinosaurs, gymnastics, football, drawing, space…" {...bind('interests')}/></div>
    <div className="field"><label>Pets — first names only</label><input className="input" placeholder="Max the dog, Luna the cat" {...bind('pets')}/></div>
    <div className="field"><label>Friends — first names only</label><input className="input" placeholder="Ava, Leo" {...bind('friends')}/></div>
    <div className="field"><label>Story feel</label><select className="select" {...bind('preferredTone')}><option>Magical and adventurous</option><option>Funny and silly</option><option>Cosy and gentle</option><option>Mystery and discovery</option><option>Brave and exciting</option></select></div>
    <div className="field"><label>Story length</label><select className="select" {...bind('storyLength')}><option>Quick — about 4 minutes</option><option>Bedtime — about 7 minutes</option><option>Longer — about 10 minutes</option></select></div>
    <div className="field full"><label>Anything to avoid</label><input className="input" placeholder="e.g. spiders, thunder, anything too scary" {...bind('avoid')}/></div>
    <div className="field full"><div className="privacyNote"><span>🔒</span><div><b>Stories need imagination, not identity.</b> First names and broad interests are enough. Please don’t enter surnames, schools, addresses, phone numbers or exact dates of birth.</div></div></div>
  </div>;
}

function ThemeCover({theme='Moon',compact=false}){
  return <div className={`themeCover theme-${String(theme).toLowerCase()} ${compact?'compact':''}`}><span className="coverStars">✦ · ✧ · ✦</span><span className="coverEmoji">{themeEmoji(theme)}</span><span className="coverLabel">{theme} adventure</span></div>;
}

function HeroWorlds(){
  return <div className="heroWorlds" aria-hidden="true">
    <div className="heroAurora"/>
    <div className="heroMoon">☾</div>
    <div className="worldOrb orbDragon"><span>🐉</span><small>dragon skies</small></div>
    <div className="worldOrb orbCastle"><span>🏰</span><small>secret kingdoms</small></div>
    <div className="worldOrb orbOcean"><span>🧜</span><small>underwater worlds</small></div>
    <div className="worldOrb orbForest"><span>🦁</span><small>animal adventures</small></div>
    <div className="worldOrb orbSpace"><span>🚀</span><small>star adventures</small></div>
    <div className="worldOrb orbDino"><span>🦕</span><small>prehistoric worlds</small></div>
    <div className="tinyCharacter charOne">👑</div>
    <div className="tinyCharacter charTwo">🦸</div>
    <div className="tinyCharacter charThree">🐙</div>
    <div className="tinyCharacter charFour">🧚</div>
    <div className="heroSparkles">✦　·　✧　·　✦　·　✧　·　✦</div>
  </div>;
}


function ReadyArt({scene=0,tile=false}){
  const palettes=[
    ['#f6a45d','#7067d8','#173d6a'],['#724cc5','#3d6cb4','#0f2e55'],['#7ed4e8','#3e85ad','#173957'],
    ['#f7b85d','#bf6c78','#3f426d'],['#f0a2c0','#8664ba','#2d3766'],['#8fd59a','#488b7b','#24455b'],
    ['#8570d8','#586fa8','#243552'],['#f4b35c','#4a879b','#213c55'],['#eea866','#6d6fc2','#273a5a'],['#223c69','#162646','#091528']
  ];
  const p=palettes[scene%palettes.length];
  const showCastle=[0,4,7].includes(scene);
  const showWater=[0,2,5,7].includes(scene);
  const night=scene===9;
  const x=scene===3?455:scene===6?520:scene===9?380:330;
  const y=scene===9?410:390;
  return <svg className={'readyArt '+(tile?'tile':'')} viewBox="0 0 800 620" role="img" aria-label="Jasper and Buddy exploring a magical valley">
    <defs>
      <linearGradient id={'sky'+scene} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p[0]}/><stop offset=".48" stopColor={p[1]}/><stop offset="1" stopColor={p[2]}/></linearGradient>
      <linearGradient id={'hill'+scene} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#355b58"/><stop offset="1" stopColor="#173b44"/></linearGradient>
      <radialGradient id={'glow'+scene}><stop stopColor="#fff1a8"/><stop offset="1" stopColor="#f7a83d" stopOpacity=".08"/></radialGradient>
      <filter id={'soft'+scene}><feGaussianBlur stdDeviation="13"/></filter>
    </defs>
    <rect width="800" height="620" rx={tile?28:0} fill={'url(#sky'+scene+')'}/>
    {!night&&<circle cx="675" cy="108" r="62" fill={'url(#glow'+scene+')'} opacity=".9"/>}
    {night&&<g fill="#fff7c7">{[55,130,210,310,420,540,630,720].map((sx,i)=><circle key={sx} cx={sx} cy={45+(i%3)*38} r={i%2?2.8:4}/>)}</g>}
    <path d="M0 330 Q120 220 245 330 T510 310 T800 285 L800 620 L0 620Z" fill="#304d61" opacity=".72"/>
    <path d="M0 395 Q140 285 275 390 T545 350 T800 350 L800 620 L0 620Z" fill={'url(#hill'+scene+')'}/>
    {showWater&&<path d="M520 305 C460 355 575 392 485 445 C410 490 465 545 360 620 L545 620 C590 545 530 500 600 449 C665 398 575 350 650 310Z" fill="#83dce6" opacity=".9"/>}
    {showCastle&&<g transform="translate(565 245)" fill="#ffe8a6"><rect x="0" y="55" width="112" height="72" rx="6"/><rect x="18" y="24" width="28" height="103"/><rect x="72" y="10" width="27" height="117"/><path d="M18 24 L32 0 L46 24ZM72 10 L85 -15 L99 10Z" fill="#f6c77c"/><g fill="#ffaf51"><rect x="15" y="74" width="10" height="16" rx="4"/><rect x="48" y="76" width="10" height="16" rx="4"/><rect x="81" y="61" width="10" height="16" rx="4"/></g></g>}
    {[0,1,2,4,5,6,7].includes(scene)&&<g opacity=".92">{[95,170,250,590,690].map((lx,i)=><g key={lx} transform={'translate('+lx+' '+(315+(i%2)*70)+')'}><circle r="22" fill="#ffbc52" opacity=".18" filter={'url(#soft'+scene+')'}/><circle r="7" fill="#ffd977"/></g>)}</g>}
    {scene===2&&<g transform="translate(78 218)"><path d="M0 0 H160 V180 Q80 230 0 180Z" fill="#70cfe4" opacity=".65"/><path d="M30 0 V188M75 0 V205M125 0 V188" stroke="#d9fbff" strokeWidth="10" strokeLinecap="round" opacity=".8"/></g>}
    {scene===3&&<g><path d="M80 360 Q400 240 720 360" fill="none" stroke="#9b6d4d" strokeWidth="18"/><path d="M80 344 Q400 225 720 344" fill="none" stroke="#e2bb76" strokeWidth="6" strokeDasharray="18 16"/></g>}
    {scene===6&&<g opacity=".72"><path d="M0 180 Q190 70 370 180 T800 165 V0 H0Z" fill="#584d88"/><path d="M60 210 l20 45M190 175 l18 55M620 175 l20 55M730 205 l17 42" stroke="#cad9ff" strokeWidth="5" strokeLinecap="round"/></g>}
    <g transform={'translate('+x+' '+y+') scale('+(tile?1.05:1)+')'}>
      <g transform="translate(-10 0)">
        <ellipse cx="0" cy="82" rx="40" ry="53" fill="#f1f0e7"/>
        <circle cx="0" cy="20" r="43" fill="#f0b27d"/>
        <path d="M-42 18 Q-28 -42 8 -35 Q46 -25 42 22 Q25 0 0 -4 Q-24 -1 -42 18Z" fill="#5a351f"/>
        <path d="M-35 2 Q-20 -36 1 -24 M-8 -28 Q18 -40 34 -13 M17 -25 Q43 -18 40 8" fill="none" stroke="#3c261b" strokeWidth="12" strokeLinecap="round"/>
        <circle cx="-14" cy="19" r="5" fill="#2f2725"/><circle cx="15" cy="19" r="5" fill="#2f2725"/>
        <path d="M-8 36 Q2 43 13 35" fill="none" stroke="#aa5b4a" strokeWidth="3" strokeLinecap="round"/>
        <rect x="-37" y="69" width="74" height="72" rx="18" fill="#e8e3d8"/>
        <rect x="-47" y="74" width="17" height="66" rx="8" fill="#33546b"/><rect x="30" y="74" width="17" height="66" rx="8" fill="#33546b"/>
        <rect x="-46" y="62" width="23" height="72" rx="12" fill="#31566a" opacity=".95"/>
        <path d="M-28 139 L-37 197M27 139 L40 197" stroke="#344c61" strokeWidth="19" strokeLinecap="round"/>
        <path d="M-49 194 h38M20 194 h38" stroke="#23364a" strokeWidth="14" strokeLinecap="round"/>
      </g>
      <g transform="translate(76 82)">
        <ellipse cx="0" cy="56" rx="58" ry="40" fill="#d99b52"/>
        <circle cx="38" cy="15" r="39" fill="#e1a65e"/>
        <path d="M10 -5 Q-4 -35 15 -30 L35 0ZM64 -5 Q84 -35 89 -18 L70 10Z" fill="#b87942"/>
        <ellipse cx="54" cy="25" rx="20" ry="14" fill="#f0c98e"/>
        <circle cx="29" cy="10" r="5" fill="#2c241f"/><circle cx="54" cy="19" r="4" fill="#2c241f"/>
        <path d="M-49 63 Q-82 43 -79 74" fill="none" stroke="#d99b52" strokeWidth="18" strokeLinecap="round"/>
        <path d="M-35 89 V120M21 88 V120" stroke="#c88749" strokeWidth="16" strokeLinecap="round"/>
      </g>
    </g>
    <g opacity=".55" fill="#fff3b0">{[40,110,225,480,610,745].map((sx,i)=><circle key={sx} cx={sx} cy={190+(i%3)*55} r={i%2?3:5}/>)}</g>
  </svg>;
}

function ReadyLibraryScreen({openBook}){
  const book=READY_BOOKS[0];
  return <main className="screenPage readyLibrary">
    <div className="screenIntro"><span className="kicker">Subscriber library</span><h1>Ready to read.</h1><p>Beautiful finished stories for nights when you just want to pick a book and begin. No profile, no setup.</p></div>
    <div className="readyFilterRow"><button className="active">All</button><button>Ages 0–3</button><button>Ages 4–6</button><button>Ages 7–9</button><button>Ages 10–12</button><button>Older</button></div>
    <div className="readyLibraryMeta"><span><b>1</b> showcase story live</span><span>Eventually: hundreds of subscriber books</span></div>
    <div className="readyGrid"><button className="readyBookTile" onClick={()=>openBook(book)}><div className="readyTileArt"><ReadyArt scene={0} tile/><div className="readyTileBadges"><span>Ages {book.age}</span><span>{book.minutes} min</span></div></div><div className="readyTileCopy"><small>{book.category}</small><h2>{book.title}</h2><p>{book.strapline}</p><div className="readyTileFooter"><span>Illustrated</span><span>🔊 Narrated</span><b>Open →</b></div></div></button></div>
    <div className="readyComing"><span>✦</span><div><strong>This becomes the big library.</strong><p>Genre shelves, age filters, new releases, favourites, series and eventually hundreds — or thousands — of books included with a subscription.</p></div></div>
  </main>;
}

function ReadyDetailScreen({book,onBack,onRead}){
  return <main className="screenPage readyDetail">
    <button className="backLink" onClick={onBack}>← Ready to read</button>
    <section className="readyDetailHero"><div className="readyDetailArt"><ReadyArt scene={0}/></div><div className="readyDetailCopy"><span className="kicker">Tiny Bedtime Tales Original</span><h1>{book.title}</h1><div className="readyMetaRow"><span>Ages {book.age}</span><span>◷ {book.minutes} min</span><span>10 pages</span></div><p>{book.description}</p><div className="chipRow">{book.tags.map(tag=><span key={tag}>{tag}</span>)}</div><button className="primaryBtn readyMainBtn" onClick={()=>onRead(true)}>▶ Read & listen</button><button className="readyReadOnlyBtn" onClick={()=>onRead(false)}>▣ Read only</button></div></section>
    <section className="readyPromise"><article><span>🎨</span><strong>Consistent story art</strong><small>Jasper and Buddy stay recognisable from first page to last.</small></article><article><span>🔊</span><strong>Narration mode</strong><small>Pages move on automatically as the narrator finishes.</small></article><article><span>☾</span><strong>Built for bedtime</strong><small>A complete adventure with a calm, satisfying landing.</small></article></section>
  </main>;
}

function ReadyReader({book,onClose,initialNarration=false}){
  const [page,setPage]=useState(0);
  const [playing,setPlaying]=useState(initialNarration);
  const [touchX,setTouchX]=useState(null);
  const [textLarge,setTextLarge]=useState(false);
  const current=book.pages[page];

  useEffect(()=>{
    if(typeof window==='undefined'||!window.speechSynthesis||!playing)return;
    let active=true;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(current.heading+'. '+current.text);
    const voices=window.speechSynthesis.getVoices();
    utterance.voice=voices.find(v=>v.lang==='en-GB')||voices.find(v=>v.lang&&v.lang.startsWith('en'))||null;
    utterance.rate=.9;utterance.pitch=1.01;
    utterance.onend=()=>{if(!active)return;if(page<book.pages.length-1)setPage(p=>p+1);else setPlaying(false);};
    utterance.onerror=()=>{if(active)setPlaying(false);};
    const timer=setTimeout(()=>window.speechSynthesis.speak(utterance),80);
    return()=>{active=false;clearTimeout(timer);utterance.onend=null;window.speechSynthesis.cancel();};
  },[page,playing,current.heading,current.text,book.pages.length]);

  useEffect(()=>()=>{if(typeof window!=='undefined'&&window.speechSynthesis)window.speechSynthesis.cancel();},[]);

  function move(delta){setPage(p=>Math.max(0,Math.min(book.pages.length-1,p+delta)));}
  function swipeEnd(x){if(touchX===null)return;const d=x-touchX;if(Math.abs(d)>55)move(d<0?1:-1);setTouchX(null);}
  async function fullScreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else await document.exitFullscreen?.();}catch{}}

  return <div className={'readyReader '+(textLarge?'largeText':'')} onTouchStart={e=>setTouchX(e.changedTouches[0].clientX)} onTouchEnd={e=>swipeEnd(e.changedTouches[0].clientX)}>
    <header className="readyReaderTop"><button onClick={onClose}>×</button><div><strong>{book.shortTitle}</strong><small>{page+1} / {book.pages.length}</small></div><div className="readyReaderTopActions"><button onClick={()=>setTextLarge(v=>!v)}>Aa</button><button onClick={fullScreen}>⛶</button></div></header>
    <div className="readyPage">
      <div className="readyPageArt"><ReadyArt scene={current.scene}/><div className="readyArtFade"/></div>
      <article className="readyPageCopy"><span className="readyPageNum">PAGE {page+1}</span><h2>{current.heading}</h2>{current.text.split('\n\n').map((para,i)=><p key={i}>{para}</p>)}</article>
    </div>
    <div className="readyReaderControls">
      <div className="readyProgress"><i style={{width:(((page+1)/book.pages.length)*100)+'%'}}/></div>
      <div className="readyControlRow"><button disabled={page===0} onClick={()=>move(-1)}>‹</button><button className="narrateBtn" onClick={()=>setPlaying(v=>!v)}>{playing?'Ⅱ':'▶'}<span>{playing?'Stop narration':'Narrate'}</span></button><button disabled={page===book.pages.length-1} onClick={()=>move(1)}>›</button></div>
      <div className="swipeHint">Swipe to turn the page {playing?'· pages turn automatically while narrated':''}</div>
    </div>
  </div>;
}

function StoryView({story,onBack,onRegenerate,onContinue}){
  const [speaking,setSpeaking]=useState(false);
  const [copied,setCopied]=useState(false);
  async function copyStory(){
    const text=story.title+'\n\n'+story.pages.map(p=>p.heading+'\n'+p.text).join('\n\n')+'\n\n'+(story.bedtimeLine||'');
    try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{}
  }
  function listen(){
    if(typeof window==='undefined'||!window.speechSynthesis)return;
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
    const text=story.title+'. '+story.pages.map(p=>p.heading+'. '+p.text).join(' ')+'. '+(story.bedtimeLine||'');
    const utterance=new SpeechSynthesisUtterance(text);utterance.rate=.88;utterance.pitch=1.02;utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);setSpeaking(true);window.speechSynthesis.speak(utterance);
  }
  return <section className="storyReader">
    <button className="backLink" onClick={onBack}>← All stories</button>
    <div className="readerCover">
      <ThemeCover theme={story.theme}/>
      <div className="readerCoverCopy"><div className="eyebrow">A TINY BEDTIME TALE</div><h1>{story.title}</h1><p>{story.strapline}</p><div className="chipRow"><span>{story.theme}</span><span>About {story.readingMinutes||7} min</span><span>{PACKAGES[story.packageType]?.[0]||'Story'}</span></div></div>
    </div>
    <div className="readerActions">{story.packageType!=='read'&&<button className="actionBtn primaryAction" onClick={listen}>{speaking?'■ Stop':'▶ Listen'}</button>}<button className="actionBtn" onClick={onRegenerate}>↻ New version</button><button className="actionBtn" onClick={onContinue}>＋ Next chapter</button><button className="actionBtn iconOnly" onClick={copyStory}>{copied?'✓':'⧉'}</button></div>
    <div className="storyPages">{story.pages.map((page,i)=><article className="storyPage" key={i}><div className="pageNumber">{String(i+1).padStart(2,'0')}</div><h2>{page.heading}</h2><p>{page.text}</p></article>)}</div>
    <div className="goodnightCard"><span>☾</span><p>{story.bedtimeLine||'Goodnight, little hero.'}</p></div>
    <div className="quietMeta">{story.engine==='ai-gateway'?'Generated by the Tiny Bedtime story engine':'Preview story engine'} · saved on this device</div>
  </section>;
}

function HomeScreen({start,go,library,setBrief}){
  function launch(format,theme){setBrief(current=>({...current,format,theme:theme||current.theme}));start();}
  return <main className="homeScreen">
    <section className="heroCard magicalHero">
      <HeroWorlds/>
      <div className="heroShade"/>
      <div className="heroCopy"><div className="eyebrow light">A NEW ADVENTURE FOR TONIGHT</div><h1>Tonight, <em>they’re</em> the hero.</h1><p>One bedtime. Endless worlds. Stories made around the things they already love.</p><button className="primaryBtn heroButton" onClick={start}>Create their first story — free</button><div className="heroTrust">First story free · No card · Ready in moments</div></div>
    </section>

    <section className="appSection first"><div className="sectionTitle"><div><span className="kicker">Tonight</span><h2>What kind of story do you need?</h2></div></div><div className="intentScroller">{Object.entries(FORMATS).map(([id,item])=><button className="intentCard" key={id} onClick={()=>launch(id)}><span className="intentIcon">{item.icon}</span><strong>{item.label}</strong><small>{item.copy}</small><span className="arrow">→</span></button>)}</div></section>

    {library.length>0&&<section className="appSection"><div className="sectionTitle"><div><span className="kicker">Their library</span><h2>Pick up a favourite.</h2></div><button className="textBtn" onClick={()=>go('library')}>See all</button></div><div className="recentScroller">{library.slice(0,4).map(story=><button className="recentCard" key={story.id} onClick={()=>go('library')}><ThemeCover theme={story.theme} compact/><div><strong>{story.title}</strong><small>{story.theme} · {story.readingMinutes||7} min</small></div></button>)}</div></section>}

    <section className="appSection exampleSection"><div className="sectionTitle"><div><span className="kicker">Try the feeling first</span><h2>Stories they could be asking for tonight.</h2></div></div><div className="exampleScroller">
      <button className="exampleBook" onClick={()=>launch('standalone','Dragon')}><ThemeCover theme="Dragon"/><div><small>MAGICAL ADVENTURE</small><strong>The Dragon Who Lost His Roar</strong><span>About 7 min · cosy ending</span></div></button>
      <button className="exampleBook" onClick={()=>launch('support','Animals')}><ThemeCover theme="Animals"/><div><small>GENTLE BEDTIME</small><strong>The Little Lion Who Found His Brave</strong><span>About 5 min · reassuring</span></div></button>
      <button className="exampleBook" onClick={()=>launch('special','Space')}><ThemeCover theme="Space"/><div><small>BIG LITTLE MOMENT</small><strong>The Rocket to Tomorrow Morning</strong><span>About 7 min · first-day magic</span></div></button>
    </div></section>

    <section className="sampleSection"><div className="samplePhoto"><img src={PHOTOS.family} alt="Family reading together at bedtime"/></div><div className="sampleCopy"><span className="kicker">Made to read together</span><h2>A story that feels like it was written just for them.</h2><p>Tell us a little about who they are and what they love. We turn that into a complete bedtime adventure you can read together, listen to, revisit and continue another night.</p><div className="benefitRow"><span>✓ First story free</span><span>✓ Language matched to them</span><span>✓ Happy, cosy endings</span></div><button className="secondaryBtn" onClick={start}>Make tonight’s story</button></div></section>

    <section className="appSection"><div className="sectionTitle"><div><span className="kicker">A world that remembers</span><h2>Not just another one-off story.</h2></div></div><div className="featureStack"><article><span>📚</span><div><h3>Continue the adventure</h3><p>Characters, places and little promises can return in the next chapter.</p></div></article><article><span>🎈</span><div><h3>Turn real moments into magic</h3><p>First day of school, a new sibling, birthdays, holidays or losing a tooth.</p></div></article><article><span>💛</span><div><h3>Gentle stories for wobbly moments</h3><p>Bedtime nerves, trying something new or simply needing a calmer ending to the day.</p></div></article></div></section>


    <section className="appSection pricingSection"><div className="sectionTitle centred"><div><span className="kicker">Working proposition</span><h2>Choose how bedtime feels.</h2><p>Checkout stays switched off while the product is in development.</p></div></div><div className="pricingCards">{Object.entries(PACKAGES).map(([id,pack])=><article className={`priceCard ${id==='audio'?'featured':''}`} key={id}>{id==='audio'&&<span className="popular">MOST NATURAL START</span>}<h3>{pack[0]}</h3><div className="price">{pack[1]} <small>per story</small></div><p>{pack[2]}</p><button className="secondaryBtn" onClick={()=>{setBrief(current=>({...current,packageType:id}));start();}}>Choose {pack[0].toLowerCase()}</button></article>)}</div></section>
  </main>;
}

function CreateScreen({profile,setProfile,brief,setBrief,generate,loading,error,go}){
  const hasProfile=Boolean(profile.childName.trim());
  const [step,setStep]=useState(hasProfile?2:1);
  const labels=['Hero','Tonight','World','Enjoy'];
  function next(){setStep(current=>Math.min(4,current+1));if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});}
  function back(){setStep(current=>Math.max(1,current-1));if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});}
  return <main className="screenPage createPage">
    <div className="screenIntro compactIntro"><span className="kicker">Tonight’s story</span><h1>Make a little magic.</h1><p>Four small choices. We’ll do the writing.</p></div>

    {loading?<div className="magicLoading"><div className="moonLoader">☾</div><h2>Writing their adventure…</h2><p>Building a beginning, a brave little middle and a cosy way home.</p><div className="loadingSteps"><span>Writing</span><span>Checking</span><span>Finishing</span></div></div>:<div className="guidedFlow">
      <div className="flowProgress" aria-label="Story creation progress">{labels.map((label,index)=>{const number=index+1;return <button key={label} type="button" className={`progressStep ${step===number?'active':''} ${step>number?'done':''}`} onClick={()=>setStep(number)}><span>{step>number?'✓':number}</span><small>{label}</small></button>;})}</div>

      {step===1&&<section className="flowCard singleFlowCard"><div className="flowHeading"><span className="stepBadge">1</span><div><h2>Who’s the hero?</h2><p>Keep it light — first name, age and what they love right now.</p></div></div>{hasProfile&&<div className="profileSummary miniSummary"><div className="avatar">{initial(profile.childName)}</div><div><small>Current hero</small><strong>{profile.childName}</strong><span>Ages {profile.ageBand}</span></div></div>}<ProfileFields profile={profile} setProfile={setProfile} compact/><button className="quietLink" onClick={()=>go('profile')}>Add pets, friends and more details later →</button><div className="flowFooter"><span>{hasProfile?'Looks good.':'A first name or nickname is all we really need.'}</span><button className="primaryBtn" disabled={!profile.childName.trim()} onClick={next}>Continue →</button></div></section>}

      {step===2&&<section className="flowCard singleFlowCard"><div className="flowHeading"><span className="stepBadge">2</span><div><h2>What does tonight need?</h2><p>Tap the kind of story that fits the moment.</p></div></div><div className="modeGrid appModeGrid">{Object.entries(FORMATS).map(([id,item])=><button type="button" key={id} className={`modeChoice ${brief.format===id?'active':''}`} onClick={()=>setBrief({...brief,format:id})}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.copy}</small></button>)}</div><div className="flowFooter"><button className="backBtn" onClick={back}>← Back</button><button className="primaryBtn" onClick={next}>Choose a world →</button></div></section>}

      {step===3&&<section className="flowCard singleFlowCard"><div className="flowHeading"><span className="stepBadge">3</span><div><h2>Pick their world.</h2><p>Choose a world they already love, or make up one of your own.</p></div></div><div className="themeScroller bigThemes">{THEMES.map(([name,emoji])=><button type="button" key={name} className={`themeChoice ${brief.theme===name?'active':''}`} onClick={()=>setBrief({...brief,theme:name})}><span>{emoji}</span><small>{name}</small></button>)}</div>{brief.theme==='Other'&&<div className="field spaced customWorldField"><label>What world should we create?</label><input className="input" maxLength={80} value={brief.customWorld||''} onChange={e=>setBrief({...brief,customWorld:e.target.value})} placeholder="e.g. tractors, ballet, monster trucks, unicorn school…"/></div>}{brief.format==='special'&&<div className="field spaced"><label>What’s the occasion?</label><input className="input" value={brief.occasion} onChange={e=>setBrief({...brief,occasion:e.target.value})} placeholder="Birthday, first day at school, Christmas…"/></div>}<div className="field spaced"><label>Anything you’d love included? <i>Optional</i></label><textarea className="textarea short" value={brief.request} onChange={e=>setBrief({...brief,request:e.target.value})} placeholder={brief.format==='support'?'e.g. A gentle story about feeling brave when the bedroom is dark':'e.g. A treasure hunt, a silly sidekick, or a surprise at the end'}/></div><div className="flowFooter"><button className="backBtn" onClick={back}>← Back</button><button className="primaryBtn" disabled={brief.theme==='Other'&&!brief.customWorld.trim()} onClick={next}>Nearly there →</button></div></section>}

      {step===4&&<section className="flowCard singleFlowCard experienceCard"><div className="flowHeading"><span className="stepBadge">4</span><div><h2>How will you enjoy it?</h2><p>Read, listen, or make it feel like a little picture book.</p></div></div><div className="experienceList">{Object.entries(PACKAGES).map(([id,pack])=><button type="button" key={id} className={`experienceChoice ${brief.packageType===id?'active':''}`} onClick={()=>setBrief({...brief,packageType:id})}><span className="radioDot"/><div><strong>{pack[0]}</strong><small>{pack[2]}</small></div><b>{pack[1]}</b></button>)}</div>{error&&<div className="errorCard">{error}</div>}<div className="storyReadyCard"><span>{themeEmoji(brief.theme)}</span><div><small>Ready to make</small><strong>{themeLabel(brief)} · {FORMATS[brief.format].label}</strong><p>First story free in this development preview.</p></div></div><div className="flowFooter finalFlowFooter"><button className="backBtn" onClick={back}>← Back</button><button className="primaryBtn magicBtn" onClick={()=>generate(false)}>✨ Make the magic</button></div></section>}
    </div>}
  </main>;
}

function LibraryScreen({library,setLibrary,setStory,go,start}){
  return <main className="screenPage"><div className="screenIntro"><span className="kicker">Story library</span><h1>Their worlds live here.</h1><p>Open an old favourite or continue a world another night.</p></div>{library.length?<div className="libraryList">{library.map((story,i)=><article className="libraryCard" key={story.id}><ThemeCover theme={story.theme} compact/><div className="libraryCopy"><small>{new Date(story.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · {story.theme}</small><h2>{story.title}</h2><p>{story.strapline}</p><div className="libraryActions"><button className="secondaryBtn small" onClick={()=>{setStory(story);go('story')}}>Open story</button><button className="removeBtn" onClick={()=>setLibrary(library.filter(x=>x.id!==story.id))}>Remove</button></div></div></article>)}</div>:<div className="emptyState"><span>📖</span><h2>Your first story will live here.</h2><p>Once you make an adventure, it is saved on this device so you can come back to it.</p><button className="primaryBtn" onClick={start}>Create first story</button></div>}</main>;
}

function ProfileScreen({profile,setProfile,start}){
  return <main className="screenPage"><div className="screenIntro"><span className="kicker">Child story profile</span><h1>The little things they love.</h1><p>Keep this broad. It is a storytelling profile, not an identity profile.</p></div><div className="profilePageGrid"><section className="flowCard"><ProfileFields profile={profile} setProfile={setProfile}/><div className="profileSave"><span>Changes save automatically on this device.</span><button className="primaryBtn compact" onClick={start}>Use in a story</button></div></section><aside className="privacySide"><span>🔒</span><h2>Minimum useful detail.</h2><p>We deliberately do not ask for child photos, surnames, exact dates of birth, addresses, schools or phone numbers.</p><p>Broad interests and first names are enough to make a story feel personal.</p></aside></div></main>;
}

export default function Home(){
  const [screen,setScreen]=useState('home');
  const [profile,setProfile]=useState(DEFAULT_PROFILE);
  const [brief,setBrief]=useState(DEFAULT_BRIEF);
  const [library,setLibrary]=useState([]);
  const [story,setStory]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{setProfile(readStore('tbt-profile',DEFAULT_PROFILE));setLibrary(readStore('tbt-library',[]));setHydrated(true);},[]);
  useEffect(()=>{if(hydrated)writeStore('tbt-profile',profile);},[profile,hydrated]);
  useEffect(()=>{if(hydrated)writeStore('tbt-library',library);},[library,hydrated]);
  const latestSeriesMemory=useMemo(()=>library.find(item=>item.seriesMemory)?.seriesMemory||'',[library]);
  function go(target){setError('');setScreen(target);if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});}
  function start(){go('create');}
  async function generate(regenerate){
    if(!profile.childName.trim()){setError('Add a first name or nickname so the story knows who its hero is.');return;}
    setError('');setLoading(true);
    try{
      const previous=regenerate&&story?{title:story.title,pages:story.pages.map(p=>p.text).join(' ').slice(0,1600)}:null;
      const response=await fetch('/api/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,brief,seriesMemory:brief.format==='continue'?(brief.seriesMemory||latestSeriesMemory):'',previousStory:previous})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'We could not make that story just now.');
      const saved={...data,id:uid(),createdAt:new Date().toISOString(),packageType:brief.packageType,format:brief.format,profileSnapshot:{childName:profile.childName,ageBand:profile.ageBand}};
      setStory(saved);setLibrary(items=>{const kept=regenerate&&story?items.filter(x=>x.id!==story.id):items;return [saved,...kept].slice(0,60);});setScreen('story');if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){setError(e.message||'Something went wrong while making the story.');}finally{setLoading(false);}
  }
  function continueStory(){setBrief(current=>({...current,format:'continue',theme:story?.theme||current.theme,seriesMemory:story?.seriesMemory||'',request:`Continue the adventure from “${story?.title||'the last story'}”.`}));go('create');}

  return <div className="appShell">
    <AppHeader screen={screen} go={go} start={start}/>
    {screen==='home'&&<HomeScreen start={start} go={go} library={library} setBrief={setBrief}/>} 
    {screen==='create'&&<CreateScreen profile={profile} setProfile={setProfile} brief={brief} setBrief={setBrief} generate={generate} loading={loading} error={error} go={go}/>} 
    {screen==='library'&&<LibraryScreen library={library} setLibrary={setLibrary} setStory={setStory} go={go} start={start}/>} 
    {screen==='profile'&&<ProfileScreen profile={profile} setProfile={setProfile} start={start}/>} 
    {screen==='story'&&story&&<main className="screenPage readerPage"><StoryView story={story} onBack={()=>go('library')} onRegenerate={()=>generate(true)} onContinue={continueStory}/></main>}
    {screen==='story'&&!story&&<main className="screenPage"><div className="emptyState"><span>🌙</span><h2>Pick a story from your library.</h2><button className="primaryBtn" onClick={()=>go('library')}>Open library</button></div></main>}
    <footer className="footer"><div><strong>☾ Tiny Bedtime Tales</strong><small>Parent-led personalised storytelling with deliberately minimal child data.</small></div><a href="/privacy">Privacy approach</a></footer>
    <BottomNav screen={screen} go={go} start={start} libraryCount={library.length}/>
  </div>;
}
