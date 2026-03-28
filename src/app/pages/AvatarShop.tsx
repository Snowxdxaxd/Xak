import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Coins, CheckCircle2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  SHOP_ITEMS, ITEM_MAP,
  RARITY_BORDER, RARITY_BADGE, RARITY_LABEL, CATEGORY_LABEL,
  type EquippedSlots, type ItemCategory, type ShopItem,
} from '../lib/shopItems';
import { CHARACTERS, type CharId } from '../components/AvatarPlayer';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_EQUIPPED = 'avatar_equipped';
const LS_SESSION  = 'app_session';

function getToken(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
    return s?.access_token ?? null;
  } catch { return null; }
}

const CATEGORIES: (ItemCategory | 'all')[] = ['all', 'hat', 'accessory', 'aura', 'background'];
const CAT_LABEL: Record<ItemCategory | 'all', string> = {
  all:        'Все',
  hat:        'Шапки',
  accessory:  'Аксессуары',
  aura:       'Аура',
  background: 'Фоны',
};

// ─── Avatar preview (static pose) ────────────────────────────────────────────
const IDLE_OFFSET = { x: 0, y: 0 };
const IDLE_MOUTH  = 'closed' as const;

function AvatarPreview({ charId, equipped }: { charId: CharId; equipped: EquippedSlots }) {
  const config  = CHARACTERS.find(c => c.id === charId)!;
  const svgRef  = useRef<SVGSVGElement>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <config.Avatar
        blink={false} mouth={IDLE_MOUTH} offset={IDLE_OFFSET}
        speakState="idle" svgRef={svgRef} equipped={equipped}
      />
      <span className="text-xs text-muted-foreground">{config.name}</span>
    </div>
  );
}

