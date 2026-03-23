import React, { useState } from 'react';
import { Trash2, Minus, Plus, ChevronDown, AlertTriangle } from 'lucide-react';

// ─── Pack Structure ─────────────────────────────────────────────────────────

export interface PackStructure {
  n: number;        // strips per box (or 1 if single strip)
  m: number;        // units per strip
  total: number;    // n * m = total units per inventory pack
  hasBox: boolean;  // n > 1 → can sell as box
  hasUnit: boolean; // total > 1 → can sell individual units
  isVolume: boolean;
}

export function parsePackStructure(packSize: string | null): PackStructure {
  if (!packSize) return { n: 1, m: 1, total: 1, hasBox: false, hasUnit: false, isVolume: false };
  const trimmed = packSize.trim();
  const match = trimmed.match(/^(\d+)[xX](\d+)$/);
  if (match) {
    const n = parseInt(match[1]);
    const m = parseInt(match[2]);
    return { n, m, total: n * m, hasBox: n > 1, hasUnit: n * m > 1, isVolume: false };
  }
  if (/\d+\s*ml/i.test(trimmed) || /\d+\s*g/i.test(trimmed)) {
    return { n: 1, m: 1, total: 1, hasBox: false, hasUnit: false, isVolume: true };
  }
  return { n: 1, m: 1, total: 1, hasBox: false, hasUnit: false, isVolume: false };
}

// Unit mode — what are we selling per "quantity" unit
export type UnitMode = 'box' | 'strip' | 'unit';

/** How many inventory packs does selling `qty` of `mode` consume? */
export function packsConsumed(mode: UnitMode, qty: number, pack: PackStructure): number {
  if (mode === 'box') return qty;                            // 1 box = 1 inventory pack
  if (mode === 'strip') return pack.n > 1 ? Math.ceil(qty / pack.n) : qty;
  return Math.ceil(qty / pack.total);                       // 'unit'
}

/** Max qty of `mode` given available packs */
export function maxQtyForMode(mode: UnitMode, availPacks: number, pack: PackStructure): number {
  if (mode === 'box') return availPacks;
  if (mode === 'strip') return pack.n > 1 ? availPacks * pack.n : availPacks;
  return availPacks * pack.total;
}

/** Price per `mode` unit given per-pack price */
export function pricePerUnit(mode: UnitMode, packPrice: number, pack: PackStructure): number {
  if (mode === 'box') return packPrice;
  if (mode === 'strip') return pack.n > 1 ? packPrice / pack.n : packPrice;
  return packPrice / pack.total;
}

// ─── Batch & Cart types ────────────────────────────────────────────────────

export interface BatchOption {
  id: string;
  batch_code: string | null;
  expiry_date: string;
  quantity_remaining: number;  // in inventory packs
  selling_price: number | null;
  mrp: number | null;
}

export interface CartItemType {
  inventory_id: string;
  medicine_id: string;
  name: string;
  company: string | null;
  type: string | null;
  pack_size: string | null;
  pack: PackStructure;
  mrp: number | null;             // medicine MRP — price fallback
  available_quantity: number;     // total packs in inventory
  batches: BatchOption[];         // all available batches
  selected_batch_id: string;      // '' = auto FEFO
  quantity: number;               // in chosen unit mode
  unit: UnitMode;
  price: number;                  // per chosen unit
}

// ─── Unit label helpers ────────────────────────────────────────────────────

function singularUnit(type: string | null): string {
  if (!type) return 'Unit';
  switch (type.toLowerCase()) {
    case 'tablet':    return 'Tab';
    case 'capsule':   return 'Cap';
    case 'syrup':     return 'mL';
    case 'injection': return 'mL';
    case 'drops':     return 'Drop';
    case 'ointment':  return 'g';
    default:          return 'Unit';
  }
}

function stripLabel(pack: PackStructure, type: string | null): string {
  const u = singularUnit(type);
  return pack.m > 1 ? `Strip (${pack.m} ${u}s)` : 'Strip';
}

function boxLabel(pack: PackStructure, type: string | null): string {
  const u = singularUnit(type);
  return `Box (${pack.total} ${u}s)`;
}

// ─── Type colour ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  tablet:    'bg-blue-50 text-blue-700 border-blue-100',
  capsule:   'bg-purple-50 text-purple-700 border-purple-100',
  syrup:     'bg-amber-50 text-amber-700 border-amber-100',
  injection: 'bg-red-50 text-red-700 border-red-100',
  ointment:  'bg-green-50 text-green-700 border-green-100',
  drops:     'bg-teal-50 text-teal-700 border-teal-100',
};
function typeColor(type: string | null) {
  return (type && TYPE_COLORS[type.toLowerCase()]) ?? 'bg-slate-50 text-slate-600 border-slate-200';
}

