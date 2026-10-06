'use client';

import { useEffect, useMemo, useState } from 'react';

const THEMES = [
  ['Moon','🌙'],['Dragon','🐉'],['Ocean','🐳'],['Forest','🦊'],
  ['Dinosaur','🦕'],['Castle','🏰'],['Space','🚀'],['Pirates','🏴‍☠️']
];
const EMOJI = Object.fromEntries(THEMES);
const FORMATS = {
  standalone:'A brand-new adventure',
  continue:'Continue an adventure',
  special:'Special occasion story',
  support:'A gentle helping story'
};
const PACKAGES = {
  read:['Read only','£2.50 / story'],
  audio:['Read + audio','£3.00 / story'],
  illustrated:['Illustrated','£4.00 / story']
};
const DEFAULT_PROFILE = {
  childName:'', ageBand:'6–7', interests:'', pets:'', friends:'', favouriteThings:'',
  preferredTone:'Magical and adventurous', storyLength:'Bedtime — about 7 minutes', avoid:''
};
const DEFAULT_BRIEF = {theme:'Dragon',format:'standalone',request:'',occasion:'',packageType:'illustrated'};

function readStore(key,fallback){
  if(typeof window==='undefined') return fallback;
  try{const v=window.localStorage.getItem(key);return v?JSON.parse(v):fallback;}catch{return fallback;}
}
function writeStore(key,value){try{window.localStorage.setItem(key,JSON.stringify(value));}catch{}}
function uid(){return String(Date.now())+'-'+Math.random().toString(36).slice(2,8);}
function initial(name){return (String(name||'').trim()[0]||'★').toUpperCase();}

function Art({theme='Moon',page=0,large=false}){
  const palette={Moon:['#153b68','#081a36'],Dragon:['#174b48','#0a2431'],Ocean:['#10617a','#06283e'],Forest:['#1e5b44','#0b2b25'],Dinosaur:['#4a5e3c','#172b29'],Castle:['#453d6f','#15182f'],Space:['#293a78','#090e2b'],Pirates:['#2a5970','#102a3e']}[theme]||['#153b68','#081a36'];
  const stars=Array.from({length:large?15:8},(_,i)=>i);
  const hero=EMOJI[theme]||'🌙';
  return <div style={{position:'absolute',inset:0,overflow:'hidden',background:'linear-gradient(145deg,'+palette[0]+','+palette[1]+')'}}>
    <div style={{position:'absolute',right:'8%',top:'7%',width:large?150:90,height:large?150:90,borderRadius:'50%',background:'radial-gradient(circle,#ffe09a 0%,rgba(255,213,125,.18) 55%,transparent 72%)'}} />
    {stars.map(function(i){return <span key={i} style={{position:'absolute',left:(7+(i*37)%87)+'%',top:(6+(i*29+page*11)%55)+'%',fontSize:(i%3===0?10:6),opacity:.72,color:'#fff5cf'}}>✦</span>;})}
    <div style={{position:'absolute',left:'-8%',right:'-8%',bottom:'-17%',height:'45%',borderRadius:'50% 50% 0 0',background:'rgba(2,14,30,.48)',transform:'rotate('+(page%2?'-2':'2')+'deg)'}} />
    <div style={{position:'absolute',left:large?'52%':'50%',top:large?'35%':'33%',transform:'translate(-50%,-50%)',fontSize:large?118:70,filter:'drop-shadow(0 15px 18px rgba(0,0,0,.28))'}}>{hero}</div>
    {large&&<><div style={{position:'absolute',left:'19%',bottom:'15%',fontSize:78}}>🧒⚔️</div><div style={{position:'absolute',left:'38%',bottom:'13%',fontSize:78}}>👸✨</div><div style={{position:'absolute',right:'9%',bottom:'14%',fontSize:72}}>🏰</div></>}
  </div>;
}