// ─── AvatarShop ───────────────────────────────────────────────────────────────
export function AvatarShop() {
  const { user } = useAuth();

  const [coins,    setCoins]    = useState(0);
  const [owned,    setOwned]    = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<EquippedSlots>({});
  const [charId,   setCharId]   = useState<CharId>('kira');
  const [tab,      setTab]      = useState<'shop' | 'inventory'>('shop');
  const [catFilter,setCatFilter]= useState<ItemCategory | 'all'>('all');
  const [loading,  setLoading]  = useState(true);
  const [buying,   setBuying]   = useState<string | null>(null);

  // ── Load inventory ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    // Also load equipped from localStorage immediately for responsiveness
    try {
      const e = JSON.parse(localStorage.getItem(LS_EQUIPPED) || '{}');
      setEquipped(e);
    } catch {}

    const token = getToken();
    if (!token) { setLoading(false); return; }

    fetch('/api/shop/inventory', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCoins(data.coins ?? 0);
        setOwned(new Set(data.ownedIds ?? []));
        const eq: EquippedSlots = data.equipped ?? {};
        setEquipped(eq);
        localStorage.setItem(LS_EQUIPPED, JSON.stringify(eq));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // ── Buy ─────────────────────────────────────────────────────────────────────
  const handleBuy = async (item: ShopItem) => {
    const token = getToken();
    if (!token) return;
    if (coins < item.price) { toast.error(`Не хватает монет! Нужно ${item.price} 🪙`); return; }
    setBuying(item.id);
    try {
      const r = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: item.id }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || 'Ошибка покупки'); return; }
      setCoins(d.coins);
      setOwned(prev => new Set([...prev, item.id]));
      toast.success(`Куплено: ${item.emoji} ${item.name}!`);
    } catch {
      toast.error('Сетевая ошибка');
    } finally {
      setBuying(null);
    }
  };

  // ── Equip / Unequip ─────────────────────────────────────────────────────────
  const handleEquip = async (item: ShopItem) => {
    const token = getToken();
    if (!token) return;
    const isEquipped = equipped[item.category] === item.id;
    const url     = isEquipped ? '/api/shop/unequip' : '/api/shop/equip';
    const payload = isEquipped
      ? { slot: item.category }
      : { itemId: item.id, slot: item.category };

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const d = await r.json(); toast.error(d.error || 'Ошибка'); return; }

      const newEquipped = { ...equipped };
      if (isEquipped) {
        delete newEquipped[item.category];
      } else {
        newEquipped[item.category] = item.id;
      }
      setEquipped(newEquipped);
      localStorage.setItem(LS_EQUIPPED, JSON.stringify(newEquipped));
      window.dispatchEvent(new Event('avatar_equipped_change'));
      toast.success(isEquipped ? 'Снято' : `Надето: ${item.emoji} ${item.name}`);
    } catch {
      toast.error('Сетевая ошибка');
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const visibleItems = SHOP_ITEMS.filter(i => {
    if (tab === 'inventory' && !owned.has(i.id)) return false;
    if (catFilter !== 'all' && i.category !== catFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Магазин аватара</h1>
              <p className="text-muted-foreground text-sm">Одень своего персонажа за монеты</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-amber-600 dark:text-amber-400">{coins} монет</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">

          {/* Left: Character Preview */}
          <div className="flex flex-col gap-4">
            {/* Character switcher */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Персонаж</p>
              <div className="flex flex-col gap-2">
                {CHARACTERS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCharId(c.id)}
                    style={charId === c.id ? { background: `linear-gradient(to right, ${c.badgeFrom}, ${c.badgeTo})` } : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      charId === c.id ? 'text-white border-transparent' : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar preview */}
            <div className="rounded-2xl border border-border bg-card p-4 flex justify-center">
              <AvatarPreview charId={charId} equipped={equipped} />
            </div>

            {/* Equipped items summary */}
            {Object.keys(equipped).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Надето</p>
                <div className="space-y-2">
                  {(Object.entries(equipped) as [keyof EquippedSlots, string][]).map(([slot, id]) => {
                    const item = ITEM_MAP[id];
                    if (!item) return null;
                    return (
                      <div key={slot} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{CATEGORY_LABEL[slot]}</span>
                        <span className="flex items-center gap-1 font-medium">{item.emoji} {item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Shop / Inventory */}
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted w-fit">
              {(['shop', 'inventory'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {t === 'shop' ? '🛒 Магазин' : `🎒 Инвентарь (${owned.size})`}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    catFilter === c
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {CAT_LABEL[c]}
                </button>
              ))}
            </div>

            {/* Items grid */}
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 opacity-30" />
                <p className="font-medium">{tab === 'inventory' ? 'Инвентарь пуст' : 'Нет предметов'}</p>
                <p className="text-sm opacity-70">{tab === 'inventory' ? 'Купи что-нибудь в Магазине!' : 'Попробуй другую категорию'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {visibleItems.map(item => {
                  const isOwned   = owned.has(item.id);
                  const isEq      = equipped[item.category] === item.id;
                  const isBuying  = buying === item.id;
                  const canAfford = coins >= item.price;

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-2xl border-2 bg-card p-3 flex flex-col gap-2 transition-all ${
                        isEq ? 'border-yellow-400/80 bg-yellow-500/5' : RARITY_BORDER[item.rarity]
                      }`}
                    >
                      {/* Rarity badge */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RARITY_BADGE[item.rarity]}`}>
                          {RARITY_LABEL[item.rarity]}
                        </span>
                        {isEq && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Emoji + name */}
                      <div className="flex flex-col items-center gap-1 py-2">
                        <span className="text-3xl">{item.emoji}</span>
                        <p className="text-xs font-semibold text-center leading-tight">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground text-center leading-tight">{item.description}</p>
                      </div>

                      {/* Price / action */}
                      <div className="mt-auto">
                        {!isOwned ? (
                          <Button
                            size="sm"
                            onClick={() => handleBuy(item)}
                            disabled={isBuying || !canAfford}
                            variant={canAfford ? 'default' : 'outline'}
                            className="w-full text-xs h-8 gap-1"
                          >
                            {isBuying ? (
                              <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                            ) : (
                              <><Coins className="w-3 h-3" /> {item.price}</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleEquip(item)}
                            variant={isEq ? 'outline' : 'secondary'}
                            className="w-full text-xs h-8"
                          >
                            {isEq ? '✓ Снять' : 'Надеть'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AvatarShop;
