import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, IndianRupee, Pill, RefreshCcw,
  BarChart2, ShoppingBag, Minus, AlertTriangle, XCircle, Clock, Package,
  ArrowRight
} from 'lucide-react';
import {
  fetchPeriodSummary, fetchSalesTrend, fetchTopMedicines,
  fetchInventoryInsights, generateAlerts,
  pctChange, comparisonLabel,
  DateRange, PeriodSummary, TrendPoint, TopMedicine,
  InventoryInsights, Alert
} from '../lib/analyticsApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtINR(val: number) {
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function shortDate(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  if (days <= 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

// ─── % Change badge ───────────────────────────────────────────────────────────
function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[10px] text-slate-400 font-medium">No data</span>;
  const up = pct >= 0;
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-lg ${
      pct === 0 ? 'bg-slate-100 text-slate-500' : up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
    }`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, gradient, pct, cmpLabel, loading }: {
  label: string; value: string; icon: any; gradient: string;
  pct: number | null; cmpLabel: string; loading: boolean;
}) {
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl p-5 bg-slate-100 shadow-sm min-w-[170px] flex-1">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient} shadow-md shadow-black/10 min-w-[170px] flex-1 shrink-0`}>
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="p-2 bg-white/20 rounded-xl w-fit mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold leading-none mb-1.5 tracking-tight">{value}</p>
      <p className="text-xs font-semibold opacity-75 mb-2">{label}</p>
      <div className="flex items-center gap-1.5">
        <DeltaBadge pct={pct} />
        <span className="text-[10px] opacity-60">{cmpLabel}</span>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-extrabold text-slate-900">{fmtINR(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

// ─── Range Tabs ──────────────────────────────────────────────────────────────
function RangeTabs({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const opts: { val: DateRange; label: string }[] = [
    { val: 'today', label: 'Today' },
    { val: '7', label: '7 Days' },
    { val: '30', label: '30 Days' },
  ];
  return (
    <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
      {opts.map(o => (
        <button
          key={o.val}
          onClick={() => onChange(o.val)}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            value === o.val ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type ChartMetric = 'sales' | 'profit';
type MedMetric = 'revenue' | 'profit' | 'units';

const EMPTY_SUMMARY: PeriodSummary = { period_sales: 0, period_profit: 0, period_orders: 0, prev_sales: 0, prev_profit: 0, prev_orders: 0 };
const EMPTY_INV: InventoryInsights = { low_stock_count: 0, out_of_stock_count: 0, expiring_soon_count: 0, inventory_value: 0, top_issues: [] };
const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];

export default function Analytics() {
  const { activeStore } = useStore();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>('7');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('sales');
  const [medMetric, setMedMetric] = useState<MedMetric>('revenue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [summary, setSummary] = useState<PeriodSummary>(EMPTY_SUMMARY);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topMeds, setTopMeds] = useState<TopMedicine[]>([]);
  const [inv, setInv] = useState<InventoryInsights>(EMPTY_INV);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const loadAll = useCallback(async (quiet = false) => {
    if (!activeStore) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const [s, t, m, i] = await Promise.all([
        fetchPeriodSummary(activeStore.id, range),
        fetchSalesTrend(activeStore.id, range),
        fetchTopMedicines(activeStore.id, range),
        fetchInventoryInsights(activeStore.id),
      ]);
      setSummary(s);
      setTrend(t);
      setTopMeds(m);
      setInv(i);
      setAlerts(generateAlerts(s, i));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStore, range]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const cmpLabel = comparisonLabel(range);
  const trendDays = range === 'today' ? 7 : parseInt(range);

  // Sort top meds based on the selected toggle
  const sortedMeds = useMemo(() => {
    return [...topMeds].sort((a, b) => {
      if (medMetric === 'revenue') return b.revenue - a.revenue;
      if (medMetric === 'profit') return b.profit - a.profit;
      return b.total_sold - a.total_sold;
    });
  }, [topMeds, medMetric]);

  const maxMedValue = useMemo(() => {
    if (sortedMeds.length === 0) return 1;
    if (medMetric === 'revenue') return sortedMeds[0].revenue || 1;
    if (medMetric === 'profit') return sortedMeds[0].profit || 1;
    return sortedMeds[0].total_sold || 1;
  }, [sortedMeds, medMetric]);

  if (!activeStore) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center">
          <BarChart2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Store Selected</h2>
          <p className="text-slate-500 text-sm">Select or create a store to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <div className="flex-1 overflow-y-auto pb-28 sm:pb-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8 space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
              <p className="text-sm text-slate-500 mt-0.5">{activeStore.name}</p>
            </div>
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md text-slate-500 hover:text-blue-600 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* ── ALERTS SECTION ── */}
          {!loading && alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Action Required</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {alerts.map(alert => {
                  const isError = alert.type === 'out_of_stock' || alert.type === 'sale_drop';
                  const Icon = alert.type === 'out_of_stock' ? XCircle : alert.type === 'expiring' ? Clock : alert.type === 'sale_drop' ? TrendingDown : AlertTriangle;
                  return (
                    <button
                      key={alert.id}
                      onClick={() => navigate(alert.path)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-95 hover:shadow-sm ${
                        isError ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
                      }`}
                    >
                      <div className={`p-1.5 rounded-full shrink-0 ${isError ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className={`flex-1 text-sm font-semibold ${isError ? 'text-red-900' : 'text-orange-900'}`}>
                        {alert.message}
                      </p>
                      <ArrowRight className={`h-4 w-4 shrink-0 opacity-50 ${isError ? 'text-red-700' : 'text-orange-700'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Global Date Range Tabs ── */}
          <RangeTabs value={range} onChange={(r) => { setRange(r); }} />

          {/* ── KPI Cards ── */}
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-0 sm:px-0 snap-x sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 hide-scrollbar">
            <KpiCard
              label={range === 'today' ? "Today's Sales" : `${range}-Day Sales`}
              value={fmtINR(summary.period_sales)}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              pct={pctChange(summary.period_sales, summary.prev_sales)}
              cmpLabel={cmpLabel}
              loading={loading}
            />
            <KpiCard
              label={range === 'today' ? "Today's Profit" : `${range}-Day Profit`}
              value={fmtINR(summary.period_profit)}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
              pct={pctChange(summary.period_profit, summary.prev_profit)}
              cmpLabel={cmpLabel}
              loading={loading}
            />
            <KpiCard
              label="Orders"
              value={String(summary.period_orders)}
              icon={ShoppingBag}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              pct={pctChange(summary.period_orders, summary.prev_orders)}
              cmpLabel={cmpLabel}
              loading={loading}
            />
          </div>

          {/* ── Sales/Profit Trend Chart ── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Trend
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {range === 'today' ? 'Last 7 days' : `Last ${range} days`}
                </p>
              </div>
              <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5 shrink-0">
                {(['sales', 'profit'] as ChartMetric[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      chartMetric === m ? 'bg-white text-blue-600 shadow-sm shadow-black/5' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 pb-5">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : trend.every(p => p.total_sales === 0 && p.profit === 0) ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No sales in this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => shortDate(v, trendDays)}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      interval={trendDays <= 7 ? 0 : Math.floor(trendDays / 7) - 1}
                    />
                    <YAxis
                      tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false} width={52}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey={chartMetric === 'sales' ? 'total_sales' : 'profit'}
                      stroke={chartMetric === 'sales' ? '#3b82f6' : '#8b5cf6'}
                      strokeWidth={2.5}
                      dot={trendDays <= 7 ? { r: 4, fill: chartMetric === 'sales' ? '#3b82f6' : '#8b5cf6', strokeWidth: 0 } : false as any}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── INVENTORY ANALYTICS ── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" />
                Inventory Intelligence
              </h2>
            </div>
            <div className="px-4 pb-5 space-y-5">
              {loading ? (
                <>
                  <div className="flex gap-2"><Skeleton className="h-16 flex-1" /><Skeleton className="h-16 flex-1" /></div>
                  <Skeleton className="h-20 w-full" />
                </>
              ) : (
                <>
                  {/* Min-Cards */}
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-0 sm:px-0 hide-scrollbar snap-x">
                    <div className="flex-1 min-w-[120px] shrink-0 bg-red-50 rounded-2xl p-3 border border-red-100 snap-center">
                      <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Out of Stock</p>
                      <p className="text-xl font-extrabold text-red-900">{inv.out_of_stock_count}</p>
                    </div>
                    <div className="flex-1 min-w-[120px] shrink-0 bg-orange-50 rounded-2xl p-3 border border-orange-100 snap-center">
                      <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Low Stock</p>
                      <p className="text-xl font-extrabold text-orange-900">{inv.low_stock_count}</p>
                    </div>
                    <div className="flex-1 min-w-[120px] shrink-0 bg-amber-50 rounded-2xl p-3 border border-amber-100 snap-center">
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Expiring (&lt;30d)</p>
                      <p className="text-xl font-extrabold text-amber-900">{inv.expiring_soon_count}</p>
                    </div>
                    <div className="flex-1 min-w-[140px] shrink-0 bg-emerald-50 rounded-2xl p-3 border border-emerald-100 snap-center">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Est. Value</p>
                      <p className="text-xl font-extrabold text-emerald-900">{fmtINR(inv.inventory_value)}</p>
                    </div>
                  </div>

                  {/* Top Issues List */}
                  {inv.top_issues.length > 0 && (
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-1">
                      {inv.top_issues.map((issue, idx) => {
                        const isOos = issue.type === 'out_of_stock';
                        const isExp = issue.type === 'expiring';
                        return (
                          <div key={idx} className="flex items-center gap-3 p-2 border-b border-slate-100 last:border-0 bg-white first:rounded-t-lg last:rounded-b-lg">
                            {isOos ? <XCircle className="h-4 w-4 text-red-500 shrink-0" /> : isExp ? <Clock className="h-4 w-4 text-amber-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{issue.medicineName}</p>
                              <p className="text-[10px] text-slate-500">{issue.detail}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Top Selling Medicines ── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-violet-500" />
                  Top Medicines
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Over {range === 'today' ? 'Today' : `Last ${range} days`}
                </p>
              </div>
              
              {/* Med Metric toggle */}
              <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5 self-start">
                {(['revenue', 'profit', 'units'] as MedMetric[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMedMetric(m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      medMetric === m ? 'bg-white text-blue-600 shadow-sm shadow-black/5' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 pb-5">
              {loading ? (
                <div className="space-y-4 pt-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : sortedMeds.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                  <Pill className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No sales in this period</p>
                </div>
              ) : (
                <>
                  {/* Column headers (Desktop) */}
                  <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-1 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicine</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-right ${medMetric === 'units' ? 'text-blue-600' : 'text-slate-400'}`}>Units</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-right ${medMetric === 'revenue' ? 'text-blue-600' : 'text-slate-400'}`}>Revenue</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-right ${medMetric === 'profit' ? 'text-blue-600' : 'text-slate-400'}`}>Profit</span>
                  </div>

                  <div className="space-y-4 pt-3 sm:pt-2">
                    {sortedMeds.slice(0, 5).map((med, idx) => {
                      const val = medMetric === 'revenue' ? med.revenue : medMetric === 'profit' ? med.profit : med.total_sold;
                      const pct = Math.max(0, Math.min(100, Math.round((val / maxMedValue) * 100)));
                      
                      return (
                        <div key={med.name}>
                          {/* Mobile view */}
                          <div className="sm:hidden">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: BAR_COLORS[idx] }}
                                >
                                  {idx + 1}
                                </span>
                                <p className="text-sm font-semibold text-slate-800 truncate">{med.name}</p>
                              </div>
                              <div className="shrink-0 ml-2 text-right">
                                <p className="text-sm font-bold text-slate-900">
                                  {medMetric === 'units' ? `${med.total_sold} units` : fmtINR(val)}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {medMetric === 'units' ? fmtINR(med.revenue) : `${med.total_sold} units`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[idx] }}
                                />
                              </div>
                              <span className={`text-[10px] font-bold shrink-0 ${med.profit >= 0 ? 'text-emerald-600' : 'text-red-500'} ${medMetric === 'profit' ? 'hidden' : ''}`}>
                                {fmtINR(med.profit)}
                              </span>
                            </div>
                          </div>

                          {/* Desktop table row */}
                          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-1 py-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: BAR_COLORS[idx] }}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0 w-full">
                                <p className="text-sm font-semibold text-slate-800 truncate">{med.name}</p>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 w-full max-w-[200px]">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[idx] }} />
                                </div>
                              </div>
                            </div>
                            <span className={`text-sm text-right font-medium ${medMetric === 'units' ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>{med.total_sold}</span>
                            <span className={`text-sm text-right ${medMetric === 'revenue' ? 'text-blue-600 font-bold' : 'text-slate-900 font-bold'}`}>{fmtINR(med.revenue)}</span>
                            <span className={`text-sm font-bold text-right ${med.profit >= 0 ? 'text-emerald-600' : 'text-red-500'} ${medMetric === 'profit' ? 'text-blue-600' : ''}`}>
                              {fmtINR(med.profit)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
        </div>
      </div>
    </div>
  );
}