function ProfileFields({profile,setProfile}){
  function bind(key){return {value:profile[key],onChange:function(e){setProfile(Object.assign({},profile,{[key]:e.target.value}));}};}
  return <div className="formGrid">
    <div className="field"><label>First name or nickname</label><input className="input" maxLength={24} placeholder="e.g. Isla" {...bind('childName')} /></div>
    <div className="field"><label>Age band</label><select className="select" {...bind('ageBand')}><option>4–5</option><option>6–7</option><option>8–9</option></select></div>
    <div className="field full"><label>Interests & hobbies</label><textarea className="textarea" placeholder="Dinosaurs, gymnastics, football, drawing, space…" {...bind('interests')} /></div>
    <div className="field"><label>Pets — first names only</label><input className="input" placeholder="Max the dog, Luna the cat" {...bind('pets')} /></div>
    <div className="field"><label>Friends — first names only</label><input className="input" placeholder="Ava, Leo" {...bind('friends')} /></div>
    <div className="field full"><label>Favourite things</label><textarea className="textarea" placeholder="Animals, toys, films, colours, places or anything they love right now…" {...bind('favouriteThings')} /></div>
    <div className="field"><label>Story feel</label><select className="select" {...bind('preferredTone')}><option>Magical and adventurous</option><option>Funny and silly</option><option>Cosy and gentle</option><option>Mystery and discovery</option><option>Brave and exciting</option></select></div>
    <div className="field"><label>Story length</label><select className="select" {...bind('storyLength')}><option>Quick — about 4 minutes</option><option>Bedtime — about 7 minutes</option><option>Longer — about 10 minutes</option></select></div>
    <div className="field full"><label>Anything to avoid</label><input className="input" placeholder="e.g. spiders, thunder, anything too scary" {...bind('avoid')} /></div>
    <div className="field full"><div className="privacyNote"><span>🔒</span><div><b>Keep it general.</b> First names and broad interests are plenty. Please don’t enter surnames, schools, addresses, phone numbers, exact dates of birth or other identifying details.</div></div></div>
  </div>;
}

