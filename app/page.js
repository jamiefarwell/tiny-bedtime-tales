'use client';

import { useEffect, useMemo, useState } from 'react';

const THEMES = [
  ['Moon','🌙'],['Dragon','🐉'],['Ocean','🐳'],['Forest','🦊'],
  ['Dinosaur','🦕'],['Castle','🏰'],['Space','🚀'],['Pirates','🏴‍☠️']
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
  childName:'', ageBand:'6–7', interests:'', pets:'', friends:'', favouriteThings:'',
  preferredTone:'Magical and adventurous', storyLength:'Bedtime — about 7 minutes', avoid:''
};
const DEFAULT_BRIEF = {theme:'Dragon',format:'standalone',request:'',occasion:'',packageType:'audio'};

function readStore(key,fallback){
  if(typeof window==='undefined') return fallback;
  try{const value=window.localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{return fallback;}
}
function writeStore(key,value){try{window.localStorage.setItem(key,JSON.stringify(value));}catch{}}
function uid(){return String(Date.now())+'-'+Math.random().toString(36).slice(2,8);}
function initial(name){return (String(name||'').trim()[0]||'★').toUpperCase();}
function themeEmoji(theme){return EMOJI[theme]||'✨';}

function AppHeader({screen,go,start}){
  return <>
    <div className="devbar"><span className="devpill">IN DEVELOPMENT</span><span>Prototype currently being developed by <strong>Greg Godfrey</strong></span></div>
    <header className="appHeader">
      <button className="brand" onClick={()=>go('home')}><span className="brandMoon">☾</span><span>Tiny Bedtime Tales</span></button>
      <div className="desktopActions"><button className="textBtn" onClick={()=>go('library')}>My stories</button><button className="primaryBtn compact" onClick={start}>Create a story</button></div>
      {screen!=='home'&&<button className="headerClose" onClick={()=>go('home')} aria-label="Back home">×</button>}
    </header>
  </>;
}

function BottomNav({screen,go,start,libraryCount}){
  const items=[['home','⌂','Home'],['create','✦','Create'],['library','▤','Stories'],['profile','☺','Profile']];
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
    <div className="field full"><label>Favourite things</label><textarea className="textarea" placeholder="Animals, toys, films, colours or anything they love right now…" {...bind('favouriteThings')}/></div>
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
    <div className="worldOrb orbOcean"><span>🐳</span><small>ocean quests</small></div>
    <div className="worldOrb orbForest"><span>🦊</span><small>enchanted woods</small></div>
    <div className="worldOrb orbSpace"><span>🚀</span><small>star adventures</small></div>
    <div className="worldOrb orbDino"><span>🦕</span><small>prehistoric worlds</small></div>
    <div className="tinyCharacter charOne">🧚</div>
    <div className="tinyCharacter charTwo">🦄</div>
    <div className="tinyCharacter charThree">🐙</div>
    <div className="tinyCharacter charFour">🧙</div>
    <div className="heroSparkles">✦　·　✧　·　✦　·　✧　·　✦</div>
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
      <button className="exampleBook" onClick={()=>launch('standalone','Dragon')}><ThemeCover theme="Dragon"/><div><small>MAGICAL ADVENTURE</small><strong>The Dragon Who Lost the Moon</strong><span>About 7 min · cosy ending</span></div></button>
      <button className="exampleBook" onClick={()=>launch('support','Moon')}><ThemeCover theme="Moon"/><div><small>GENTLE BEDTIME</small><strong>The Night Light That Learned to Glow</strong><span>About 5 min · reassuring</span></div></button>
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

      {step===3&&<section className="flowCard singleFlowCard"><div className="flowHeading"><span className="stepBadge">3</span><div><h2>Where are we going?</h2><p>Pick a world, then add a little twist only if you want one.</p></div></div><div className="themeScroller bigThemes">{THEMES.map(([name,emoji])=><button type="button" key={name} className={`themeChoice ${brief.theme===name?'active':''}`} onClick={()=>setBrief({...brief,theme:name})}><span>{emoji}</span><small>{name}</small></button>)}</div>{brief.format==='special'&&<div className="field spaced"><label>What’s the occasion?</label><input className="input" value={brief.occasion} onChange={e=>setBrief({...brief,occasion:e.target.value})} placeholder="Birthday, first day at school, Christmas…"/></div>}<div className="field spaced"><label>Anything you’d love included? <i>Optional</i></label><textarea className="textarea short" value={brief.request} onChange={e=>setBrief({...brief,request:e.target.value})} placeholder={brief.format==='support'?'e.g. A gentle story about feeling brave when the bedroom is dark':'e.g. A moon treasure hunt with a funny purple dragon'}/></div><div className="flowFooter"><button className="backBtn" onClick={back}>← Back</button><button className="primaryBtn" onClick={next}>Nearly there →</button></div></section>}

      {step===4&&<section className="flowCard singleFlowCard experienceCard"><div className="flowHeading"><span className="stepBadge">4</span><div><h2>How will you enjoy it?</h2><p>Read, listen, or make it feel like a little picture book.</p></div></div><div className="experienceList">{Object.entries(PACKAGES).map(([id,pack])=><button type="button" key={id} className={`experienceChoice ${brief.packageType===id?'active':''}`} onClick={()=>setBrief({...brief,packageType:id})}><span className="radioDot"/><div><strong>{pack[0]}</strong><small>{pack[2]}</small></div><b>{pack[1]}</b></button>)}</div>{error&&<div className="errorCard">{error}</div>}<div className="storyReadyCard"><span>{themeEmoji(brief.theme)}</span><div><small>Ready to make</small><strong>{brief.theme} · {FORMATS[brief.format].label}</strong><p>First story free in this development preview.</p></div></div><div className="flowFooter finalFlowFooter"><button className="backBtn" onClick={back}>← Back</button><button className="primaryBtn magicBtn" onClick={()=>generate(false)}>✨ Make the magic</button></div></section>}
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
