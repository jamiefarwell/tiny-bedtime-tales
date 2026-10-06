export const runtime = 'nodejs';

const THEMES = new Set(['Moon','Dragon','Ocean','Forest','Dinosaur','Castle','Space','Pirates']);
const FORMATS = new Set(['standalone','continue','special','support']);
const BAD = /\b(?:sex(?:ual)?|porn(?:ography)?|nude|suicide|self[- ]?harm|murder|torture|rape|cocaine|heroin|gun|knife attack)\b/i;

const rateStore = globalThis.__tinyBedtimeRateStore || (globalThis.__tinyBedtimeRateStore = new Map());
function allowedRequest(request){
  const raw=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,80);
  const now=Date.now(), windowMs=60*60*1000, limit=12;
  let item=rateStore.get(raw);
  if(!item || item.reset<now){item={count:0,reset:now+windowMs};}
  item.count+=1; rateStore.set(raw,item);
  if(rateStore.size>500){for(const [k,v] of rateStore){if(v.reset<now)rateStore.delete(k);}}
  return {ok:item.count<=limit,reset:item.reset};
}

function cleanName(value=''){
  const first = String(value).trim().split(/\s+/)[0] || 'Little Hero';
  return first.replace(/[^a-zA-ZÀ-ÿ'’-]/g,'').slice(0,24) || 'Little Hero';
}
function clean(value='',max=500){
  let s=String(value||'').slice(0,max);
  s=s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[removed]');
  s=s.replace(/(?:\+44\s?\d|0\d)[\d\s()-]{8,}/g,'[removed]');
  s=s.replace(/\b(?:GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/gi,'[removed]');
  s=s.replace(/https?:\/\/\S+|www\.\S+/gi,'[removed]');
  s=s.replace(/\b\d{7,}\b/g,'[removed]');
  return s.trim();
}
function list(value=''){return clean(value,360).split(',').map(x=>x.trim()).filter(Boolean).slice(0,8).join(', ');}
function minutes(v=''){return String(v).startsWith('Quick')?4:String(v).startsWith('Longer')?10:7;}
function normalise(input={}){
  const p=input.profile||{}, b=input.brief||{};
  const data={
    profile:{
      childName:cleanName(p.childName),
      ageBand:['4–5','6–7','8–9'].includes(p.ageBand)?p.ageBand:'6–7',
      interests:list(p.interests), pets:list(p.pets), friends:list(p.friends),
      favouriteThings:clean(p.favouriteThings,420),
      preferredTone:clean(p.preferredTone,80)||'Magical and adventurous',
      storyLength:clean(p.storyLength,80)||'Bedtime — about 7 minutes',
      avoid:clean(p.avoid,240)
    },
    brief:{
      theme:THEMES.has(b.theme)?b.theme:'Moon',
      format:FORMATS.has(b.format)?b.format:'standalone',
      request:clean(b.request,500), occasion:clean(b.occasion,140),
      packageType:['read','audio','illustrated'].includes(b.packageType)?b.packageType:'illustrated'
    },
    seriesMemory:clean(input.seriesMemory,1200),
    previousStory:input.previousStory?{title:clean(input.previousStory.title,120),pages:clean(input.previousStory.pages,1800)}:null
  };
  if(BAD.test(JSON.stringify(data))) throw new Error('Please keep story requests suitable for a young child.');
  return data;
}
function prompt(data){
  const p=data.profile,b=data.brief;
  const mode={
    standalone:'Create a complete standalone adventure with a satisfying ending.',
    continue:data.seriesMemory?'Continue this established story world naturally. Previous world memory: '+data.seriesMemory:'Make this feel like the next chapter of an ongoing adventure while still making sense by itself.',
    special:'Build the story gently around this special occasion: '+(b.occasion||b.request||'a happy family milestone')+'.',
    support:'Create a warm fictional adventure that gently models courage and reassurance. Do not diagnose, provide therapy, or make medical claims.'
  }[b.format];
  const regen=data.previousStory?'This is a regeneration. Make a genuinely different plot, setting, challenge and ending from the previous version titled "'+data.previousStory.title+'". Do not reuse its wording or story beats.':'';
  return `Write a premium UK bedtime story for a child aged ${p.ageBand} whose FIRST NAME OR NICKNAME is ${p.childName}.

Interests/hobbies: ${p.interests||'curiosity and imaginative play'}
Pets: ${p.pets||'none specified'}
Friends first names: ${p.friends||'none specified'}
Favourite things: ${p.favouriteThings||'stars, surprises and friendly adventures'}
Preferred tone: ${p.preferredTone}
Things to avoid: ${p.avoid||'anything frightening, unsafe or age-inappropriate'}
Theme: ${b.theme}
Parent request: ${b.request||'surprise us'}
${mode}
${regen}

Rules:
- Make ${p.childName} the active hero.
- Weave in only a few profile details naturally; never dump profile facts.
- Use first names only. Never invent surnames, addresses, schools, exact locations, phone numbers or dates of birth.
- Keep conflict gentle and child-safe: no graphic danger, cruelty, adult themes, weapons or realistic peril.
- For support stories, never claim to treat anxiety, illness, trauma or a health condition.
- Aim for about ${minutes(p.storyLength)} minutes.
- End calm, cosy and sleep-friendly.
- Use British English.

Return ONLY valid JSON:
{"title":"string","strapline":"string","readingMinutes":7,"pages":[{"heading":"string","text":"story prose","scene":"short visual scene description"}],"seriesMemory":"80-140 word continuity memory","bedtimeLine":"gentle final line"}
Return 5-7 substantial pages.`;
}
function validate(obj,data){
  if(!obj||!Array.isArray(obj.pages)||obj.pages.length<3)return null;
  const pages=obj.pages.slice(0,7).map((p,i)=>({heading:clean(p?.heading||`Chapter ${i+1}`,80),text:clean(p?.text,2400),scene:clean(p?.scene,300)})).filter(p=>p.text.length>40);
  if(pages.length<3)return null;
  return {title:clean(obj.title,130)||'A Tiny Bedtime Adventure',strapline:clean(obj.strapline,230)||'A brand-new adventure made especially for tonight.',readingMinutes:Number(obj.readingMinutes)||minutes(data.profile.storyLength),pages,seriesMemory:clean(obj.seriesMemory,1400),bedtimeLine:clean(obj.bedtimeLine,240)||'Goodnight, little hero. Tomorrow, imagination will still be waiting.',theme:data.brief.theme,engine:'ai-gateway'};
}
function fallback(data){
  const p=data.profile,b=data.brief,n=p.childName,t=b.theme;
  const likes=p.interests||p.favouriteThings||'mysteries and magical things';
  const companion=(p.pets&&p.pets.split(',')[0].trim())||(p.friends&&p.friends.split(',')[0].trim())||(t==='Dragon'?'Pip, a pocket-sized dragon':'Flicker, a tiny golden fox');
  const req=b.request||(t==='Ocean'?'a secret beneath the moonlit sea':t==='Dinosaur'?'a hidden valley where dinosaurs still whisper':t==='Castle'?'a castle with a door that only appears at bedtime':t==='Space'||t==='Moon'?'a silver path among the stars':t==='Pirates'?'a treasure map with a very unusual X':t==='Forest'?'a lantern trail through the whispering woods':'a dragon who has lost something important');
  const seed=(Date.now()+(data.previousStory?.title?.length||0))%4;
  const objects=['a warm golden key','a bottle of blue starlight','a tiny compass that hummed','a feather that glowed when someone was kind'];
  const object=objects[seed];
  const titles={Dragon:`${n} and the Dragon Who Lost the Moon`,Ocean:`${n} and the Secret Under the Silver Sea`,Forest:`${n} and the Lanterns of Whispering Wood`,Dinosaur:`${n} and the Valley Beyond Bedtime`,Castle:`${n} and the Castle of a Hundred Doors`,Space:`${n} and the Star That Fell Upstairs`,Moon:`${n} and the Moonlight Map`,Pirates:`${n} and the Treasure That Wouldn’t Stay Buried`};
  const pages=[
    ['Something impossible at the window',`Just as ${n} was getting ready for bed, a soft tap-tap-tap came from the window. Outside was ${companion}, carrying ${object}. “I need exactly one person who loves ${likes},” came the urgent whisper. ${n} sat up. That sounded suspiciously specific. Before there was time for another question, a ribbon of ${t.toLowerCase()}-coloured light curled across the room and became a doorway. On the other side waited ${req}.`],
    ['The rule nobody had mentioned',`The moment ${n} stepped through, the doorway vanished behind them with a polite little pop. A wooden sign swung overhead: THE BRAVEST WAY IS NOT ALWAYS THE LOUDEST WAY. “That seems important,” said ${companion}. Ahead, the path split into three. One road glittered. One roared. The third looked ordinary, except for a trail of tiny marks that reminded ${n} of ${likes}. “I know which one I’d choose,” ${n} said, pointing to the quiet path.`],
    ['A problem only they could solve',`The quiet path led to a place where the whole adventure seemed stuck. A gate would not open and even the wind appeared to be holding its breath. Everyone had tried being bigger, faster and louder. ${n} looked carefully instead. Almost hidden was a clue connected to ${likes}. The first idea did nothing. The second made a tiny sparkle. The third made the ground shimmer from edge to edge. Something was beginning to work.`],
    ['The brave bit',`Beyond the gate was the part that made ${n}’s tummy feel fizzy. It was not truly dangerous, but it was new, dark around the edges and full of strange sounds. ${companion} moved closer. ${n} remembered the sign. Being brave did not mean feeling no wobble at all. It meant choosing one small next step. So ${n} took one, then another, and soon the scary-looking shadows turned out to be something rather wonderful.`],
    ['The tiny triumph',`At the heart of the adventure, ${n} finally understood what ${object} was for. It was never a prize. It was a reminder to notice, listen and try again. With one last clever idea, ${n} solved the mystery. Lights blinked on across the ${t.toLowerCase()} world, ${companion} cheered, and somewhere far away a bell rang exactly once — the sound adventures make when they know they have found the right hero.`],
    ['Home before the last yawn',`A familiar doorway appeared, warm and golden. ${companion} promised that this was not necessarily goodbye. “Worlds like this remember their heroes,” came the whisper. ${n} stepped through and found the bedroom exactly as it had been, except for one tiny sparkle on the pillow. By the time ${n} snuggled under the covers, the adventure already felt like the beginning of another one.`]
  ].map((x,i)=>({heading:x[0],text:x[1],scene:`${t} storybook scene ${i+1} featuring ${n} and ${companion}`}));
  return {title:titles[t]||`${n} and the Tiny Bedtime Adventure`,strapline:`A ${t.toLowerCase()} adventure about noticing the little things and taking one brave step at a time.`,readingMinutes:minutes(p.storyLength),pages,seriesMemory:clean(`${n} entered a hidden ${t.toLowerCase()} world with ${companion}. They chose the quiet path, solved a problem by noticing a clue linked to ${likes}, and learned that bravery can mean taking one small next step. ${n} returned home with the memory of ${object}. ${companion} hinted another chapter is waiting. ${data.seriesMemory?'Earlier world memory remains relevant: '+data.seriesMemory:''}`,1400),bedtimeLine:`Sleep tight, ${n}. The next tiny adventure can wait until tomorrow.`,theme:t,engine:'smart-fallback'};
}
async function ai(data){
  const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
  if(!token)return null;
  const r=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-5.6-sol',messages:[{role:'system',content:'You are the story engine for Tiny Bedtime Tales, a parent-led UK children’s bedtime story product. Follow safety and privacy rules exactly. Output JSON only.'},{role:'user',content:prompt(data)}],max_completion_tokens:2400,response_format:{type:'json_object'}}),cache:'no-store'});
  if(!r.ok)return null;
  const body=await r.json(); const raw=body?.choices?.[0]?.message?.content; if(!raw)return null;
  try{return validate(JSON.parse(String(raw).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')),data);}catch{return null;}
}
export async function POST(request){
  const limit=allowedRequest(request);
  if(!limit.ok) return Response.json({error:'That is a lot of adventures at once. Give the story engine a little rest and try again later.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(Math.max(60,Math.ceil((limit.reset-Date.now())/1000)))}});
  try{const data=normalise(await request.json());const story=await ai(data).catch(()=>null)||fallback(data);return Response.json(story,{headers:{'Cache-Control':'no-store'}});}
  catch(e){return Response.json({error:e?.message||'We could not make that story just now.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
