import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { Inventory } from '../types';
import MedicineSearch, { MedicineSearchHandle } from '../components/MedicineSearch';
import CartItem, {
  CartItemType, BatchOption, UnitMode,
  parsePackStructure, packsConsumed, pricePerUnit,
} from '../components/CartItem';
import {
  ArrowLeft, AlertCircle, ShoppingCart, CheckCircle2,
  User, Phone, ChevronDown, Loader2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

type DiscountOption = '0' | '5' | '10' | '15' | 'custom';

interface BillingState {
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  finalTotal: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CreateOrder() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const searchRef = useRef<MedicineSearchHandle>(null);

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItemType[]>([]);

  // Discount
  const [discountOption, setDiscountOption] = useState<DiscountOption>('0');
  const [customDiscount, setCustomDiscount] = useState('');

  // ── Fetch inventory (with type + pack_size) ───────────────────────────
  useEffect(() => {
    if (user && activeStore) fetchInventory();
    else setLoading(false);
  }, [user, activeStore]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select(`*, medicines(id, name, company, mrp, composition, type, pack_size)`)
      .eq('clinic_id', activeStore?.id)
      .gt('total_quantity', 0);
    if (!error && data) setInventory(data as Inventory[]);
    setLoading(false);
  };

  // ── Add to cart — fetch batches immediately ───────────────────────────
  const handleAddToCart = useCallback(async (item: Inventory) => {
    const med = item.medicines!;
    const pack = parsePackStructure(med.pack_size ?? null);

    // Check if already in cart
    const alreadyInCart = cart.some(c => c.medicine_id === item.medicine_id);
    if (alreadyInCart) {
      setCart(prev => prev.map(c => {
        if (c.medicine_id !== item.medicine_id) return c;
        const avail = c.selected_batch_id
          ? (c.batches.find(b => b.id === c.selected_batch_id)?.quantity_remaining ?? c.available_quantity)
          : c.available_quantity;
        const max = avail * pack.total;
        return c.quantity < max ? { ...c, quantity: c.quantity + 1 } : c;
      }));
      return;
    }

    // Fetch batches for this medicine in the active store
    const { data: batchData, error: batchErr } = await supabase
      .from('batches')
      .select('id, batch_code, expiry_date, quantity_remaining, selling_price, mrp')
      .eq('clinic_id', activeStore!.id)
      .eq('medicine_id', item.medicine_id)
      .gt('quantity_remaining', 0)
      .order('expiry_date', { ascending: true });

    if (batchErr) {
      showError('Failed to fetch batch details.');
      return;
    }

    const batches: BatchOption[] = (batchData ?? []) as BatchOption[];
    const firstBatch = batches[0];
    // Prefer selling_price from batch, fall back to mrp
    const packPrice = firstBatch?.selling_price ?? firstBatch?.mrp ?? med.mrp ?? 0;
    const initialUnit: UnitMode = 'strip'; // default — safest starting unit
    const initialPrice = parseFloat(pricePerUnit(initialUnit, packPrice, pack).toFixed(2));

    setCart(prev => [...prev, {
      inventory_id: item.id,
      medicine_id: item.medicine_id,
      name: med.name,
      company: med.company ?? null,
      type: med.type ?? null,
      pack_size: med.pack_size ?? null,
      mrp: med.mrp ?? null,
      pack,
      available_quantity: item.total_quantity,
      batches,
      selected_batch_id: '',   // '' = auto FEFO
      quantity: 1,
      unit: initialUnit,
      price: initialPrice,
    }]);
  }, [cart, activeStore]);

  // ── Cart update handlers ──────────────────────────────────────────────
  const handleUpdateQuantity = useCallback((id: string, qty: number) =>
    setCart(prev => prev.map(c => c.medicine_id === id ? { ...c, quantity: qty } : c)), []);

  const handleUpdatePrice = useCallback((id: string, price: number) =>
    setCart(prev => prev.map(c => c.medicine_id === id ? { ...c, price } : c)), []);

  const handleUpdateUnit = useCallback((id: string, unit: UnitMode, newPrice: number, newQty?: number) =>
    setCart(prev => prev.map(c =>
      c.medicine_id === id ? { ...c, unit, price: newPrice, ...(newQty !== undefined ? { quantity: newQty } : {}) } : c
    )), []);

  const handleUpdateBatch = useCallback((id: string, batchId: string, newPrice: number) =>
    setCart(prev => prev.map(c =>
      c.medicine_id === id ? { ...c, selected_batch_id: batchId, price: newPrice } : c
    )), []);

  const handleRemove = useCallback((id: string) =>
    setCart(prev => prev.filter(c => c.medicine_id !== id)), []);

  // ── Billing calculations ──────────────────────────────────────────────
  const billing = useMemo<BillingState>(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
    let discountPct = 0;
    if (discountOption === 'custom') {
      const p = parseFloat(customDiscount);
      discountPct = isNaN(p) ? 0 : Math.min(p, 100);
    } else {
      discountPct = parseFloat(discountOption);
    }
    const discountAmount = subtotal * (discountPct / 100);
    return { subtotal, discountPct, discountAmount, finalTotal: subtotal - discountAmount };
  }, [cart, discountOption, customDiscount]);

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeStore || !user) return;
    
    // 1. Cart Empty
    if (cart.length === 0) {
      showError("Your cart is empty. Please add items before submitting.");
      return;
    }

    // 2. Customer Phone Validation
    if (customerPhone.trim() && !/^\d{10}$/.test(customerPhone.trim())) {
      showError("Please enter a valid 10-digit mobile number.");
      return;
    }

    // 3. Discount Validation
    if (billing.discountAmount > billing.subtotal) {
      showError("Discount cannot exceed the subtotal amount.");
      return;
    }
    if (billing.finalTotal < 0) {
      showError("Final total cannot be negative.");
      return;
    }

    // 4. Cart Items Validation
    for (const item of cart) {
      if (!item.quantity || item.quantity <= 0 || isNaN(item.quantity)) {
        showError(`Please enter a valid quantity for "${item.name}".`);
        return;
      }
      if (item.price === undefined || item.price < 0 || isNaN(item.price)) {
        showError(`Please enter a valid price for "${item.name}".`);
        return;
      }

      const availPacks = item.selected_batch_id
        ? (item.batches.find(b => b.id === item.selected_batch_id)?.quantity_remaining ?? item.available_quantity)
        : item.available_quantity;
      const needed = packsConsumed(item.unit, item.quantity, item.pack);
      if (needed > availPacks) {
        showError(`Not enough stock for "${item.name}". Only ${availPacks} packs available.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Create order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          clinic_id: activeStore.id,
          total_amount: billing.finalTotal,
          status: 'active',
          patient_name: customerName.trim() || null,
        }])
        .select()
        .single();
      if (orderErr) throw orderErr;

      // 2. Process each cart item
      for (const item of cart) {
        const packConsume = packsConsumed(item.unit, item.quantity, item.pack);

        // Billing qty in individual units; price per individual unit
        const billingQty = item.unit === 'box'
          ? item.quantity * item.pack.total
          : item.unit === 'strip'
            ? item.quantity * item.pack.m
            : item.quantity;
        const billingPrice = parseFloat(
          (item.unit === 'box'
            ? item.price / item.pack.total
            : item.unit === 'strip'
              ? item.price / item.pack.m
              : item.price
          ).toFixed(4)
        );

        const { data: orderItem, error: itemErr } = await supabase
          .from('order_items')
          .insert([{
            order_id: orderData.id,
            medicine_id: item.medicine_id,
            quantity: billingQty,
            selling_price: billingPrice,
          }])
          .select()
          .single();
        if (itemErr) throw itemErr;

        // 3. Batch allocation — preferred batch first, then FEFO
        let remaining = packConsume;
        const orderedBatches = item.selected_batch_id
          ? [
              ...item.batches.filter(b => b.id === item.selected_batch_id),
              ...item.batches.filter(b => b.id !== item.selected_batch_id),
            ]
          : item.batches; // already FEFO sorted

        for (const batch of orderedBatches) {
          if (remaining <= 0) break;
          const allocate = Math.min(batch.quantity_remaining, remaining);

          const { error: obErr } = await supabase
            .from('order_batches')
            .insert([{ order_item_id: orderItem.id, batch_id: batch.id, quantity: allocate }]);
          if (obErr) throw obErr;

          const { error: batchUpErr } = await supabase
            .from('batches')
            .update({ quantity_remaining: batch.quantity_remaining - allocate })
            .eq('id', batch.id);
          if (batchUpErr) throw batchUpErr;

          remaining -= allocate;
        }

        if (remaining > 0) throw new Error(`Stock shortage for "${item.name}"`);

        // 4. Update inventory total
        const { error: invErr } = await supabase
          .from('inventory')
          .update({ total_quantity: item.available_quantity - packConsume })
          .eq('id', item.inventory_id);
        if (invErr) throw invErr;
      }

      showSuccess('Order completed successfully!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscountOption('0');
      setCustomDiscount('');
      fetchInventory();
      navigate('/orders');
    } catch (err: any) {
      console.error('Order error:', err);
      showError(err.message || 'Failed to complete order.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guard screens ─────────────────────────────────────────────────────
  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-500 mb-6 text-sm">Select an active store from the dashboard first.</p>
          <button onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-dashed border-slate-200 p-8 text-center">
          <ShoppingCart className="h-12 w-12 text-blue-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Stock Available</h2>
          <p className="text-slate-500 mb-6 text-sm">Add stock to your inventory before billing.</p>
          <Link to="/stock-entry"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
            Add Stock
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main UI ────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 flex-1">New Order</h1>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            {activeStore.name}
          </span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">

          {/* ── Customer ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-400" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Mobile number"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-400" />
              </div>
            </div>
          </div>

          {/* ── Medicine search ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Add Medicine</h2>
            <MedicineSearch ref={searchRef} inventory={inventory} onAdd={handleAddToCart} />
          </div>

          {/* ── Cart ── */}
          {cart.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
                <ShoppingCart className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Search and add medicines above to begin billing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <CartItem
                  key={item.medicine_id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdatePrice={handleUpdatePrice}
                  onUpdateUnit={handleUpdateUnit}
                  onUpdateBatch={handleUpdateBatch}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {/* ── Bill summary ── */}
          {cart.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bill Summary</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Subtotal</span>
                  <span className="text-sm font-semibold text-slate-900">₹{billing.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600 shrink-0">Discount</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={discountOption}
                        onChange={e => { setDiscountOption(e.target.value as DiscountOption); setCustomDiscount(''); }}
                        className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:ring-blue-500 focus:border-blue-500">
                        <option value="0">No Discount</option>
                        <option value="5">5%</option>
                        <option value="10">10%</option>
                        <option value="15">15%</option>
                        <option value="custom">Custom</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    {discountOption === 'custom' && (
                      <div className="relative w-24">
                        <input type="number" min="0" max="100" value={customDiscount}
                          onChange={e => setCustomDiscount(e.target.value)}
                          placeholder="0" autoFocus
                          className="block w-full pl-3 pr-6 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-blue-500 focus:border-blue-500" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                      </div>
                    )}
                  </div>
                </div>

                {billing.discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Discount ({billing.discountPct}%)</span>
                    <span className="text-sm font-semibold text-green-600">−₹{billing.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">Final Total</span>
                  <span className="text-xl font-extrabold text-blue-600">₹{billing.finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky footer ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-extrabold text-slate-900">₹{billing.finalTotal.toFixed(2)}</span>
              {billing.discountAmount > 0 && (
                <span className="text-[11px] text-green-600 font-medium">
                  Saved ₹{billing.discountAmount.toFixed(2)}
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md">
              {submitting
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
                : <><CheckCircle2 className="h-5 w-5" /> Complete Order</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
