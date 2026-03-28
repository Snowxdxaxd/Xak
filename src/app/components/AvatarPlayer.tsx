import { useEffect, useRef, useState, useCallback, useMemo, type RefObject } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { ITEM_MAP, type EquippedSlots } from '../lib/shopItems';

// ─── Text pre-processing ──────────────────────────────────────────────────────
function markdownToSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' Блок кода пропущен. ')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/[-_*]{3,}/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\.\s*\.\s*/g, '. ')
    .trim();
}

// ─── Types & Constants ────────────────────────────────────────────────────────
type SpeakState = 'idle' | 'speaking' | 'paused' | 'done';
type MouthShape = 'closed' | 'a' | 'e' | 'o' | 'u';
export type CharId = 'kira' | 'max' | 'elle';
interface EyeOffset { x: number; y: number }

const MOUTH_SHAPES: Record<MouthShape, string> = {
  closed: 'M 149 228 Q 165 234 181 228',
  a:      'M 147 225 Q 165 246 183 225',
  e:      'M 147 226 Q 165 241 183 226',
  o:      'M 151 225 Q 165 244 179 225',
  u:      'M 152 228 Q 165 239 178 228',
};
const MOUTH_CYCLE: MouthShape[] = ['a', 'e', 'o', 'u', 'a', 'closed', 'e', 'o', 'a', 'closed'];

const LS_EQUIPPED = 'avatar_equipped';
function loadLocalEquipped(): EquippedSlots {
  try { return JSON.parse(localStorage.getItem(LS_EQUIPPED) || '{}'); } catch { return {}; }
}

function ItemLayer({ slot, equipped }: { slot: keyof EquippedSlots; equipped: EquippedSlots }) {
  const id = equipped[slot];
  if (!id) return null;
  const item = ITEM_MAP[id];
  if (!item) return null;
  return <item.Render />;
}

// ─── Shared AnimatedFace (eyes / nose / blush / mouth) ───────────────────────
interface FaceProps {
  blink:          boolean;
  offset:         EyeOffset;
  mouth:          MouthShape;
  irisGradId:     string;   // gradient id, e.g. "kira-iris"
  irisDarkColor:  string;
  eyeStroke:      string;
  eyebrowStroke:  string;
  lashes:         boolean;
  blushColor:     string;
  blushOpacity?:  number;
  mouthStroke:    string;
}

