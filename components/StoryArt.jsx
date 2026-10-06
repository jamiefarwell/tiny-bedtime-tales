const palettes = {
  Moon: ['#102e56', '#0a1934', '#ffd26a', '#9edcff'],
  Dragon: ['#173d4f', '#0c2132', '#ffc56f', '#79ceb5'],
  Ocean: ['#0e4664', '#08243a', '#9be4ff', '#54b9d6'],
  Forest: ['#164638', '#0b281f', '#ffe096', '#7dc39f'],
  Dinosaur: ['#3b4d35', '#1a2d28', '#ffd27c', '#89c59b'],
  Castle: ['#352e59', '#171a36', '#ffd485', '#b7a5e6'],
  Space: ['#242f60', '#090e28', '#ffd06e', '#8abfff'],
  Pirates: ['#36536a', '#10293d', '#ffc96e', '#83d1d5'],
};

function themeName(theme = 'Moon') {
  return palettes[theme] ? theme : 'Moon';
}

export default function StoryArt({ theme = 'Moon', page = 0, className = '' }) {
  const t = themeName(theme);
  const [a, b, accent, accent2] = palettes[t];
  const shift = page % 4;
  return (
    <svg className={className} viewBox="0 0 500 360" role="img" aria-label={`${t} story illustration`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${t}-${page}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <radialGradient id={`glow-${t}-${page}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={accent} stopOpacity=".65" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="500" height="360" fill={`url(#bg-${t}-${page})`} />
      <circle cx={370 - shift * 18} cy={72 + shift * 10} r="110" fill={`url(#glow-${t}-${page})`} />
      {[46,98,145,215,278,332,408,455].map((x,i)=><circle key={x} cx={x} cy={34 + ((i*37+page*19)%110)} r={i%3===0?2.2:1.3} fill="#fff7da" opacity={.45 + (i%3)*.18}/>) }
      {t === 'Ocean' ? (
        <>
          <path d="M0 242 Q65 215 130 242 T260 242 T390 242 T520 242 V360 H0Z" fill="#0d6b82" opacity=".85" />
          <path d="M0 274 Q65 247 130 274 T260 274 T390 274 T520 274 V360 H0Z" fill="#075069" />
          <path d="M298 168 C337 130 389 135 413 168 C389 159 367 163 350 184 C337 170 318 165 298 168Z" fill={accent2}/>
          <circle cx="385" cy="154" r="5" fill="#071327"/>
          <path d="M413 169 Q443 158 457 181 Q429 183 413 169Z" fill={accent2}/>
        </>
      ) : t === 'Forest' ? (
        <>
          <path d="M0 284 Q100 230 185 282 Q292 222 500 278 V360H0Z" fill="#0a251d" />
          {[70,150,365,430].map((x,i)=><g key={x} transform={`translate(${x} ${150 + (i%2)*30})`}><rect x="-8" y="55" width="16" height="90" rx="7" fill="#513b2c"/><path d="M0 0 L-52 88 H52Z" fill={i%2? '#236649':'#2c7554'}/><path d="M0 32 L-60 108 H60Z" fill={i%2? '#1e5b42':'#286a4d'}/></g>)}
          <g transform="translate(245 238)"><ellipse cx="0" cy="15" rx="40" ry="27" fill="#e48752"/><circle cx="30" cy="0" r="22" fill="#e48752"/><path d="M17 -18 L22 -43 L36 -20Z" fill="#e48752"/><path d="M39 -17 L50 -39 L53 -10Z" fill="#e48752"/><circle cx="36" cy="-3" r="3" fill="#111827"/><path d="M-35 12 Q-78 -15 -74 28 Q-57 45 -32 31" fill="none" stroke="#e48752" strokeWidth="13" strokeLinecap="round"/></g>
        </>
      ) : t === 'Dinosaur' ? (
        <>
          <path d="M0 285 Q90 238 180 277 Q275 228 500 272 V360H0Z" fill="#162a22" />
          <g transform="translate(260 211)"><ellipse cx="0" cy="33" rx="91" ry="55" fill="#75b98c"/><circle cx="77" cy="8" r="38" fill="#75b98c"/><path d="M-83 30 Q-151 2 -175 54 Q-125 50 -77 60Z" fill="#75b98c"/><path d="M38 -12 L50 -39 L60 -8 M8 -20 L19 -49 L31 -17 M-24 -17 L-14 -45 L-2 -14" fill="#f4d283"/><circle cx="89" cy="1" r="4" fill="#071327"/><path d="M68 20 Q87 31 104 19" fill="none" stroke="#21483a" strokeWidth="4" strokeLinecap="round"/><rect x="-48" y="74" width="22" height="54" rx="10" fill="#75b98c"/><rect x="34" y="71" width="22" height="57" rx="10" fill="#75b98c"/></g>
        </>
      ) : t === 'Castle' ? (
        <>
          <path d="M0 296 Q125 248 250 294 Q360 247 500 292 V360H0Z" fill="#10172d" />
          <g transform="translate(292 117)" fill="#8597ba"><rect x="-95" y="78" width="190" height="128" rx="4"/><rect x="-132" y="42" width="65" height="164"/><rect x="67" y="42" width="65" height="164"/><path d="M-132 42 L-119 18 L-106 42 L-92 18 L-78 42 L-67 18 L-67 58 H-132Z"/><path d="M67 42 L80 18 L93 42 L107 18 L121 42 L132 18 L132 58 H67Z"/></g>
          <path d="M272 323 V247 Q292 216 312 247 V323Z" fill="#263655"/><rect x="215" y="228" width="23" height="34" rx="9" fill={accent} opacity=".86"/><rect x="346" y="228" width="23" height="34" rx="9" fill={accent} opacity=".86"/>
        </>
      ) : t === 'Dragon' ? (
        <>
          <path d="M0 296 Q106 235 201 285 Q330 225 500 282 V360H0Z" fill="#0c2730" />
          <g transform="translate(292 196)"><ellipse cx="0" cy="45" rx="79" ry="55" fill="#54ad92"/><path d="M-31 8 Q-96 -71 -115 23 Q-76 -7 -32 42Z" fill="#7ccbb4"/><path d="M34 14 Q89 -55 103 30 Q72 6 33 45Z" fill="#7ccbb4"/><circle cx="61" cy="10" r="36" fill="#54ad92"/><path d="M47 -17 L54 -43 L67 -16 M69 -10 L81 -32 L84 -4" fill="#f1d083"/><circle cx="72" cy="4" r="4" fill="#071327"/><path d="M72 24 Q87 34 101 22" fill="none" stroke="#1d4c40" strokeWidth="4"/><path d="M102 18 Q135 4 148 31 Q123 30 102 18Z" fill="#ffb55e" opacity=".92"/></g>
        </>
      ) : t === 'Space' || t === 'Moon' ? (
        <>
          <circle cx="377" cy="77" r="48" fill={accent}/><circle cx="395" cy="63" r="48" fill={a}/>
          <path d="M0 300 Q105 245 205 293 Q327 234 500 284 V360H0Z" fill="#0b152e" />
          <g transform={`translate(${225+shift*17} 201) rotate(${shift*4-5})`}><path d="M0 -75 C38 -50 47 1 0 72 C-47 1 -38 -50 0 -75Z" fill="#edf3fb"/><circle cx="0" cy="-20" r="17" fill="#6db9df"/><path d="M-20 41 L-47 77 L-13 61 M20 41 L47 77 L13 61" fill="#df6175"/><path d="M-11 67 Q0 105 11 67" fill="#ffc45e"/></g>
        </>
      ) : (
        <>
          <path d="M0 294 Q125 240 245 290 Q370 235 500 282 V360H0Z" fill="#0c2134" />
          <circle cx="365" cy="75" r="45" fill={accent}/>
        </>
      )}
      <g transform={`translate(${100+shift*10} 255)`}>
        <circle cx="0" cy="-45" r="21" fill="#f3c5a2"/>
        <path d="M-26 -19 Q0 -36 26 -19 L20 42 H-20Z" fill="#5d8fd6"/>
        <path d="M-22 -15 L-48 34 L-5 12Z" fill="#db6675" opacity=".9"/>
        <rect x="-18" y="38" width="13" height="39" rx="6" fill="#324a6a"/><rect x="5" y="38" width="13" height="39" rx="6" fill="#324a6a"/>
      </g>
      <g transform={`translate(${156+shift*8} 262)`}>
        <circle cx="0" cy="-42" r="19" fill="#eabf9c"/>
        <path d="M-25 -18 Q0 -33 25 -18 L36 42 H-36Z" fill="#dda0c7"/>
        <path d="M-14 -61 Q0 -75 14 -61" fill="none" stroke={accent} strokeWidth="5"/><circle cx="-13" cy="-62" r="4" fill={accent}/><circle cx="13" cy="-62" r="4" fill={accent}/>
      </g>
    </svg>
  );
}