// ─── CartItem component ────────────────────────────────────────────────────

interface CartItemProps {
  item: CartItemType;
  key?: string | number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateUnit: (id: string, unit: UnitMode, newPrice: number, newQty?: number) => void;
  onUpdateBatch: (id: string, batchId: string, newPrice: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({
  item, onUpdateQuantity, onUpdatePrice, onUpdateUnit, onUpdateBatch, onRemove,
}: CartItemProps) {
  const { pack, unit } = item;
  const batchForPrice = item.batches.find(b => b.id === item.selected_batch_id) ?? item.batches[0];
  // Fallback chain: batch selling_price → batch mrp → medicine mrp
  const packSellPrice = batchForPrice?.selling_price ?? batchForPrice?.mrp ?? item.mrp ?? 0;

  const maxQty = (() => {
    const availPacks = item.selected_batch_id
      ? (item.batches.find(b => b.id === item.selected_batch_id)?.quantity_remaining ?? item.available_quantity)
      : item.available_quantity;
    return maxQtyForMode(unit, availPacks, pack);
  })();

  const total = item.quantity * item.price;
  const uSingular = singularUnit(item.type);

  // Today for expiry checks
  const today = new Date().toISOString().split('T')[0];
  const inThreeMonths = new Date();
  inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);
  const threeMonthsStr = inThreeMonths.toISOString().split('T')[0];

  function expiryStatus(dateStr: string): 'ok' | 'soon' | 'expired' {
    if (dateStr < today) return 'expired';
    if (dateStr < threeMonthsStr) return 'soon';
    return 'ok';
  }

  const increment = () => { if (item.quantity < maxQty) onUpdateQuantity(item.medicine_id, item.quantity + 1); };
  const decrement = () => { if (item.quantity > 1) onUpdateQuantity(item.medicine_id, item.quantity - 1); };

  const handleQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1) onUpdateQuantity(item.medicine_id, Math.min(val, maxQty));
  };

  const handlePriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdatePrice(item.medicine_id, isNaN(val) ? 0 : val);
  };

  const handleUnitChange = (newUnit: UnitMode) => {
    if (newUnit === unit) return;
    const newPrice = parseFloat(pricePerUnit(newUnit, packSellPrice, pack).toFixed(2));
    // Convert current qty to new unit
    const currentPacks = packsConsumed(unit, item.quantity, pack);
    const newQty = Math.max(1, maxQtyForMode(newUnit, currentPacks, pack));
    onUpdateUnit(item.medicine_id, newUnit, newPrice, Math.min(newQty, maxQtyForMode(newUnit, item.available_quantity, pack)));
  };

  const handleBatchChange = (batchId: string) => {
    const batch = item.batches.find(b => b.id === batchId) ?? item.batches[0];
    const batchPackPrice = batch?.selling_price ?? batch?.mrp ?? 0;
    const newPrice = parseFloat(pricePerUnit(unit, batchPackPrice, pack).toFixed(2));
    onUpdateBatch(item.medicine_id, batchId, newPrice);
  };

  // ── Unit mode tabs available for this pack ──
  const unitOptions: { value: UnitMode; label: string }[] = [];
  if (pack.hasBox) unitOptions.push({ value: 'box', label: boxLabel(pack, item.type) });
  unitOptions.push({ value: 'strip', label: pack.hasBox ? stripLabel(pack, item.type) : `Pack (${pack.m} ${uSingular}s)` });
  if (pack.hasUnit && !pack.isVolume) unitOptions.push({ value: 'unit', label: `Per ${uSingular}` });

  const currentBatch = item.batches.find(b => b.id === item.selected_batch_id);
  const batchStatus = currentBatch ? expiryStatus(currentBatch.expiry_date) : 'ok';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="font-bold text-slate-900 text-base leading-snug">{item.name}</h4>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {item.type && (
              <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeColor(item.type)}`}>
                {item.type}
              </span>
            )}
            {item.pack_size && (
              <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                📦 {item.pack_size}
              </span>
            )}
            {item.company && (
              <span className="text-xs text-slate-400">{item.company}</span>
            )}
          </div>
        </div>
        <button onClick={() => onRemove(item.medicine_id)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors -mr-1 -mt-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* ── Batch selector ── */}
      {item.batches.length > 0 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <select
              value={item.selected_batch_id}
              onChange={e => handleBatchChange(e.target.value)}
              className={`w-full appearance-none pl-3 pr-8 py-2.5 text-sm font-medium border rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                batchStatus === 'expired' ? 'border-red-300 bg-red-50 text-red-700' :
                batchStatus === 'soon'    ? 'border-amber-300 bg-amber-50 text-amber-700' :
                'border-slate-200 text-slate-700'
              }`}
            >
              <option value="">🔄 Auto (FEFO — oldest first)</option>
              {item.batches.map(b => {
                const status = expiryStatus(b.expiry_date);
                const expLabel = new Date(b.expiry_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                const icon = status === 'expired' ? '⚠️' : status === 'soon' ? '🟡' : '🟢';
                return (
                  <option key={b.id} value={b.id}>
                    {icon} {b.batch_code || 'No Batch'} · Exp: {expLabel} · Qty: {b.quantity_remaining} packs
                    {b.selling_price ? ` · ₹${b.selling_price}/pack` : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          {batchStatus === 'expired' && (
            <p className="flex items-center gap-1 text-[11px] text-red-600 mt-1 font-medium">
              <AlertTriangle className="h-3 w-3" /> This batch is expired
            </p>
          )}
          {batchStatus === 'soon' && (
            <p className="flex items-center gap-1 text-[11px] text-amber-600 mt-1 font-medium">
              <AlertTriangle className="h-3 w-3" /> Expiring within 3 months
            </p>
          )}
        </div>
      )}

      {/* ── Unit mode selector ── */}
      {unitOptions.length > 1 && (
        <div className="px-4 pb-3">
          <div className="inline-flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {unitOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleUnitChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  unit === opt.value
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Price breakdown — always show per-unit price */}
          <div className="mt-1.5 text-[11px] text-slate-500 space-y-0.5">
            {packSellPrice > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {pack.hasBox && (
                  <span>🟦 1 Box = {pack.total} {uSingular}s
                    {' '}<span className="font-semibold text-slate-700">₹{packSellPrice.toFixed(2)}/box</span>
                  </span>
                )}
                {pack.n > 1 && (
                  <span>📋 1 Strip = {pack.m} {uSingular}s
                    {' '}<span className="font-semibold text-slate-700">₹{(packSellPrice / pack.n).toFixed(2)}/strip</span>
                  </span>
                )}
                {pack.total > 1 && !pack.isVolume && (
                  <span className="text-blue-600 font-semibold">
                    💊 ₹{(packSellPrice / pack.total).toFixed(2)} / {uSingular}
                  </span>
                )}
              </div>
            )}
            {/* MRP source label */}
            {batchForPrice ? (
              <span className="text-slate-400">
                {batchForPrice.selling_price
                  ? 'Price from batch selling rate'
                  : batchForPrice.mrp
                    ? 'Price from batch MRP'
                    : 'Price from medicine MRP'}
              </span>
            ) : item.mrp ? (
              <span className="text-slate-400">Price from medicine MRP</span>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Qty + Price + Total ── */}
      <div className="flex items-center gap-3 px-4 pb-4">
        {/* Stepper */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
          <button onClick={decrement} disabled={item.quantity <= 1}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-40 active:bg-slate-300 transition-colors">
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center justify-center w-14 h-10">
            <input
              type="number" min="1" max={maxQty} value={item.quantity} onChange={handleQtyInput}
              className="w-full text-center bg-transparent text-sm font-bold text-slate-900 border-none focus:ring-0 p-0 leading-none"
            />
            <span className="text-[9px] text-slate-400 font-semibold uppercase leading-none mt-0.5">
              {unit === 'box' ? 'Box' : unit === 'strip' ? 'Strip' : uSingular}
            </span>
          </div>
          <button onClick={increment} disabled={item.quantity >= maxQty}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-40 active:bg-slate-300 transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Price */}
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            ₹ / {unit === 'box' ? 'Box' : unit === 'strip' ? 'Strip' : uSingular}
          </label>
          <input
            type="number" min="0" step="0.01" value={item.price || ''} onChange={handlePriceInput}
            className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-slate-900 transition-colors"
            placeholder="0.00"
          />
        </div>

        {/* Total */}
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total</p>
          <p className="text-lg font-bold text-slate-900">₹{total.toFixed(2)}</p>
        </div>
      </div>

      {/* Stock available footer */}
      <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-slate-400">
        <span>
          Stock: {item.selected_batch_id
            ? `${item.batches.find(b => b.id === item.selected_batch_id)?.quantity_remaining ?? 0} packs in selected batch`
            : `${item.available_quantity} packs total`}
        </span>
        {pack.total > 1 && !pack.isVolume && (
          <span>· {item.available_quantity * pack.total} {uSingular}s available</span>
        )}
      </div>
    </div>
  );
}
