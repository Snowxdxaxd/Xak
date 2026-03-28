// ─── Shop Item Catalog ────────────────────────────────────────────────────────
// All items are SVG groups rendered inside viewBox="0 0 330 420"

export type ItemCategory = 'hat' | 'accessory' | 'aura' | 'background';
export type ItemRarity   = 'common' | 'rare' | 'epic' | 'legendary';

export interface ShopItem {
  id:          string;
  name:        string;
  description: string;
  price:       number;
  category:    ItemCategory;
  emoji:       string;
  rarity:      ItemRarity;
  Render:      () => JSX.Element;
}

export type EquippedSlots = {
  hat?:        string;
  accessory?:  string;
  aura?:       string;
  background?: string;
};

export const RARITY_BORDER: Record<ItemRarity, string> = {
  common:    'border-gray-400/60',
  rare:      'border-blue-400/70',
  epic:      'border-purple-400/70',
  legendary: 'border-yellow-400/80',
};
export const RARITY_BADGE: Record<ItemRarity, string> = {
  common:    'bg-gray-500/20 text-gray-300',
  rare:      'bg-blue-500/20 text-blue-300',
  epic:      'bg-purple-500/20 text-purple-300',
  legendary: 'bg-yellow-500/20 text-yellow-300',
};
export const RARITY_LABEL: Record<ItemRarity, string> = {
  common:    'Обычный',
  rare:      'Редкий',
  epic:      'Эпический',
  legendary: 'Легендарный',
};
export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  hat:        'Шапки',
  accessory:  'Аксессуары',
  aura:       'Аура',
  background: 'Фоны',
};

// ─── HAT: Golden Crown ────────────────────────────────────────────────────────
function CrownRender() {
  return (
    <g>
      <path d="M 132 107 L 132 88 L 150 99 L 165 76 L 180 99 L 198 88 L 198 107 Z"
        fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="165" cy="78" r="5.5" fill="#ef4444" />
      <circle cx="150" cy="97" r="3.5" fill="#3b82f6" />
      <circle cx="180" cy="97" r="3.5" fill="#10b981" />
      <path d="M 135 102 L 135 93 L 142 97 Z" fill="#fef08a" opacity="0.65" />
      <path d="M 195 102 L 195 93 L 188 97 Z" fill="#fef08a" opacity="0.65" />
      <rect x="132" y="107" width="66" height="7" rx="3" fill="#d97706" />
    </g>
  );
}

// ─── HAT: Cat Ears ────────────────────────────────────────────────────────────
function CatEarsRender() {
  return (
    <g>
      <path d="M 95 119 L 82 76 L 113 97 Z" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 235 119 L 248 76 L 217 97 Z" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 96 115 L 86 80 L 109 99 Z" fill="#fce7f3" />
      <path d="M 234 115 L 244 80 L 221 99 Z" fill="#fce7f3" />
    </g>
  );
}

// ─── HAT: Witch Hat ───────────────────────────────────────────────────────────
function WitchHatRender() {
  return (
    <g>
      <ellipse cx="165" cy="113" rx="68" ry="14" fill="#1e1b4b" stroke="#4c1d95" strokeWidth="1.5" />
      <path d="M 127 113 L 165 44 L 203 113 Z" fill="#0f0a24" stroke="#4c1d95" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="148" y="103" width="34" height="8" rx="2" fill="#7c3aed" />
      <circle cx="165" cy="103" r="5" fill="#f0abfc" />
      <text x="161" y="85" fontSize="14" fill="#fbbf24" textAnchor="middle">★</text>
    </g>
  );
}

// ─── HAT: Halo ────────────────────────────────────────────────────────────────
function HaloRender() {
  return (
    <g>
      <ellipse cx="165" cy="70" rx="40" ry="11" fill="none" stroke="#fbbf24" strokeWidth="4" />
      <ellipse cx="165" cy="70" rx="40" ry="11" fill="none" stroke="#fef9c3" strokeWidth="2" opacity="0.6" />
      <ellipse cx="165" cy="70" rx="44" ry="14" fill="none" stroke="#fef3c7" strokeWidth="1" opacity="0.3" />
    </g>
  );
}

