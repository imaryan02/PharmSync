import { supabase } from './supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DateRange = 'today' | '7' | '30';

export interface PeriodSummary {
  period_sales: number;
  period_profit: number;
  period_orders: number;
  prev_sales: number;
  prev_profit: number;
  prev_orders: number;
}

export interface TrendPoint {
  date: string;
  total_sales: number;
  profit: number;
}

export interface TopMedicine {
  name: string;
  total_sold: number;
  revenue: number;
  profit: number;
}

export interface InventoryIssue {
  type: 'out_of_stock' | 'low_stock' | 'expiring';
  medicineName: string;
  detail: string;
}

export interface InventoryInsights {
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  inventory_value: number;
  top_issues: InventoryIssue[];
}

export interface Alert {
  id: string;
  type: 'sale_drop' | 'out_of_stock' | 'expiring' | 'low_stock';
  message: string;
  path: string;
  priority: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

export function comparisonLabel(range: DateRange): string {
  if (range === 'today') return 'vs yesterday';
  if (range === '7') return 'vs prev 7d';
  return 'vs prev 30d';
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
}

function orderAmount(o: any): number {
  return Number(o.final_amount) || Number(o.total_amount) || 0;
}

interface PeriodDates {
  currStart: Date; currEnd: Date;
  prevStart: Date; prevEnd: Date;
  days: number;
}

function getPeriodDates(range: DateRange): PeriodDates {
  const now = new Date();
  if (range === 'today') {
    const currStart = new Date(now); currStart.setHours(0, 0, 0, 0);
    const prevEnd = new Date(currStart);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 1);
    return { currStart, currEnd: now, prevStart, prevEnd, days: 1 };
  }
  const days = parseInt(range);
  const currStart = new Date(now); currStart.setDate(currStart.getDate() - days); currStart.setHours(0, 0, 0, 0);
  const prevEnd = new Date(currStart);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days);
  return { currStart, currEnd: now, prevStart, prevEnd, days };
}

async function fetchOrdersInWindow(clinicId: string, start: Date, end: Date) {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());
  return data ?? [];
}

async function computeProfitForOrders(orderIds: string[]): Promise<number> {
  if (orderIds.length === 0) return 0;
  const { data: items } = await supabase
    .from('order_items')
    .select('selling_price, order_batches(purchase_price_at_sale, quantity)')
    .in('order_id', orderIds);
  let profit = 0;
  for (const item of items ?? []) {
    for (const b of (item.order_batches as any[]) ?? []) {
      profit += (Number(item.selling_price) - Number(b.purchase_price_at_sale)) * Number(b.quantity);
    }
  }
  return profit;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchPeriodSummary(clinicId: string, range: DateRange): Promise<PeriodSummary> {
  const { currStart, currEnd, prevStart, prevEnd } = getPeriodDates(range);
  const [currOrders, prevOrders] = await Promise.all([
    fetchOrdersInWindow(clinicId, currStart, currEnd),
    fetchOrdersInWindow(clinicId, prevStart, prevEnd),
  ]);

  const period_sales = currOrders.reduce((s, o) => s + orderAmount(o), 0);
  const prev_sales = prevOrders.reduce((s, o) => s + orderAmount(o), 0);

  const [period_profit, prev_profit] = await Promise.all([
    computeProfitForOrders(currOrders.map(o => o.id)),
    computeProfitForOrders(prevOrders.map(o => o.id)),
  ]);

  return {
    period_sales, period_profit, period_orders: currOrders.length,
    prev_sales, prev_profit, prev_orders: prevOrders.length,
  };
}

export async function fetchSalesTrend(clinicId: string, range: DateRange): Promise<TrendPoint[]> {
  const { currStart, currEnd, days } = getPeriodDates(range);
  const orders = await fetchOrdersInWindow(clinicId, currStart, currEnd);

  // Group sales by date + build order→date map for profit
  const byDate: Record<string, { sales: number; profit: number }> = {};
  const orderIdToDate: Record<string, string> = {};

  for (const o of orders) {
    const key = localDateStr(parseDate(o.created_at));
    if (!byDate[key]) byDate[key] = { sales: 0, profit: 0 };
    byDate[key].sales += orderAmount(o);
    orderIdToDate[o.id] = key;
  }

  // Compute daily profit from batches
  const orderIds = orders.map(o => o.id);
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, selling_price, order_batches(purchase_price_at_sale, quantity)')
      .in('order_id', orderIds);
    for (const item of items ?? []) {
      const key = orderIdToDate[(item as any).order_id];
      if (!key || !byDate[key]) continue;
      for (const b of ((item as any).order_batches as any[]) ?? []) {
        byDate[key].profit += (Number(item.selling_price) - Number(b.purchase_price_at_sale)) * Number(b.quantity);
      }
    }
  }

  // Build complete date series (fill gaps with 0)
  const result: TrendPoint[] = [];
  const start = new Date(currStart);
  // For 'today', show last 7 days for a meaningful chart
  const chartDays = days < 2 ? 7 : days;
  const chartStart = days < 2
    ? (() => { const d = new Date(currEnd); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; })()
    : start;

  for (let i = 0; i < chartDays; i++) {
    const d = new Date(chartStart);
    d.setDate(chartStart.getDate() + i);
    const key = localDateStr(d);
    result.push({ date: key, total_sales: byDate[key]?.sales || 0, profit: byDate[key]?.profit || 0 });
  }
  return result;
}