function StoryView({story,onBack,onRegenerate,onContinue}){
  const [speaking,setSpeaking]=useState(false);
  function listen(){
    if(typeof window==='undefined'||!window.speechSynthesis) return;
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}
    const text=story.title+'. '+story.pages.map(function(p){return p.heading+'. '+p.text;}).join(' ')+'. '+(story.bedtimeLine||'');
    const u=new SpeechSynthesisUtterance(text);u.rate=.88;u.pitch=1.02;u.onend=function(){setSpeaking(false);};u.onerror=function(){setSpeaking(false);};setSpeaking(true);window.speechSynthesis.speak(u);
  }
  const illustrated=story.packageType==='illustrated';
  return <div>
    <div className="storyHeader">
      <div className="storyCover"><div className="storyCoverCopy"><div className="eyebrow">A TINY BEDTIME TALE</div><h1>{story.title}</h1><p>{story.strapline}</p><div className="storyMeta"><span className="metaChip">{story.theme}</span><span className="metaChip">About {story.readingMinutes||7} min</span><span className="metaChip">{PACKAGES[story.packageType]?PACKAGES[story.packageType][0]:'Story'}</span></div></div><div className="storyCoverArt"><Art theme={story.theme} page={0}/></div></div>
      <div className="storyTools"><button className="miniBtn" onClick={onBack}>← Library</button>{story.packageType!=='read'&&<button className="miniBtn" onClick={listen}>{speaking?'■ Stop':'▶ Listen'}</button>}<button className="miniBtn" onClick={onRegenerate}>↻ Regenerate</button><button className="miniBtn" onClick={onContinue}>＋ Continue this adventure</button></div>
    </div>
    <div className="pageList">{story.pages.map(function(p,i){return <article className="storyPage" key={i}>{illustrated&&<div className="pageArt"><Art theme={story.theme} page={i+1}/></div>}<div className="pageText" style={!illustrated?{gridColumn:'1 / -1',padding:'22px'}:undefined}><h3>{p.heading}</h3><p>{p.text}</p></div></article>;})}</div>
    <div className="bedtimeLine">{story.bedtimeLine||'Goodnight, little hero.'}</div>
    <div className="engineNote">Story engine: {story.engine==='ai-gateway'?'AI generated':'preview fallback'} · saved to this device</div>
  </div>;
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

  useEffect(function(){setProfile(readStore('tbt-profile',DEFAULT_PROFILE));setLibrary(readStore('tbt-library',[]));setHydrated(true);},[]);
  useEffect(function(){if(hydrated)writeStore('tbt-profile',profile);},[profile,hydrated]);
  useEffect(function(){if(hydrated)writeStore('tbt-library',library);},[library,hydrated]);
  const latestSeriesMemory=useMemo(function(){const s=library.find(function(x){return x.seriesMemory;});return s?s.seriesMemory:'';},[library]);
  function go(target){setError('');setScreen(target);if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});}
  function start(){go('create');}
  async function generate(regenerate){
    if(!profile.childName.trim()){setError('Add a first name or nickname so the story knows who its hero is.');return;}
    setError('');setLoading(true);
    try{
      const previous=regenerate&&story?{title:story.title,pages:story.pages.map(function(p){return p.text;}).join(' ').slice(0,1600)}:null;
      const r=await fetch('/api/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:profile,brief:brief,seriesMemory:brief.format==='continue'?latestSeriesMemory:'',previousStory:previous})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'We could not make that story just now.');
      const saved=Object.assign({},data,{id:uid(),createdAt:new Date().toISOString(),packageType:brief.packageType,format:brief.format,profileSnapshot:{childName:profile.childName,ageBand:profile.ageBand}});
      setStory(saved);setLibrary(function(items){return [saved].concat(items).slice(0,60);});setScreen('story');if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){setError(e.message||'Something went wrong while making the story.');}finally{setLoading(false);}
  }
  function continueStory(){setBrief(Object.assign({},brief,{format:'continue',theme:story?story.theme:brief.theme,request:'Continue the adventure from “'+(story?story.title:'the last story')+'”.'}));go('create');}
  const tabs=[['home','Home'],['create','Create'],['library','Library'+(library.length?' ('+library.length+')':'')],['profile','Child profile']];

  return <>
    <div className="devbar"><span><span className="devpill">IN DEVELOPMENT</span> Tiny Bedtime Tales is currently being developed by <strong>Greg Godfrey</strong></span></div>
    <div className="shell"><nav className="nav"><button className="brand" onClick={function(){go('home');}} style={{background:'none',border:0,color:'inherit',padding:0}}><span className="brandMoon">☾</span> Tiny Bedtime Tales</button><div className="navActions"><button className="ghost" onClick={function(){go('library');}}>My stories</button><button className="btn small" onClick={start}>Create a story</button></div></nav></div>

    {screen==='home'&&<><main className="shell"><section className="hero"><div><div className="eyebrow">PERSONALISED BEDTIME STORIES</div><h1>Bedtime stories where <em>your child</em> is the hero.</h1><p className="heroLead">Fresh adventures built around their first name, favourite things and imagination — ready to read, listen to or enjoy as an illustrated tale.</p><div className="heroCtas"><button className="btn" onClick={start}>Create their first story — free</button><button className="ghost" onClick={function(){document.getElementById('how')?.scrollIntoView({behavior:'smooth'});}}>See how it works</button></div><div className="trust"><span className="trustDot"/>No photos. No surnames. No addresses. Just the details that make a story feel like theirs.</div></div><div className="heroVisual"><Art theme="Dragon" page={0} large={true}/><div className="heroCaption"><div><strong>A different world every bedtime.</strong><small>Built around the things they already love.</small></div><div className="heroBadge">Made for ages 4–9</div></div></div></section></main>
    <div className="noticeStrip"><span>✨</span><span><b>First story free.</b> Choose standalone adventures, continuing chapters, special occasions or gentle stories for big little moments.</span></div>
    <main className="shell"><section className="section" id="how"><div className="sectionHead center"><div className="kicker">How it works</div><h2>A world that grows with them.</h2><p className="sectionText">Tell us the broad things they love. We turn those ingredients into brand-new bedtime adventures, while keeping the personal information deliberately light.</p></div><div className="steps"><div className="card"><div className="cardIcon">✨</div><h3>Tell us about them</h3><p>First name, age band, hobbies, favourite things, pets and friends’ first names. Update the profile whenever their obsessions change.</p></div><div className="card"><div className="cardIcon">🪄</div><h3>We build the adventure</h3><p>Choose a theme or ask for something specific. Start a new world or continue the same adventure week after week.</p></div><div className="card"><div className="cardIcon">🌙</div><h3>Read it their way</h3><p>Read together, use read-aloud, or choose the illustrated experience. Every finished story lands in their growing library.</p></div></div></section>
    <section className="section"><div className="sectionHead"><div className="kicker">Ways to use it</div><h2>Not just another random AI story.</h2><p className="sectionText">The product remembers the story world, so recurring characters and previous adventures can become part of what happens next.</p></div><div className="steps"><div className="card"><div className="cardIcon">📚</div><h3>Continuing adventures</h3><p>Each bedtime can become the next chapter. The child stays the hero while the world and returning characters evolve.</p></div><div className="card"><div className="cardIcon">🎂</div><h3>Special occasions</h3><p>Birthdays, Christmas, starting school, a new sibling, losing a tooth or a family holiday can become part of tonight’s tale.</p></div><div className="card"><div className="cardIcon">💛</div><h3>Big little feelings</h3><p>Gentle, reassuring stories for things like being nervous about the dark, starting school or trying something new — always as stories, never therapy.</p></div></div></section>
    <section className="section"><div className="sectionHead center"><div className="kicker">Working pricing</div><h2>Pick how bedtime feels tonight.</h2><p className="sectionText">The purchase journey is being built now; checkout is intentionally switched off during development.</p></div><div className="pricing">{Object.entries(PACKAGES).map(function(entry){const id=entry[0],pack=entry[1];return <div className={'priceCard '+(id==='audio'?'featured':'')} key={id}>{id==='audio'&&<span className="priceTag">POPULAR</span>}<h3>{pack[0]}</h3><div className="price">{pack[1].split(' / ')[0]} <small>per story</small></div><ul><li>Personalised story</li><li>Saved to story library</li><li>{id==='read'?'Standalone or continuing':id==='audio'?'Read-aloud experience':'Storybook-style scenes'}</li></ul><button className={'btn '+(id==='audio'?'':'dark')} onClick={function(){setBrief(Object.assign({},brief,{packageType:id}));start();}}>Choose {pack[0].toLowerCase()}</button></div>;})}</div></section></main></>}

    {screen!=='home'&&<main className="shell studioWrap"><div className="studio"><div className="studioTop"><div className="studioTitle"><strong>Tiny Bedtime Studio</strong><span className="modePill">Preview mode</span></div><div className="tabs">{tabs.map(function(t){return <button key={t[0]} onClick={function(){go(t[0]);}} className={'tab '+(screen===t[0]?'active':'')}>{t[1]}</button>;})}</div></div><div className="studioBody">
      {screen==='create'&&(loading?<div className="loadingBox"><div className="spinner"/><h3>Writing a tiny adventure…</h3><p>Mixing in favourite things, brave moments and a cosy ending.</p></div>:<div className="dashboardGrid"><div className="softPanel"><h3>Create tonight’s story</h3><p>Start with the child profile, then choose where their imagination goes tonight.</p><ProfileFields profile={profile} setProfile={setProfile}/></div><div className="softPanel"><div className="profilePreview"><div className="avatar">{initial(profile.childName)}</div><div><b>{profile.childName||'Your little storyteller'}</b><small>{profile.ageBand} years · {profile.preferredTone}</small></div></div><div className="field" style={{marginTop:18}}><label>What kind of story?</label><select className="select" value={brief.format} onChange={function(e){setBrief(Object.assign({},brief,{format:e.target.value}));}}>{Object.entries(FORMATS).map(function(x){return <option key={x[0]} value={x[0]}>{x[1]}</option>;})}</select></div><div className="field" style={{marginTop:15}}><label>Choose an adventure</label><div className="choiceGrid">{THEMES.map(function(t){return <button type="button" key={t[0]} className={'choice '+(brief.theme===t[0]?'active':'')} onClick={function(){setBrief(Object.assign({},brief,{theme:t[0]}));}}><span className="emoji">{t[1]}</span>{t[0]}</button>;})}</div></div>{brief.format==='special'&&<div className="field" style={{marginTop:15}}><label>What’s the occasion?</label><input className="input" value={brief.occasion} onChange={function(e){setBrief(Object.assign({},brief,{occasion:e.target.value}));}} placeholder="Birthday, first day at school, Christmas…"/></div>}<div className="field" style={{marginTop:15}}><label>Anything you want in tonight’s story?</label><textarea className="textarea" value={brief.request} onChange={function(e){setBrief(Object.assign({},brief,{request:e.target.value}));}} placeholder={brief.format==='support'?'e.g. A gentle story about feeling brave when the bedroom is dark':'e.g. A treasure hunt on the moon with a funny purple dragon'}/></div><div className="field" style={{marginTop:15}}><label>Experience</label><div className="packageChoices">{Object.entries(PACKAGES).map(function(entry){return <button type="button" key={entry[0]} className={'packageChoice '+(brief.packageType===entry[0]?'active':'')} onClick={function(){setBrief(Object.assign({},brief,{packageType:entry[0]}));}}><b>{entry[1][0]}</b><small>{entry[1][1]}</small></button>;})}</div></div>{error&&<div className="error">{error}</div>}<div className="formFooter"><small>Your first story is free in this preview. No checkout or payment is connected yet.</small><button className="btn" onClick={function(){generate(false);}}>✨ Make the magic</button></div></div></div>)}
      {screen==='library'&&<div><div className="sectionHead" style={{marginBottom:22}}><div className="kicker">Story library</div><h2 style={{fontSize:42}}>Their adventures live here.</h2><p className="sectionText">This preview saves stories on this device. Account sync is prepared for the next backend step.</p></div>{library.length?<div className="libraryGrid">{library.map(function(s,i){return <div className="storyTile" key={s.id}><div className="tileArt"><Art theme={s.theme} page={i+1}/></div><div className="tileBody"><h3>{s.title}</h3><p>{new Date(s.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · {s.theme} · {(PACKAGES[s.packageType]||['Story'])[0]}</p><div className="tileActions"><button className="miniBtn" onClick={function(){setStory(s);go('story');}}>Open</button><button className="miniBtn" onClick={function(){setLibrary(library.filter(function(x){return x.id!==s.id;}));}}>Remove</button></div></div></div>;})}</div>:<div className="empty"><div className="emptyIcon">📖</div><h3>No stories yet</h3><p>Create the first adventure and it will appear here.</p><button className="btn small" onClick={start}>Create first story</button></div>}</div>}
      {screen==='profile'&&<div className="dashboardGrid"><div className="softPanel"><h3>Child story profile</h3><p>These are storytelling ingredients, not an identity profile. Keep details broad and update them whenever interests change.</p><ProfileFields profile={profile} setProfile={setProfile}/><div className="formFooter"><small>Changes are saved automatically on this device.</small><button className="btn small" onClick={start}>Use profile in a story</button></div></div><div className="softPanel"><h3>Privacy by design</h3><p>We’re intentionally not asking for photos, surnames, exact dates of birth, addresses, schools or phone numbers.</p><div className="card" style={{marginTop:18}}><div className="cardIcon">🔒</div><h3>Minimum useful detail</h3><p>Stories need imagination, not identity. Broad interests and first names are enough to make the experience feel personal.</p></div><div className="card" style={{marginTop:12}}><div className="cardIcon">✏️</div><h3>Easy to change</h3><p>Favourite things change fast. The profile is designed to be edited without losing the child’s story library or series history.</p></div></div></div>}
      {screen==='story'&&story&&<StoryView story={story} onBack={function(){go('library');}} onRegenerate={function(){generate(true);}} onContinue={continueStory}/>}
      {screen==='story'&&!story&&<div className="empty"><div className="emptyIcon">🌙</div><h3>Pick a story from the library</h3><button className="btn small" onClick={function(){go('library');}}>Open library</button></div>}
    </div></div></main>}
    <footer className="footer"><div className="shell footerInner"><div><div className="footerBrand">☾ Tiny Bedtime Tales</div><small>Development preview. Parent-led personalised storytelling with deliberately minimal child data.</small></div><div className="footerLinks"><button className="ghost" onClick={function(){go('profile');}}>Privacy approach</button><button className="ghost" onClick={start}>Create story</button></div></div></footer>
  </>;
}
