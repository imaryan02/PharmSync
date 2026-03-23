import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import {
  Activity, Store as StoreIcon, Plus, Pill, Package,
  ShoppingCart, TrendingUp, AlertTriangle, RefreshCcw,
  List, ChevronRight, Receipt, Zap, BarChart3, CheckCircle2, IndianRupee
} from 'lucide-react';
import { Inventory, Order } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseDBDate(isoStr: string) {
  if (!isoStr) return new Date();
  return new Date(isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z');
}
function fmtTime(isoStr: string) {
  return parseDBDate(isoStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(isoStr: string) {
  const d = parseDBDate(isoStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, gradient, sub }: {
  title: string; value: string | number; icon: any; gradient: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient} shadow-sm`}>
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-xl"><Icon className="h-5 w-5" /></div>
        <BarChart3 className="h-4 w-4 opacity-30" />
      </div>
      <p className="text-3xl font-extrabold leading-none mb-1">{value}</p>
      <p className="text-sm font-semibold opacity-80">{title}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickAction({ title, to, icon: Icon, bg, fg, desc }: {
  title: string; to: string; icon: any; bg: string; fg: string; desc?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:shadow-md hover:border-slate-300 active:scale-[0.98] transition-all group"
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${bg} ${fg}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        {desc && <p className="text-xs text-slate-400 hidden lg:block">{desc}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile } = useAuth();
  const { activeStore, setActiveStore } = useStore();
  const [loading, setLoading] = useState(true);

  const [totalMedicines, setTotalMedicines] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<Inventory[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const checkStores = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('clinics').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
      if (!error && data) {
        if (!activeStore) { if (data.length > 0) setActiveStore(data[0]); }
        else {
          const stillExists = data.find(s => s.id === activeStore.id);
          if (!stillExists && data.length > 0) setActiveStore(data[0]);
          else if (!stillExists) setActiveStore(null);
        }
      }
      setLoading(false);
    };
    checkStores();
  }, [user]);

  useEffect(() => { if (activeStore) fetchDashboardData(); }, [activeStore]);

  const fetchDashboardData = async () => {
    if (!activeStore) return;
    const { count: medCount } = await supabase.from('medicines').select('*', { count: 'exact', head: true }).eq('owner_id', user?.id);
    setTotalMedicines(medCount || 0);

    const { data: invData } = await supabase.from('inventory').select('*, medicines(id,name,company)').eq('clinic_id', activeStore.id);
    if (invData) {
      setTotalStock(invData.reduce((a, i) => a + i.total_quantity, 0));
      setLowStockItems(invData.filter(i => i.total_quantity > 0 && i.total_quantity < 10) as Inventory[]);
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: todayOrd } = await supabase.from('orders').select('total_amount').eq('clinic_id', activeStore.id).gte('created_at', today.toISOString());
    if (todayOrd) {
      setOrdersToday(todayOrd.length);
      setRevenueToday(todayOrd.reduce((a, o) => a + o.total_amount, 0));
    }

    const { data: recent } = await supabase.from('orders').select('*').eq('clinic_id', activeStore.id).order('created_at', { ascending: false }).limit(8);
    if (recent) setRecentOrders(recent as Order[]);
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-6 shadow-lg shadow-blue-200">
            <StoreIcon className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Welcome to PharmSync!</h2>
          <p className="text-slate-500 mb-8 text-sm">Set up your first pharmacy store to start managing inventory and sales.</p>
          <Link to="/stores/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition-all active:scale-[0.97]">
            <Plus className="h-5 w-5" /> Create Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <div className="flex-1 overflow-y-auto pb-24 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">

          {/* ── Desktop Hero Header (visible on lg+) / Mobile Hero Banner ── */}
          {/* MOBILE: compact gradient banner */}
          <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-5 text-white shadow-lg shadow-blue-200 mb-5">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-sm font-medium opacity-75 mb-0.5">{greeting} 👋</p>
              <h1 className="text-xl font-extrabold leading-tight mb-3">{profile?.name || 'Doctor'}</h1>
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 w-fit">
                <Activity className="h-4 w-4 opacity-80" />
                <span className="text-sm font-semibold">{activeStore.name}</span>
              </div>
            </div>
          </div>

          {/* DESKTOP: side-by-side header + store badge */}
          <div className="hidden lg:flex items-start justify-between mb-8">
            <div>
              <p className="text-slate-500 font-medium mb-1">{greeting} 👋</p>
              <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">{profile?.name || 'Doctor'}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-slate-700">{activeStore.name}</span>
              </div>
            </div>
            <Link
              to="/orders/new"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-100 transition-all active:scale-[0.97]"
            >
              <ShoppingCart className="h-4 w-4" />
              New Order
            </Link>
          </div>

          {/* ── KPI Stats — 2 cols mobile, 4 cols desktop ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <StatCard title="Revenue Today" value={`₹${revenueToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" sub={`${ordersToday} order${ordersToday !== 1 ? 's' : ''}`} />
            <StatCard title="Orders Today" value={ordersToday} icon={ShoppingCart} gradient="bg-gradient-to-br from-amber-500 to-orange-500" sub="Today's billing" />
            <StatCard title="Total Stock" value={totalStock.toLocaleString('en-IN')} icon={Package} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" sub="Units in store" />
            <StatCard title="Medicines" value={totalMedicines} icon={Pill} gradient="bg-gradient-to-br from-purple-500 to-violet-600" sub="In catalogue" />
          </div>

          {/* ── Two-column layout on desktop ── */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── LEFT COLUMN (main content) ── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Low Stock Alert */}
              {lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-red-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <span className="text-sm font-bold text-red-700">Low Stock Alert</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-700 text-xs font-bold">{lowStockItems.length}</span>
                    </div>
                    <Link to="/inventory" className="text-xs font-bold text-red-600 hover:text-red-700">View All →</Link>
                  </div>
                  <div className="divide-y divide-red-100">
                    {lowStockItems.slice(0, 4).map(item => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.medicines?.name}</p>
                          <p className="text-xs text-slate-400 truncate">{item.medicines?.company || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-3">
                          <span className="text-sm font-extrabold text-red-600">{item.total_quantity}</span>
                          <span className="text-xs text-slate-400">left</span>
                          <Link to="/stock-entry" className="p-1.5 bg-blue-600 text-white rounded-lg ml-1 hover:bg-blue-700">
                            <Plus className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                    {lowStockItems.length > 4 && (
                      <div className="px-4 py-2.5 text-center">
                        <Link to="/inventory" className="text-xs font-bold text-red-600">+{lowStockItems.length - 4} more items need restocking</Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All-good state */}
              {lowStockItems.length === 0 && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-700">All stock levels are healthy — no alerts right now.</p>
                </div>
              )}

              {/* Recent Orders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-500" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Recent Orders</h2>
                  </div>
                  <Link to="/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700">See All →</Link>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
                      <ShoppingCart className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">No orders yet</p>
                    <p className="text-xs text-slate-400 mb-4">Create your first billing order to see it here.</p>
                    <Link to="/orders/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
                      <Plus className="h-4 w-4" /> New Order
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map(order => {
                      const dot = order.status === 'active' ? 'bg-emerald-500' : order.status === 'refunded' ? 'bg-amber-500' : 'bg-red-500';
                      const badge = order.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : order.status === 'refunded' ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-red-50 text-red-700 border border-red-100';
                      return (
                        <Link key={order.id} to={`/orders/${order.id}`}
                          className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:shadow-md active:scale-[0.99] transition-all gap-3 group">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {order.patient_name || <span className="text-slate-400 font-medium">Walk-in Patient</span>}
                            </p>
                            <p className="text-xs text-slate-400">{fmtDate(order.created_at)} · {fmtTime(order.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-base font-extrabold text-slate-900">₹{order.total_amount.toFixed(0)}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize hidden sm:inline ${badge}`}>{order.status}</span>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN (sidebar on desktop, below on mobile) ── */}
            <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-5">

              {/* Quick Actions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Quick Actions</h2>
                </div>
                <div className="space-y-2">
                  <QuickAction title="New Order / Billing" desc="Create a new sales order" to="/orders/new" icon={ShoppingCart} bg="bg-amber-50" fg="text-amber-600" />
                  <QuickAction title="Add Stock / Batch" desc="Record new inventory batch" to="/stock-entry" icon={Plus} bg="bg-emerald-50" fg="text-emerald-600" />
                  <QuickAction title="Inventory" desc="View & manage stock levels" to="/inventory" icon={Package} bg="bg-blue-50" fg="text-blue-600" />
                  <QuickAction title="Medicines" desc="Browse your catalogue" to="/medicines" icon={Pill} bg="bg-purple-50" fg="text-purple-600" />
                  <QuickAction title="Stock Adjust" desc="Correct inventory discrepancies" to="/stock-adjustments" icon={RefreshCcw} bg="bg-rose-50" fg="text-rose-600" />
                  <QuickAction title="Audit Logs" desc="Track all changes" to="/audit-logs" icon={List} bg="bg-slate-100" fg="text-slate-600" />
                </div>
              </div>

              {/* Desktop: store info card */}
              <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active Store</p>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <StoreIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{activeStore.name}</p>
                    {activeStore.address && <p className="text-xs text-slate-400 truncate">{activeStore.address}</p>}
                  </div>
                </div>
                <Link to="/stores" className="mt-3 block text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-2 border border-blue-100 bg-blue-50 rounded-xl transition-colors">
                  Manage Stores →
                </Link>
              </div>

              {/* Desktop: Revenue summary */}
              <div className="hidden lg:block bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <IndianRupee className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Today's Summary</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Revenue</span>
                    <span className="text-lg font-extrabold text-emerald-400">₹{revenueToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Orders</span>
                    <span className="text-lg font-extrabold text-white">{ordersToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Avg. Order</span>
                    <span className="text-lg font-extrabold text-white">
                      ₹{ordersToday > 0 ? (revenueToday / ordersToday).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
                    </span>
                  </div>
                  {lowStockItems.length > 0 && (
                    <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                      <span className="text-sm text-slate-400">Low Stock</span>
                      <span className="text-sm font-bold text-red-400">{lowStockItems.length} items</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