export async function fetchTopMedicines(clinicId: string, range: DateRange): Promise<TopMedicine[]> {
  const { currStart, currEnd } = getPeriodDates(range);
  const orders = await fetchOrdersInWindow(clinicId, currStart, currEnd);
  const orderIds = orders.map(o => o.id);

  if (orderIds.length === 0) return [];

  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, selling_price, medicine_id, medicines(name), order_batches(purchase_price_at_sale, quantity)')
    .in('order_id', orderIds);

  if (!items) return [];

  const map: Record<string, TopMedicine> = {};
  for (const item of items) {
    const med = (item as any).medicines;
    if (!med) continue;
    const name = med.name as string;
    if (!map[name]) map[name] = { name, total_sold: 0, revenue: 0, profit: 0 };
    const qty = Number(item.quantity) || 0;
    const price = Number(item.selling_price) || 0;
    map[name].total_sold += qty;
    map[name].revenue += qty * price;
    for (const b of ((item as any).order_batches as any[]) ?? []) {
      map[name].profit += (price - Number(b.purchase_price_at_sale)) * Number(b.quantity);
    }
  }

  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

export async function fetchInventoryInsights(clinicId: string): Promise<InventoryInsights> {
  const { data: inv } = await supabase
    .from('inventory')
    .select('total_quantity, medicine_id, medicines(name)')
    .eq('clinic_id', clinicId);

  const { data: batches } = await supabase
    .from('batches')
    .select('quantity_remaining, mrp, purchase_price, expiry_date, medicine_id, medicines(name)')
    .eq('clinic_id', clinicId)
    .gt('quantity_remaining', 0);

  let low_stock_count = 0;
  let out_of_stock_count = 0;
  let expiring_soon_count = 0;
  let inventory_value = 0;

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const issues: InventoryIssue[] = [];

  for (const item of inv ?? []) {
    if (item.total_quantity === 0) {
      out_of_stock_count++;
      issues.push({ type: 'out_of_stock', medicineName: (item.medicines as any)?.name ?? 'Unknown', detail: 'Out of stock' });
    } else if (item.total_quantity > 0 && item.total_quantity < 10) {
      low_stock_count++;
      issues.push({ type: 'low_stock', medicineName: (item.medicines as any)?.name ?? 'Unknown', detail: `Low stock (${item.total_quantity} left)` });
    }
  }

  for (const b of batches ?? []) {
    const price = b.purchase_price ?? b.mrp ?? 0;
    inventory_value += b.quantity_remaining * price;
    
    if (b.expiry_date) {
      const exp = new Date(b.expiry_date);
      if (exp <= thirtyDaysFromNow) {
        expiring_soon_count++;
        const days = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        issues.push({ type: 'expiring', medicineName: (b.medicines as any)?.name ?? 'Unknown', detail: `Expiring in ${days} days` });
      }
    }
  }

  // Sort issues by priority: Expiry > Out of stock > Low stock
  const rank = { expiring: 1, out_of_stock: 2, low_stock: 3 };
  issues.sort((a, b) => rank[a.type] - rank[b.type]);

  return {
    low_stock_count,
    out_of_stock_count,
    expiring_soon_count,
    inventory_value,
    top_issues: issues.slice(0, 5),
  };
}

export function generateAlerts(summary: PeriodSummary, inv: InventoryInsights): Alert[] {
  const alerts: Alert[] = [];
  let id = 1;

  if (inv.expiring_soon_count > 0) {
    alerts.push({ id: String(id++), type: 'expiring', priority: 1, message: `${inv.expiring_soon_count} medicine(s) expiring soon`, path: '/inventory' });
  }
  if (inv.out_of_stock_count > 0) {
    alerts.push({ id: String(id++), type: 'out_of_stock', priority: 2, message: `${inv.out_of_stock_count} item(s) out of stock`, path: '/inventory' });
  }
  if (inv.low_stock_count > 0) {
    alerts.push({ id: String(id++), type: 'low_stock', priority: 3, message: `${inv.low_stock_count} item(s) running low`, path: '/inventory' });
  }

  const salesPct = pctChange(summary.period_sales, summary.prev_sales);
  if (salesPct !== null && salesPct <= -5) {
    alerts.push({ id: String(id++), type: 'sale_drop', priority: 4, message: `Sales down ${Math.abs(salesPct)}% compared to prev period`, path: '/analytics' });
  }

  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 4);
}
