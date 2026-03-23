import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import { Order, OrderItem, Medicine } from '../types';
import {
  ArrowLeft, RefreshCcw, AlertCircle, Calendar, Clock,
  Receipt, User, Tag, Loader2, Printer,
} from 'lucide-react';

interface OrderItemWithMedicine extends OrderItem {
  medicines: Medicine;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:    { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  refunded:  { label: 'Refunded',  cls: 'bg-amber-100 text-amberald-700 border-amber-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200' },
};

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeStore && id) fetchOrderDetails();
    else setLoading(false);
  }, [activeStore, id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('clinic_id', activeStore?.id)
        .single();
      if (orderErr) throw orderErr;
      setOrder(orderData as Order);

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select(`*, medicines(id, name, company, composition, type, pack_size)`)
        .eq('order_id', id);
      if (itemsErr) throw itemsErr;
      setItems(itemsData as OrderItemWithMedicine[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // ── Guard states ─────────────────────────────────────────────────────────
  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <button onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
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

  if (error || !order) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'This order does not exist.'}</p>
          <button onClick={() => navigate('/orders')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
            Back to Transactions
          </button>
        </div>
      </div>
    );
  }

  const parseDBDate = (isoStr: string) => {
    if (!isoStr) return new Date();
    return new Date(isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z');
  };

  const orderDate = parseDBDate(order.created_at);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
  const orderAmt = Number(order.final_amount) || Number(order.total_amount) || 0;
  const discountAmt = subtotal - orderAmt;
  const hasDiscount = discountAmt > 0.005;
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.active;

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/orders')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-slate-900 flex-1">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${status.cls}`}>
            {status.label}
          </span>
          {order.status === 'active' && (
            <Link to={`/orders/${order.id}/refund`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <RefreshCcw className="h-3.5 w-3.5" /> Refund
            </Link>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">

          {/* ── Customer + date card ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {/* Customer */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {order.patient_name || 'Walk-in Customer'}
                </p>
              </div>
            </div>
            {/* Date */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                <Calendar className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}
                  {orderDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
            {/* Order ID */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                <Tag className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order ID</p>
                <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5">{order.id}</p>
              </div>
            </div>
          </div>

          {/* ── Items ── */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
              Items ({items.length})
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No items found.</p>
              ) : (
                items.map(item => {
                  const lineTotal = item.quantity * item.selling_price;
                  const med = item.medicines;
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{med.name}</p>
                        {med.company && (
                          <p className="text-xs text-slate-400 truncate">{med.company}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {med.type && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{med.type}</span>
                          )}
                          {med.pack_size && (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{med.pack_size}</span>
                          )}
                          <span className="text-xs text-slate-500">
                            {item.quantity} × ₹{item.selling_price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-slate-900">₹{lineTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Bill summary ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bill Summary</p>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="font-semibold text-green-600">−₹{discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center">
                <span className="font-bold text-slate-900 text-base">Total Paid</span>
                <span className="text-xl font-extrabold text-blue-600">₹{orderAmt.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Sticky action footer ── */}
      {order.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              <Printer className="h-4 w-4" />
              Print Bill
            </button>
            <Link
              to={`/orders/${order.id}/refund`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors">
              <RefreshCcw className="h-4 w-4" />
              Refund
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