function AnimatedFace({
  blink, offset, mouth,
  irisGradId, irisDarkColor, eyeStroke, eyebrowStroke,
  lashes, blushColor, blushOpacity = 0.38, mouthStroke,
}: FaceProps) {
  const isOpen = mouth !== 'closed';
  const isWide = mouth === 'a' || mouth === 'o';
  const { x: ox, y: oy } = offset;
  const hox = ox * 0.35, hoy = oy * 0.35;

  return (
    <>
      {/* Eyebrows */}
      <path d="M 109 144 Q 130 136 150 141" stroke={eyebrowStroke} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M 180 141 Q 200 136 221 144" stroke={eyebrowStroke} strokeWidth={2.5} fill="none" strokeLinecap="round" />

      {/* Eye whites */}
      <ellipse cx={132} cy={163} rx={23} ry={blink ? 2.5 : 27} fill="white" />
      <ellipse cx={198} cy={163} rx={23} ry={blink ? 2.5 : 27} fill="white" />

      {!blink && (
        <>
          {/* Left iris */}
          <ellipse cx={132 + ox}        cy={167 + oy}        rx={16} ry={20} fill={`url(#${irisGradId})`} />
          <ellipse cx={132 + ox}        cy={170 + oy}        rx={9}  ry={12} fill={irisDarkColor} />
          <ellipse cx={132 + ox}        cy={165 + oy}        rx={3}  ry={3.5} fill="#111" />
          <ellipse cx={139 + hox}       cy={158 + hoy}       rx={5}  ry={6}   fill="white" opacity={0.92} />
          <ellipse cx={126 + hox}       cy={173 + hoy}       rx={2}  ry={2.5} fill="white" opacity={0.6} />
          {/* Right iris */}
          <ellipse cx={198 + ox}        cy={167 + oy}        rx={16} ry={20} fill={`url(#${irisGradId})`} />
          <ellipse cx={198 + ox}        cy={170 + oy}        rx={9}  ry={12} fill={irisDarkColor} />
          <ellipse cx={198 + ox}        cy={165 + oy}        rx={3}  ry={3.5} fill="#111" />
          <ellipse cx={205 + hox}       cy={158 + hoy}       rx={5}  ry={6}   fill="white" opacity={0.92} />
          <ellipse cx={192 + hox}       cy={173 + hoy}       rx={2}  ry={2.5} fill="white" opacity={0.6} />
        </>
      )}

      {/* Eye outlines */}
      <ellipse cx={132} cy={163} rx={23} ry={blink ? 2.5 : 27} fill="none" stroke={eyeStroke} strokeWidth={1.5} />
      <ellipse cx={198} cy={163} rx={23} ry={blink ? 2.5 : 27} fill="none" stroke={eyeStroke} strokeWidth={1.5} />

      {/* Eyelashes */}
      {lashes && !blink && (
        <>
          <line x1={111} y1={143} x2={107} y2={136} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={120} y1={138} x2={118} y2={131} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={131} y1={136} x2={131} y2={129} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={142} y1={138} x2={143} y2={131} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={151} y1={143} x2={155} y2={137} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={177} y1={143} x2={173} y2={137} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={188} y1={138} x2={187} y2={131} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={198} y1={136} x2={198} y2={129} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={209} y1={138} x2={210} y2={131} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={219} y1={143} x2={223} y2={137} stroke={eyeStroke} strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}

      {/* Nose */}
      <ellipse cx={159} cy={210} rx={3} ry={2} fill="#d4916a" opacity={0.45} />
      <ellipse cx={171} cy={210} rx={3} ry={2} fill="#d4916a" opacity={0.45} />

      {/* Blush */}
      <ellipse cx={108} cy={200} rx={20} ry={11} fill={blushColor} opacity={blushOpacity} />
      <ellipse cx={222} cy={200} rx={20} ry={11} fill={blushColor} opacity={blushOpacity} />

      {/* Mouth */}
      <path d={MOUTH_SHAPES[mouth]} stroke={mouthStroke} strokeWidth={2} fill={isOpen ? '#fecaca' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      {isOpen && <path d="M 153 233 Q 165 237 177 233" stroke="#f97316" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.55} />}
      {isWide && <path d="M 151 228 Q 165 228 179 228" stroke="white" strokeWidth={3.5} fill="none" strokeLinecap="round" />}
    </>
  );
}

// Speaking pulse
function SpeakingPulse({ c1, c2, c3 }: { c1: string; c2: string; c3: string }) {
  return (
    <g transform="translate(275, 58)">
      <circle r="12" fill={c1} opacity={0.25}>
        <animate attributeName="r"       values="12;20;12" dur="0.85s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0;0.25" dur="0.85s" repeatCount="indefinite" />
      </circle>
      <circle r="7" fill={c2} opacity={0.75}>
        <animate attributeName="r" values="7;10;7" dur="0.85s" repeatCount="indefinite" />
      </circle>
      <circle r="3.5" fill={c3} />
    </g>
  );
}

// ─── Character avatar props ───────────────────────────────────────────────────
export interface CharAvatarProps {
  blink:      boolean;
  mouth:      MouthShape;
  offset:     EyeOffset;
  speakState: SpeakState;
  svgRef:     RefObject<SVGSVGElement | null>;
  equipped:   EquippedSlots;
}

// ─── Character: Кира (purple, anime girl) ────────────────────────────────────
export function KiraAvatar({ blink, mouth, offset, speakState, svgRef, equipped }: CharAvatarProps) {
  return (
    <svg ref={svgRef} viewBox="0 0 330 420" width={260} height={331} xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
      <defs>
        <radialGradient id="kira-bg"   cx="50%" cy="50%" r="50%"><stop offset="0%"   stopColor="#fdf4ff" /><stop offset="100%" stopColor="#ede9fe" /></radialGradient>
        <radialGradient id="kira-skin" cx="50%" cy="35%" r="60%"><stop offset="0%"   stopColor="#fde8d0" /><stop offset="100%" stopColor="#fbcfa0" /></radialGradient>
        <radialGradient id="kira-iris" cx="38%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#a855f7" />
          <stop offset="60%"  stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
      </defs>

      {equipped.background ? <ItemLayer slot="background" equipped={equipped} /> : <circle cx="165" cy="210" r="168" fill="url(#kira-bg)" />}
      <ItemLayer slot="aura" equipped={equipped} />
      <text x="34"  y="78"  fontSize="18" fill="#e879f9" opacity="0.5">✦</text>
      <text x="278" y="92"  fontSize="14" fill="#a78bfa" opacity="0.45">✦</text>
      <text x="48"  y="335" fontSize="12" fill="#c084fc" opacity="0.4">✦</text>
      <text x="260" y="352" fontSize="16" fill="#d946ef" opacity="0.4">✦</text>

      {/* Body */}
      <path d="M 72 345 Q 62 385 66 420 L 264 420 Q 268 385 258 345 Q 232 312 216 306 L 165 322 L 114 306 Q 98 312 72 345 Z" fill="#4c1d95" />
      <path d="M 98 336 Q 88 370 90 420 L 240 420 Q 242 370 232 336 Q 216 316 200 311 L 165 326 L 130 311 Q 114 316 98 336 Z" fill="#5b21b6" />
      <path d="M 148 306 L 165 330 L 182 306 Z" fill="white" />
      <path d="M 152 306 L 165 326 L 178 306 Q 172 296 165 296 Q 158 296 152 306 Z" fill="#f0f0f0" />
      <path d="M 162 306 L 168 306 L 171 344 L 165 356 L 159 344 Z" fill="#dc2626" />
      <line x1="165" y1="310" x2="165" y2="356" stroke="#b91c1c" strokeWidth="0.8" opacity="0.5" />
      <circle cx="143" cy="322" r="5" fill="#f0abfc" /><circle cx="143" cy="322" r="3" fill="#e879f9" />
      <ellipse cx="86"  cy="358" rx="24" ry="58" fill="#5b21b6" transform="rotate(-9  86  358)" />
      <ellipse cx="244" cy="358" rx="24" ry="58" fill="#5b21b6" transform="rotate( 9 244 358)" />
      <ellipse cx="75"  cy="403" rx="17" ry="22" fill="url(#kira-skin)" transform="rotate(-9  75 403)" />
      <ellipse cx="255" cy="403" rx="17" ry="22" fill="url(#kira-skin)" transform="rotate( 9 255 403)" />
      <rect x="149" y="272" width="32" height="46" rx="10" fill="url(#kira-skin)" />
      <circle cx="165" cy="294" r="4.5" fill="#f0abfc" /><circle cx="165" cy="294" r="2.5" fill="#e879f9" />

      {/* Hair back */}
      <ellipse cx="80"  cy="228" rx="42" ry="128" fill="#7e22ce" opacity="0.95" transform="rotate(-3  80 228)" />
      <ellipse cx="250" cy="228" rx="42" ry="128" fill="#7e22ce" opacity="0.95" transform="rotate( 3 250 228)" />
      <ellipse cx="72"  cy="318" rx="30" ry="54"  fill="#6b21a8" transform="rotate(-8  72 318)" />
      <ellipse cx="258" cy="318" rx="30" ry="54"  fill="#6b21a8" transform="rotate( 8 258 318)" />

      {/* Face */}
      <ellipse cx="165" cy="190" rx="90" ry="100" fill="url(#kira-skin)" />

      {/* Hair front */}
      <ellipse cx="165" cy="108" rx="97" ry="58" fill="#9333ea" />
      <path d="M 75 142 Q 87 96 121 109 Q 106 147 91 164 Q 79 162 75 142 Z" fill="#9333ea" />
      <path d="M 255 142 Q 243 96 209 109 Q 224 147 239 164 Q 251 162 255 142 Z" fill="#9333ea" />
      <path d="M 138 113 Q 165 130 192 113 Q 185 160 165 164 Q 145 160 138 113 Z" fill="#7e22ce" />
      <path d="M 92 154 Q 101 168 115 167 Q 106 183 95 176 Z" fill="#9333ea" />
      <path d="M 238 154 Q 229 168 215 167 Q 224 183 235 176 Z" fill="#9333ea" />
      <path d="M 75 142 Q 87 96 121 109"  stroke="#6b21a8" strokeWidth="1" fill="none" opacity="0.45" />
      <path d="M 255 142 Q 243 96 209 109" stroke="#6b21a8" strokeWidth="1" fill="none" opacity="0.45" />

      {/* Star clip */}
      <circle cx="108" cy="129" r="11" fill="#f0abfc" />
      <circle cx="108" cy="129" r="7.5" fill="#e879f9" />
      <text x="103" y="133" fontSize="11" fill="white" fontWeight="bold">★</text>

      <ItemLayer slot="hat" equipped={equipped} />
      <AnimatedFace
        blink={blink} offset={offset} mouth={mouth}
        irisGradId="kira-iris" irisDarkColor="#3b0764"
        eyeStroke="#4c1d95" eyebrowStroke="#5b21b6"
        lashes blushColor="#fda4af" mouthStroke="#b45309"
      />
      <ItemLayer slot="accessory" equipped={equipped} />
      {speakState === 'speaking' && <SpeakingPulse c1="#a855f7" c2="#d946ef" c3="#f0abfc" />}
    </svg>
  );
}

// ─── Character: Макс (navy blue, spiky hair, boy) ────────────────────────────
export function MaxAvatar({ blink, mouth, offset, speakState, svgRef, equipped }: CharAvatarProps) {
  const isOpen = mouth !== 'closed';
  const isWide = mouth === 'a' || mouth === 'o';
  const { x: ox, y: oy } = offset;
  const hox = ox * 0.35, hoy = oy * 0.35;
  return (
    <svg ref={svgRef} viewBox="0 0 330 420" width={260} height={331} xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
      <defs>
        <radialGradient id="max-bg"   cx="50%" cy="50%" r="50%"><stop offset="0%"   stopColor="#eff6ff" /><stop offset="100%" stopColor="#dbeafe" /></radialGradient>
        <radialGradient id="max-skin" cx="50%" cy="35%" r="60%"><stop offset="0%"   stopColor="#fde8d0" /><stop offset="100%" stopColor="#fbcfa0" /></radialGradient>
        <radialGradient id="max-iris" cx="38%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#60a5fa" />
          <stop offset="60%"  stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>

      {equipped.background ? <ItemLayer slot="background" equipped={equipped} /> : <circle cx="165" cy="210" r="168" fill="url(#max-bg)" />}
      <ItemLayer slot="aura" equipped={equipped} />
      <text x="30"  y="82"  fontSize="16" fill="#93c5fd" opacity="0.5">◆</text>
      <text x="280" y="96"  fontSize="12" fill="#60a5fa" opacity="0.45">◆</text>
      <text x="46"  y="340" fontSize="11" fill="#93c5fd" opacity="0.4">◆</text>
      <text x="262" y="356" fontSize="14" fill="#3b82f6" opacity="0.4">◆</text>

      {/* Body — dark hoodie */}
      <path d="M 70 345 Q 60 385 64 420 L 266 420 Q 270 385 260 345 Q 234 310 214 304 L 165 318 L 116 304 Q 96 310 70 345 Z" fill="#1e293b" />
      <path d="M 96 336 Q 86 370 88 420 L 242 420 Q 244 370 234 336 Q 218 314 202 309 L 165 322 L 128 309 Q 112 314 96 336 Z" fill="#334155" />
      {/* Pocket */}
      <path d="M 130 372 Q 165 365 200 372 Q 200 395 165 398 Q 130 395 130 372 Z" fill="#1e293b" opacity="0.6" />
      {/* Collar */}
      <path d="M 148 304 L 165 328 L 182 304 Q 175 294 165 294 Q 155 294 148 304 Z" fill="#334155" />
      {/* Blue accent stripes */}
      <line x1="96"  y1="336" x2="88"  y2="380" stroke="#3b82f6" strokeWidth="2" opacity="0.5" />
      <line x1="234" y1="336" x2="242" y2="380" stroke="#3b82f6" strokeWidth="2" opacity="0.5" />
      {/* Arms */}
      <ellipse cx="84"  cy="356" rx="24" ry="58" fill="#1e40af" transform="rotate(-9  84  356)" />
      <ellipse cx="246" cy="356" rx="24" ry="58" fill="#1e40af" transform="rotate( 9 246 356)" />
      <ellipse cx="73"  cy="401" rx="17" ry="22" fill="url(#max-skin)" transform="rotate(-9  73 401)" />
      <ellipse cx="257" cy="401" rx="17" ry="22" fill="url(#max-skin)" transform="rotate( 9 257 401)" />
      <rect x="149" y="274" width="32" height="42" rx="8" fill="url(#max-skin)" />

      {/* Hair back (short) */}
      <ellipse cx="165" cy="118" rx="96" ry="56"  fill="#1e40af" />
      <ellipse cx="80"  cy="170" rx="24" ry="58"  fill="#1d4ed8" opacity="0.9" transform="rotate(-4  80 170)" />
      <ellipse cx="250" cy="170" rx="24" ry="58"  fill="#1d4ed8" opacity="0.9" transform="rotate( 4 250 170)" />

      {/* Face */}
      <ellipse cx="165" cy="190" rx="88" ry="97" fill="url(#max-skin)" />

      {/* Hair front — spiky */}
      <ellipse cx="165" cy="104" rx="93" ry="54" fill="#2563eb" />
      <path d="M 100 112 L 108 78 L 120 114 Z" fill="#1d4ed8" />
      <path d="M 125 104 L 136 68 L 149 108 Z" fill="#2563eb" />
      <path d="M 152 100 L 163 64 L 174 100 Z" fill="#1d4ed8" />
      <path d="M 179 104 L 192 68 L 203 108 Z" fill="#2563eb" />
      <path d="M 208 113 L 218 79 L 226 115 Z" fill="#1d4ed8" />
      <path d="M 78  140 Q 88 96 118 108 Q 104 144 90 160 Q 79 158 78  140 Z" fill="#2563eb" />
      <path d="M 252 140 Q 242 96 212 108 Q 226 144 240 160 Q 251 158 252 140 Z" fill="#2563eb" />
      <path d="M 140 112 Q 165 128 190 112 Q 184 155 165 160 Q 146 155 140 112 Z" fill="#1d4ed8" />

      {/* Eyebrows — thicker/straighter for boy */}
      <path d="M 110 147 Q 129 142 149 145" stroke="#1e3a8a" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M 181 145 Q 201 142 220 147" stroke="#1e3a8a" strokeWidth={3} fill="none" strokeLinecap="round" />

      {/* Eye whites */}
      <ellipse cx={132} cy={164} rx={22} ry={blink ? 2.5 : 24} fill="white" />
      <ellipse cx={198} cy={164} rx={22} ry={blink ? 2.5 : 24} fill="white" />

      {!blink && (
        <>
          <ellipse cx={132 + ox} cy={168 + oy} rx={15} ry={18} fill="url(#max-iris)" />
          <ellipse cx={132 + ox} cy={171 + oy} rx={8}  ry={11} fill="#1e3a8a" />
          <ellipse cx={132 + ox} cy={165 + oy} rx={3}  ry={3.5} fill="#111" />
          <ellipse cx={139 + hox} cy={158 + hoy} rx={5} ry={5.5} fill="white" opacity={0.92} />
          <ellipse cx={127 + hox} cy={173 + hoy} rx={2} ry={2.5} fill="white" opacity={0.6} />

          <ellipse cx={198 + ox} cy={168 + oy} rx={15} ry={18} fill="url(#max-iris)" />
          <ellipse cx={198 + ox} cy={171 + oy} rx={8}  ry={11} fill="#1e3a8a" />
          <ellipse cx={198 + ox} cy={165 + oy} rx={3}  ry={3.5} fill="#111" />
          <ellipse cx={205 + hox} cy={158 + hoy} rx={5} ry={5.5} fill="white" opacity={0.92} />
          <ellipse cx={193 + hox} cy={173 + hoy} rx={2} ry={2.5} fill="white" opacity={0.6} />
        </>
      )}

      <ellipse cx={132} cy={164} rx={22} ry={blink ? 2.5 : 24} fill="none" stroke="#1e40af" strokeWidth={1.5} />
      <ellipse cx={198} cy={164} rx={22} ry={blink ? 2.5 : 24} fill="none" stroke="#1e40af" strokeWidth={1.5} />

      <ellipse cx={159} cy={210} rx={3} ry={2} fill="#d4916a" opacity={0.4} />
      <ellipse cx={171} cy={210} rx={3} ry={2} fill="#d4916a" opacity={0.4} />
      <ellipse cx={108} cy={200} rx={18} ry={9}  fill="#fda4af" opacity={0.18} />
      <ellipse cx={222} cy={200} rx={18} ry={9}  fill="#fda4af" opacity={0.18} />

      <path d={MOUTH_SHAPES[mouth]} stroke="#b45309" strokeWidth={2} fill={isOpen ? '#fecaca' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      {isOpen && <path d="M 153 233 Q 165 237 177 233" stroke="#f97316" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.55} />}
      {isWide && <path d="M 151 228 Q 165 228 179 228" stroke="white" strokeWidth={3.5} fill="none" strokeLinecap="round" />}

      <ItemLayer slot="hat" equipped={equipped} />
      <ItemLayer slot="accessory" equipped={equipped} />
      {speakState === 'speaking' && <SpeakingPulse c1="#3b82f6" c2="#60a5fa" c3="#93c5fd" />}
    </svg>
  );
}

// ─── Character: Эль (pink twin-tails, teal eyes, energetic) ──────────────────
export function ElleAvatar({ blink, mouth, offset, speakState, svgRef, equipped }: CharAvatarProps) {
  return (
    <svg ref={svgRef} viewBox="0 0 330 420" width={260} height={331} xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
      <defs>
        <radialGradient id="elle-bg"   cx="50%" cy="50%" r="50%"><stop offset="0%"   stopColor="#fdf2f8" /><stop offset="100%" stopColor="#fce7f3" /></radialGradient>
        <radialGradient id="elle-skin" cx="50%" cy="35%" r="60%"><stop offset="0%"   stopColor="#fde8d0" /><stop offset="100%" stopColor="#fbcfa0" /></radialGradient>
        <radialGradient id="elle-iris" cx="38%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#2dd4bf" />
          <stop offset="60%"  stopColor="#0d9488" />
          <stop offset="100%" stopColor="#134e4a" />
        </radialGradient>
      </defs>

      {equipped.background ? <ItemLayer slot="background" equipped={equipped} /> : <circle cx="165" cy="210" r="168" fill="url(#elle-bg)" />}
      <ItemLayer slot="aura" equipped={equipped} />
      <text x="36"  y="76"  fontSize="18" fill="#f9a8d4" opacity="0.55">♡</text>
      <text x="274" y="90"  fontSize="14" fill="#67e8f9" opacity="0.5">♡</text>
      <text x="46"  y="338" fontSize="12" fill="#f0abfc" opacity="0.45">♡</text>
      <text x="262" y="350" fontSize="16" fill="#a5f3fc" opacity="0.4">♡</text>

      {/* Body — white blouse */}
      <path d="M 74 345 Q 64 385 68 420 L 262 420 Q 266 385 256 345 Q 230 312 214 306 L 165 320 L 116 306 Q 100 312 74 345 Z" fill="#fdf2f8" />
      <path d="M 100 336 Q 90 370 92 420 L 238 420 Q 240 370 230 336 Q 214 316 198 311 L 165 324 L 132 311 Q 116 316 100 336 Z" fill="white" />
      {/* Big ribbon bow */}
      <path d="M 147 305 Q 122 290 126 308 Q 122 325 147 316 Z" fill="#ec4899" />
      <path d="M 183 305 Q 208 290 204 308 Q 208 325 183 316 Z" fill="#ec4899" />
      <ellipse cx="165" cy="310" rx="12" ry="10" fill="#db2777" />
      <ellipse cx="165" cy="310" rx="6"  ry="5"  fill="#f472b6" />
      {/* Collar */}
      <path d="M 148 305 L 165 328 L 182 305 Z" fill="white" />
      <path d="M 152 305 L 165 324 L 178 305 Q 172 294 165 294 Q 158 294 152 305 Z" fill="#fce7f3" />
      {/* Arms */}
      <ellipse cx="86"  cy="358" rx="23" ry="57" fill="#fdf2f8" transform="rotate(-9  86  358)" />
      <ellipse cx="244" cy="358" rx="23" ry="57" fill="#fdf2f8" transform="rotate( 9 244 358)" />
      {/* Cuffs */}
      <ellipse cx="76"  cy="395" rx="18" ry="10" fill="#fbcfe8" transform="rotate(-9  76 395)" />
      <ellipse cx="254" cy="395" rx="18" ry="10" fill="#fbcfe8" transform="rotate( 9 254 395)" />
      <ellipse cx="73"  cy="403" rx="17" ry="20" fill="url(#elle-skin)" transform="rotate(-9  73 403)" />
      <ellipse cx="257" cy="403" rx="17" ry="20" fill="url(#elle-skin)" transform="rotate( 9 257 403)" />
      <rect x="149" y="272" width="32" height="44" rx="10" fill="url(#elle-skin)" />

      {/* Twin tails (back) */}
      <ellipse cx="72"  cy="285" rx="34" ry="115" fill="#db2777" opacity="0.9" transform="rotate(-8  72 285)" />
      <ellipse cx="258" cy="285" rx="34" ry="115" fill="#db2777" opacity="0.9" transform="rotate( 8 258 285)" />
      {/* Hair ties */}
      <circle cx="78"  cy="255" r="10" fill="#fce7f3" stroke="#db2777" strokeWidth="2.5" />
      <circle cx="78"  cy="255" r="5"  fill="#f472b6" />
      <circle cx="252" cy="255" r="10" fill="#fce7f3" stroke="#db2777" strokeWidth="2.5" />
      <circle cx="252" cy="255" r="5"  fill="#f472b6" />

      {/* Face */}
      <ellipse cx="165" cy="190" rx="90" ry="100" fill="url(#elle-skin)" />

      {/* Hair front — pink */}
      <ellipse cx="165" cy="107" rx="97" ry="57" fill="#ec4899" />
      <path d="M 76 142 Q 88 94 122 108 Q 107 148 92 163 Q 80 161 76 142 Z" fill="#ec4899" />
      <path d="M 254 142 Q 242 94 208 108 Q 223 148 238 163 Q 250 161 254 142 Z" fill="#ec4899" />
      <path d="M 139 112 Q 165 130 191 112 Q 185 159 165 163 Q 145 159 139 112 Z" fill="#db2777" />
      <path d="M 93 153 Q 102 167 116 166 Q 107 182 96 175 Z" fill="#ec4899" />
      <path d="M 237 153 Q 228 167 214 166 Q 223 182 234 175 Z" fill="#ec4899" />
      <path d="M 76 142 Q 88 94 122 108"  stroke="#be185d" strokeWidth="1" fill="none" opacity="0.45" />
      <path d="M 254 142 Q 242 94 208 108" stroke="#be185d" strokeWidth="1" fill="none" opacity="0.45" />
      {/* Cyan star clip */}
      <circle cx="222" cy="127" r="11" fill="#a5f3fc" />
      <circle cx="222" cy="127" r="7.5" fill="#22d3ee" />
      <text x="217" y="131" fontSize="11" fill="white" fontWeight="bold">★</text>

      <ItemLayer slot="hat" equipped={equipped} />
      <AnimatedFace
        blink={blink} offset={offset} mouth={mouth}
        irisGradId="elle-iris" irisDarkColor="#134e4a"
        eyeStroke="#0f766e" eyebrowStroke="#be185d"
        lashes blushColor="#fbcfe8" mouthStroke="#be185d"
      />
      <ItemLayer slot="accessory" equipped={equipped} />
      {speakState === 'speaking' && <SpeakingPulse c1="#2dd4bf" c2="#06b6d4" c3="#a5f3fc" />}
    </svg>
  );
}

// ─── Character registry ───────────────────────────────────────────────────────
export interface CharConfig {
  id:                CharId;
  name:              string;
  emoji:             string;
  label:             string;
  badgeFrom:         string;
  badgeTo:           string;
  subtitleClass:     string;
  voiceHints:        RegExp;
  pitch:             number;
  Avatar:            (props: CharAvatarProps) => React.JSX.Element;
}

export const CHARACTERS: CharConfig[] = [
  {
    id: 'kira', name: 'Кира', emoji: '🌸',
    label: '✦ Кира · Наставник',
    badgeFrom: '#9333ea', badgeTo: '#d946ef',
    subtitleClass: 'text-purple-600 dark:text-purple-400',
    voiceHints: /irina|svetlana|alena/i,
    pitch: 1.1,
    Avatar: KiraAvatar,
  },
  {
    id: 'max', name: 'Макс', emoji: '⚡',
    label: '◆ Макс · Эксперт',
    badgeFrom: '#1d4ed8', badgeTo: '#38bdf8',
    subtitleClass: 'text-blue-600 dark:text-blue-400',
    voiceHints: /pavel|yury|dmitri|male/i,
    pitch: 0.9,
    Avatar: MaxAvatar,
  },
  {
    id: 'elle', name: 'Эль', emoji: '♡',
    label: '♡ Эль · Помощник',
    badgeFrom: '#ec4899', badgeTo: '#22d3ee',
    subtitleClass: 'text-pink-600 dark:text-pink-400',
    voiceHints: /irina|tatiana|natasha/i,
    pitch: 1.2,
    Avatar: ElleAvatar,
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
interface AvatarPlayerProps {
  content:       string;
  lessonTitle?:  string;
}

export function AvatarPlayer({ content }: AvatarPlayerProps) {
  const [speakState,     setSpeakState]     = useState<SpeakState>('idle');
  const [mouth,          setMouth]          = useState<MouthShape>('closed');
  const [blink,          setBlink]          = useState(false);
  const [charIdx,        setCharIdx]        = useState(0);
  const [rate,           setRate]           = useState(1.0);
  const [charId,         setCharId]         = useState<CharId>('kira');
  const [selectedVoice,  setSelectedVoice]  = useState('');   // '' = auto
  const [voices,         setVoices]         = useState<SpeechSynthesisVoice[]>([]);
  const [eyeOffset,      setEyeOffset]      = useState<EyeOffset>({ x: 0, y: 0 });
  const [equipped,       setEquipped]       = useState<EquippedSlots>({});

  const svgRef        = useRef<SVGSVGElement>(null);
  const mouthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rafRef        = useRef<number | null>(null);

  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const char      = useMemo(() => CHARACTERS.find(c => c.id === charId)!, [charId]);
  const plainText = useMemo(() => markdownToSpeech(content || ''), [content]);

  // ── Load equipped items from localStorage ────────────────────────────────
  useEffect(() => { setEquipped(loadLocalEquipped()); }, []);
  useEffect(() => {
    const handler = () => setEquipped(loadLocalEquipped());
    window.addEventListener('avatar_equipped_change', handler);
    return () => window.removeEventListener('avatar_equipped_change', handler);
  }, []);

  // ── Load system voices ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!speechSupported) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const ru = all.filter(v => v.lang.startsWith('ru'));
      setVoices(ru.length ? ru : all.slice(0, 12));
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [speechSupported]);

  // ── Blink loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const schedule = () => {
      blinkTimerRef.current = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); schedule(); }, 160);
      }, 2200 + Math.random() * 2800);
    };
    schedule();
    return () => { blinkTimerRef.current && clearTimeout(blinkTimerRef.current); };
  }, []);

  // ── Mouse → eye tracking ────────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!svgRef.current || rafRef.current !== null) return;
      const { clientX, clientY } = e;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = (clientX - rect.left) / rect.width  * 330;
        const svgY = (clientY - rect.top)  / rect.height * 420;
        // Both eyes track the same point; use mid-eye as anchor
        const dx = svgX - 165, dy = svgY - 163;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const maxTravel = 5.5;
          const s = Math.min(maxTravel, dist) / dist;
          setEyeOffset({ x: dx * s, y: dy * s });
        }
      });
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Mouth animation ─────────────────────────────────────────────────────────
  const startMouth = useCallback(() => {
    let i = 0;
    mouthTimerRef.current = setInterval(() => {
      setMouth(MOUTH_CYCLE[i % MOUTH_CYCLE.length]);
      i++;
    }, 90);
  }, []);

  const stopMouth = useCallback(() => {
    if (mouthTimerRef.current) { clearInterval(mouthTimerRef.current); mouthTimerRef.current = null; }
    setMouth('closed');
  }, []);

  // ── Voice resolution ────────────────────────────────────────────────────────
  const resolveVoice = useCallback(() => {
    const all = window.speechSynthesis.getVoices();
    if (selectedVoice) return all.find(v => v.name === selectedVoice) ?? null;
    return (
      all.find(v => v.lang.startsWith('ru') && char.voiceHints.test(v.name)) ||
      all.find(v => v.lang === 'ru-RU') ||
      all.find(v => v.lang.startsWith('ru')) ||
      null
    );
  }, [selectedVoice, char.voiceHints]);

  // ── Playback ────────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (!speechSupported) return;
    if (speakState === 'paused') {
      window.speechSynthesis.resume();
      setSpeakState('speaking');
      startMouth();
      return;
    }
    window.speechSynthesis.cancel();
    setCharIdx(0);
    const utt  = new SpeechSynthesisUtterance(plainText);
    utt.lang   = 'ru-RU';
    utt.rate   = rate;
    utt.pitch  = char.pitch;
    const voice = resolveVoice();
    if (voice) utt.voice = voice;
    utt.onstart    = () => { setSpeakState('speaking'); startMouth(); };
    utt.onend      = () => { setSpeakState('done');     stopMouth();  setCharIdx(plainText.length); };
    utt.onpause    = () => { setSpeakState('paused');   stopMouth(); };
    utt.onresume   = () => { setSpeakState('speaking'); startMouth(); };
    utt.onboundary = (e) => { if (e.name === 'word') setCharIdx(e.charIndex); };
    window.speechSynthesis.speak(utt);
  }, [speakState, plainText, rate, char.pitch, resolveVoice, startMouth, stopMouth, speechSupported]);

  const handlePause = useCallback(() => { window.speechSynthesis.pause(); }, []);
  const handleStop  = useCallback(() => {
    window.speechSynthesis.cancel(); setSpeakState('idle'); stopMouth(); setCharIdx(0);
  }, [stopMouth]);

  const handleCharChange = useCallback((id: CharId) => {
    window.speechSynthesis.cancel(); setSpeakState('idle'); stopMouth();
    setCharIdx(0); setSelectedVoice(''); setCharId(id);
  }, [stopMouth]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); stopMouth(); }, [stopMouth]);

  // ── Subtitle ────────────────────────────────────────────────────────────────
  const subtitle = useMemo(() => {
    if (!plainText || speakState !== 'speaking' || charIdx === 0) return null;
    const spaceIdx = plainText.indexOf(' ', charIdx);
    const wordEnd  = spaceIdx === -1 ? plainText.length : spaceIdx;
    return {
      before:  plainText.substring(Math.max(0, charIdx - 55), charIdx),
      current: plainText.substring(charIdx, wordEnd),
      after:   plainText.substring(wordEnd, Math.min(plainText.length, wordEnd + 140)),
    };
  }, [plainText, speakState, charIdx]);

  const { Avatar } = char;
  const badgeStyle = { background: `linear-gradient(to right, ${char.badgeFrom}, ${char.badgeTo})` };
  const btnStyle   = { background: `linear-gradient(to right, ${char.badgeFrom}, ${char.badgeTo})` };

  return (
    <div className="flex flex-col items-center gap-5 py-4 select-none">

      {/* ── Character selector ── */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {CHARACTERS.map(c => {
          const active = charId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCharChange(c.id)}
              style={active ? { background: `linear-gradient(to right, ${c.badgeFrom}, ${c.badgeTo})` } : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${
                active
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.emoji} {c.name}
            </button>
          );
        })}
      </div>

      {/* ── Avatar ── */}
      <div className="relative">
        <Avatar blink={blink} mouth={mouth} offset={eyeOffset} speakState={speakState} svgRef={svgRef} equipped={equipped} />
        <div
          style={badgeStyle}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wide"
        >
          {char.label}
        </div>
      </div>

      {/* ── Subtitle ── */}
      <div
        className="w-full max-w-xl mt-2 min-h-[56px] rounded-2xl bg-muted/50 border border-border/50 px-5 py-3 text-sm text-center leading-relaxed"
        aria-live="polite"
      >
        {speakState === 'idle'    && <span className="text-muted-foreground italic text-xs">{plainText ? `Нажмите ▶ — ${char.name} озвучит урок` : 'Нет текста'}</span>}
        {speakState === 'paused'  && <span className="text-muted-foreground italic text-xs">Пауза · нажмите ▶ чтобы продолжить</span>}
        {speakState === 'done'    && <span className={`${char.subtitleClass} font-semibold text-xs`}>✓ Урок озвучен полностью</span>}
        {speakState === 'speaking' && (
          subtitle
            ? <span>
                <span className="text-muted-foreground/55">{subtitle.before}</span>
                <span className={`${char.subtitleClass} font-semibold`}>{subtitle.current}</span>
                <span className="text-foreground/80">{subtitle.after}</span>
              </span>
            : <span className="text-muted-foreground italic text-xs">{char.name} говорит…</span>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        {(speakState === 'idle' || speakState === 'done') ? (
          <Button
            onClick={handlePlay}
            disabled={!speechSupported || !plainText}
            size="sm"
            style={btnStyle}
            className="gap-2 text-white border-0 shadow-md hover:opacity-90"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {speakState === 'done' ? 'Слушать снова' : 'Слушать урок'}
          </Button>
        ) : speakState === 'paused' ? (
          <Button onClick={handlePlay} size="sm" style={btnStyle} className="gap-2 text-white border-0 shadow-md hover:opacity-90">
            <Play className="w-3.5 h-3.5 fill-white" /> Продолжить
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline" size="sm" className="gap-2">
            <Pause className="w-3.5 h-3.5" /> Пауза
          </Button>
        )}

        {(speakState === 'speaking' || speakState === 'paused') && (
          <Button onClick={handleStop} variant="outline" size="icon" className="w-8 h-8" title="Стоп">
            <Square className="w-3.5 h-3.5 fill-current" />
          </Button>
        )}

        {/* Speed */}
        <div className="flex items-center gap-1.5" title="Скорость речи">
          <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value={0.75}>0.75×</option>
            <option value={0.9}>0.9×</option>
            <option value={1.0}>1.0×</option>
            <option value={1.15}>1.15×</option>
            <option value={1.4}>1.4×</option>
          </select>
        </div>

        {/* Voice picker */}
        {voices.length > 0 && (
          <select
            value={selectedVoice}
            onChange={e => setSelectedVoice(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer max-w-[160px] truncate"
            title="Голос"
          >
            <option value="">🎤 Авто</option>
            {voices.map(v => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
        )}
      </div>

      {!speechSupported && (
        <p className="text-xs text-destructive text-center mt-1">
          Браузер не поддерживает синтез речи. Используйте Chrome или Edge.
        </p>
      )}
    </div>
  );
}