// ─── ACCESSORY: Star Glasses ──────────────────────────────────────────────────
function StarGlassesRender() {
  // Simple star-like pentagon glasses
  return (
    <g>
      <polygon points="132,151 136,161 148,161 138,168 142,178 132,171 122,178 126,168 116,161 128,161"
        fill="#f9a8d4" fillOpacity="0.82" stroke="#ec4899" strokeWidth="1.5" />
      <polygon points="198,151 202,161 214,161 204,168 208,178 198,171 188,178 192,168 182,161 194,161"
        fill="#f9a8d4" fillOpacity="0.82" stroke="#ec4899" strokeWidth="1.5" />
      <path d="M 148 162 Q 165 157 182 162" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
      <line x1="116" y1="162" x2="107" y2="160" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
      <line x1="214" y1="162" x2="223" y2="160" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

// ─── ACCESSORY: Gaming Headphones ────────────────────────────────────────────
function HeadphonesRender() {
  return (
    <g>
      <path d="M 96 162 Q 96 98 165 94 Q 234 98 234 162"
        fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
      <rect x="82" y="154" width="26" height="32" rx="9" fill="#0f172a" stroke="#3b82f6" strokeWidth="2.5" />
      <rect x="86" y="159" width="18" height="22" rx="6" fill="#0ea5e9" opacity="0.55" />
      <rect x="222" y="154" width="26" height="32" rx="9" fill="#0f172a" stroke="#3b82f6" strokeWidth="2.5" />
      <rect x="226" y="159" width="18" height="22" rx="6" fill="#0ea5e9" opacity="0.55" />
      <circle cx="92" cy="158" r="3.5" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ─── ACCESSORY: Fox Mask ──────────────────────────────────────────────────────
function FoxMaskRender() {
  return (
    <g>
      <path d="M 102 147 Q 102 190 133 193 L 197 193 Q 228 190 228 147 Q 210 132 196 137 L 165 131 L 134 137 Q 120 132 102 147 Z"
        fill="#fed7aa" fillOpacity="0.88" stroke="#ea580c" strokeWidth="1.5" />
      <path d="M 110 145 L 101 119 L 128 139 Z" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 220 145 L 229 119 L 202 139 Z" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 112 143 L 105 122 L 124 138 Z" fill="#fda4af" />
      <path d="M 218 143 L 225 122 L 206 138 Z" fill="#fda4af" />
      <ellipse cx="133" cy="165" rx="20" ry="19" fill="none" stroke="#ea580c" strokeWidth="2.5" />
      <ellipse cx="197" cy="165" rx="20" ry="19" fill="none" stroke="#ea580c" strokeWidth="2.5" />
      <ellipse cx="165" cy="186" rx="7" ry="5" fill="#f97316" opacity="0.55" />
      <path d="M 140 177 Q 165 183 190 177" stroke="#ea580c" strokeWidth="1.5" fill="none" opacity="0.5" />
    </g>
  );
}

// ─── AURA: Fire ───────────────────────────────────────────────────────────────
function FireAuraRender() {
  return (
    <g>
      <path d="M 78 360 Q 66 334 78 312 Q 72 340 84 346 Q 74 322 88 306 Q 80 332 94 342 Q 82 324 92 310 Q 88 336 98 348 Z"
        fill="#f97316" opacity="0.72" />
      <path d="M 252 360 Q 264 334 252 312 Q 258 340 246 346 Q 256 322 242 306 Q 250 332 236 342 Q 248 324 238 310 Q 242 336 232 348 Z"
        fill="#f97316" opacity="0.72" />
      <path d="M 102 403 Q 92 378 107 360 Q 100 380 114 386 Q 104 367 120 354 Z" fill="#ef4444" opacity="0.65" />
      <path d="M 165 410 Q 156 387 165 370 Q 159 390 173 390 Q 161 374 176 362 Z" fill="#f97316" opacity="0.6" />
      <path d="M 228 403 Q 238 378 223 360 Q 230 380 216 386 Q 226 367 210 354 Z" fill="#ef4444" opacity="0.65" />
      <circle cx="89" cy="318" r="2.5" fill="#fbbf24" opacity="0.75">
        <animate attributeName="cy" values="318;296;274" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.75;0.4;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="241" cy="323" r="2" fill="#fbbf24" opacity="0.65">
        <animate attributeName="cy" values="323;301;279" dur="1.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.65;0.3;0" dur="1.7s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ─── AURA: Sparkles ───────────────────────────────────────────────────────────
function SparkleAuraRender() {
  const pts: [number, number, string][] = [
    [62,138,'✦'], [268,148,'✧'], [48,228,'✦'], [282,218,'✧'],
    [70,298,'✦'], [262,308,'✧'], [165,58,'✦'],
  ];
  return (
    <g>
      {pts.map(([x, y, s], i) => (
        <text key={i} x={x} y={y} fontSize="15" fill="#fef08a" textAnchor="middle">
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur={`${1.1 + i * 0.28}s`} repeatCount="indefinite" />
          <animate attributeName="fontSize" values="15;9;15" dur={`${1.1 + i * 0.28}s`} repeatCount="indefinite" />
          {s}
        </text>
      ))}
    </g>
  );
}

// ─── AURA: Rainbow ────────────────────────────────────────────────────────────
function RainbowAuraRender() {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
  return (
    <g opacity="0.45">
      {colors.map((c, i) => (
        <ellipse key={i} cx="165" cy="248" rx={108 + i * 10} ry={132 + i * 9}
          fill="none" stroke={c} strokeWidth="2.5">
          <animate attributeName="opacity" values="0.45;0.18;0.45" dur={`${1.8 + i * 0.22}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
    </g>
  );
}

// ─── BG: Night Sky ────────────────────────────────────────────────────────────
const STARS: [number, number, number][] = [
  [60,78,1.2],[104,48,1.8],[142,68,1.2],[202,43,2],[252,73,1.5],[291,108,1.2],
  [38,158,1.8],[302,178,1.2],[28,258,1.2],[296,249,2],[48,338,1.5],[281,330,1.2],
  [128,380,1.8],[222,368,1.2],[164,398,1.5],[79,400,1.2],[242,399,2],
  [158,118,1.2],[201,158,1.8],[118,178,1.2],[241,199,1.5],
];
function NightSkyBgRender() {
  return (
    <g>
      <circle cx="165" cy="210" r="168" fill="#0f172a" />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity="0.7">
          {i % 4 === 0 && <animate attributeName="opacity" values="0.9;0.25;0.9" dur={`${1.4 + (i % 5) * 0.45}s`} repeatCount="indefinite" />}
        </circle>
      ))}
      <circle cx="272" cy="68" r="22" fill="#fef3c7" opacity="0.9" />
      <circle cx="280" cy="62" r="18" fill="#0f172a" />
    </g>
  );
}

// ─── BG: Cherry Blossom ───────────────────────────────────────────────────────
const PETALS: [number, number, number][] = [
  [50,78,0],[112,53,37],[182,63,74],[242,83,111],[292,118,148],
  [28,178,180],[302,198,37],[38,278,110],[297,288,70],[58,358,20],
  [280,348,50],[162,58,140],[222,128,30],[98,318,160],[178,388,80],
];
function CherryBlossomBgRender() {
  return (
    <g>
      <circle cx="165" cy="210" r="168" fill="#fff1f2" />
      {PETALS.map(([x, y, rot], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${rot})`}>
          <ellipse rx="6" ry="10" fill="#fda4af" opacity={0.45 + (i % 3) * 0.18} />
        </g>
      ))}
      <path d="M 28 28 Q 80 38 98 78 Q 78 58 138 88" stroke="#92400e" strokeWidth="4" fill="none" opacity="0.3" />
      <circle cx="143" cy="86" r="11" fill="#fda4af" opacity="0.6" />
      <circle cx="130" cy="76" r="8"  fill="#fbcfe8" opacity="0.7" />
    </g>
  );
}

// ─── Catalog ─────────────────────────────────────────────────────────────────
export const SHOP_ITEMS: ShopItem[] = [
  // HATS
  { id: 'crown',          name: 'Золотая корона',  description: 'Корона настоящего знатока',     price: 200, category: 'hat',        emoji: '👑', rarity: 'rare',      Render: CrownRender },
  { id: 'cat_ears',       name: 'Кошачьи ушки',   description: 'Мяу! Ну очень мило',            price: 120, category: 'hat',        emoji: '🐱', rarity: 'common',    Render: CatEarsRender },
  { id: 'witch_hat',      name: 'Шляпа ведьмы',   description: 'Колдовство знаний',              price: 280, category: 'hat',        emoji: '🧙', rarity: 'epic',      Render: WitchHatRender },
  { id: 'halo',           name: 'Нимб',            description: 'Для настоящих ангелов учёбы',   price: 350, category: 'hat',        emoji: '✨', rarity: 'legendary', Render: HaloRender },
  // ACCESSORIES
  { id: 'star_glasses',   name: 'Звёздные очки',  description: 'Смотри на мир через звёзды',    price: 180, category: 'accessory',  emoji: '⭐', rarity: 'rare',      Render: StarGlassesRender },
  { id: 'headphones',     name: 'Наушники',        description: 'В ритме знаний',                price: 250, category: 'accessory',  emoji: '🎧', rarity: 'epic',      Render: HeadphonesRender },
  { id: 'fox_mask',       name: 'Маска лисы',      description: 'Хитрость и мудрость',           price: 300, category: 'accessory',  emoji: '🦊', rarity: 'epic',      Render: FoxMaskRender },
  // AURA
  { id: 'fire_aura',      name: 'Огненная аура',  description: 'Страсть к знаниям горит!',      price: 320, category: 'aura',       emoji: '🔥', rarity: 'legendary', Render: FireAuraRender },
  { id: 'sparkle_aura',   name: 'Сияние',          description: 'Ты сияешь от знаний',           price: 220, category: 'aura',       emoji: '💫', rarity: 'epic',      Render: SparkleAuraRender },
  { id: 'rainbow_aura',   name: 'Радужная аура',  description: 'Радуга вокруг тебя',             price: 280, category: 'aura',       emoji: '🌈', rarity: 'rare',      Render: RainbowAuraRender },
  // BACKGROUNDS
  { id: 'night_sky',      name: 'Ночное небо',    description: 'Звёзды — как твои знания',      price: 160, category: 'background', emoji: '🌌', rarity: 'rare',      Render: NightSkyBgRender },
  { id: 'cherry_blossom', name: 'Сакура',          description: 'Цветение в момент учёбы',       price: 200, category: 'background', emoji: '🌸', rarity: 'rare',      Render: CherryBlossomBgRender },
];

export const ITEM_MAP: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));

// Coins awarded per level-up (same formula as server: level * 50)
export function coinsPerLevel(level: number): number {
  return level * 50;
}
