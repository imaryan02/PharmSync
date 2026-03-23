import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import { Order } from '../types';
import {
  ArrowLeft, Search, ShoppingBag, TrendingUp, Receipt,
  ChevronRight, Filter, X, Loader2,
} from 'lucide-react';

// ─── Date filter options ────────────────────────────────────────────────────
type DateFilter = 'today' | '7days' | '30days' | 'all';
type StatusFilter = 'all' | 'active' | 'refunded' | 'cancelled';

function startOf(filter: DateFilter): Date | null {
  const now = new Date();
  if (filter === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (filter === '7days') {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d;
  }
  if (filter === '30days') {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d;
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(isoStr: string) {
  const d = new Date(isoStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  refunded:  'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function Orders() {
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (activeStore) fetchOrders();
    else setLoading(false);
  }, [activeStore]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('clinic_id', activeStore?.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  };

  // ── Derived data ────────────────────────────────────────────────────────
  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter(o => new Date(o.created_at).toDateString() === today);
  }, [orders]);

  const todaySales = todayOrders.reduce((s, o) => s + o.total_amount, 0);
  const avgOrder = orders.length ? orders.reduce((s, o) => s + o.total_amount, 0) / orders.length : 0;

  const filtered = useMemo(() => {
    const cutoff = startOf(dateFilter);
    const q = search.toLowerCase().trim();
    return orders.filter(o => {
      if (cutoff && new Date(o.created_at) < cutoff) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (q) {
        const matchName = o.patient_name?.toLowerCase().includes(q);
        const matchId = o.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [orders, search, dateFilter, statusFilter]);

  // Group by date label
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filtered) {
      const label = fmtDate(o.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(o);
    }
    return [...map.entries()];
  }, [filtered]);

  const hasFilters = dateFilter !== 'all' || statusFilter !== 'all';

  // ── Guard ───────────────────────────────────────────────────────────────
  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-500 mb-6 text-sm">Select an active store from the dashboard.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">

      {/* ── Sticky header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 flex-1">Transactions</h1>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              hasFilters ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            <Filter className="h-4 w-4" />
            Filter
            {hasFilters && <span className="ml-0.5">•</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">

          {/* ── Summary cards — horizontal scroll ── */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {/* Today Sales */}
            <div className="shrink-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 w-44 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold opacity-80">Today's Sales</span>
              </div>
              <p className="text-2xl font-extrabold">₹{todaySales.toFixed(2)}</p>
              <p className="text-xs opacity-70 mt-1">{todayOrders.length} orders</p>
            </div>

            {/* Total Orders */}
            <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-4 w-44 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <Receipt className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Total Orders</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{orders.length}</p>
              <p className="text-xs text-slate-400 mt-1">All time</p>
            </div>

            {/* Avg Order */}
            <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-4 w-44 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Avg Order</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">₹{avgOrder.toFixed(0)}</p>
              <p className="text-xs text-slate-400 mt-1">Per transaction</p>
            </div>
          </div>

          {/* ── Search ── */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none h-5 w-5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer name or order ID…"
              className="block w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Filters panel ── */}
          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date Range</p>
                <div className="flex flex-wrap gap-2">
                  {(['today', '7days', '30days', 'all'] as DateFilter[]).map(d => (
                    <button key={d}
                      onClick={() => setDateFilter(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        dateFilter === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {d === 'today' ? 'Today' : d === '7days' ? 'Last 7 Days' : d === '30days' ? 'Last 30 Days' : 'All Time'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'refunded', 'cancelled'] as StatusFilter[]).map(s => (
                    <button key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize ${
                        statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {s === 'all' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button onClick={() => { setDateFilter('all'); setStatusFilter('all'); }}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* ── Transaction list ── */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
                <ShoppingBag className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No transactions found</h3>
              <p className="text-slate-500 text-sm">
                {search || hasFilters ? 'Try adjusting your search or filters.' : 'Create your first order to see it here.'}
              </p>
              {!search && !hasFilters && (
                <Link to="/orders/new"
                  className="inline-flex items-center mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700">
                  Create Order
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([dateLabel, dayOrders]) => (
                <div key={dateLabel}>
                  {/* Date divider */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dateLabel}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">
                      ₹{dayOrders.reduce((s, o) => s + o.total_amount, 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Cards for this day */}
                  <div className="space-y-2">
                    {dayOrders.map(order => (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:shadow-md active:scale-[0.99] transition-all gap-3 group"
                      >
                        {/* Status dot */}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          order.status === 'active' ? 'bg-emerald-500' :
                          order.status === 'refunded' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {order.patient_name || 'Walk-in Customer'}
                            </span>
                            {order.status !== 'active' && (
                              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize ${STATUS_STYLES[order.status]}`}>
                                {order.status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmtTime(order.created_at)}
                            {' · '}
                            <span className="font-mono text-[11px]">#{order.id.slice(0, 8).toUpperCase()}</span>
                          </p>
                        </div>

                        {/* Amount + chevron */}
                        <div className="text-right shrink-0">
                          <p className="text-base font-extrabold text-slate-900">₹{order.total_amount.toFixed(2)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* Results count */}
              <p className="text-center text-xs text-slate-400 pb-4">
                Showing {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
