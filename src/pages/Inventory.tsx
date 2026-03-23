import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Inventory, Batch, Medicine } from '../types';
import InventoryItem from '../components/InventoryItem';
import { ArrowLeft, Package, Plus, AlertCircle, Search, TrendingUp, AlertTriangle, XCircle, SearchIcon, Loader2 } from 'lucide-react';

export interface SmartInventory extends Inventory {
  medicines: Medicine;
  batches: Batch[];
  isLowStock: boolean;
  isExpiringSoon: boolean;
  isOutOfStock: boolean;
  stockValue: number;
}

export type FilterTab = 'all' | 'low_stock' | 'expiring' | 'out_of_stock';

const LOW_STOCK_THRESHOLD = 10;
const EXPIRY_DAYS_THRESHOLD = 30;

export default function InventoryPage() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState<SmartInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    if (user && activeStore) fetchInventory();
    else setLoading(false);
  }, [user, activeStore]);

  const fetchInventory = async () => {
    setLoading(true);
    
    // 1. Fetch inventory + medicine
    const { data: invData, error: invError } = await supabase
      .from('inventory')
      .select(`
        *,
        medicines (id, name, company, composition, type, pack_size)
      `)
      .eq('clinic_id', activeStore?.id)
      .order('total_quantity', { ascending: false });
      
    // 2. Fetch all batches for this store
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('id, medicine_id, batch_code, expiry_date, quantity_remaining, purchase_price, selling_price, mrp')
      .eq('clinic_id', activeStore?.id)
      .gt('quantity_remaining', 0);
    
    if (!invError && invData) {
      const today = new Date();
      const expiryThresholdDate = new Date();
      expiryThresholdDate.setDate(today.getDate() + EXPIRY_DAYS_THRESHOLD);
      const expiryStr = expiryThresholdDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      const smartData: SmartInventory[] = (invData as any[]).map(inv => {
        // Find matching batches for this medicine
        const batches: Batch[] = (batchData as any as Batch[])?.filter(b => b.medicine_id === inv.medicine_id) || [];
        
        const isOutOfStock = inv.total_quantity <= 0;
        const isLowStock = !isOutOfStock && inv.total_quantity < LOW_STOCK_THRESHOLD;
        
        let isExpiringSoon = false;
        let stockValue = 0;

        batches.forEach(b => {
          if (b.quantity_remaining > 0) {
            if (b.expiry_date >= todayStr && b.expiry_date <= expiryStr) {
              isExpiringSoon = true;
            }
            stockValue += (b.purchase_price || 0) * b.quantity_remaining;
          }
        });

        // if batch price missing, try mrp from medicine
        if (stockValue === 0 && inv.total_quantity > 0 && inv.medicines.mrp) {
            stockValue = inv.total_quantity * inv.medicines.mrp * 0.7; // rough estimate if no purchase price
        }

        return {
          ...inv,
          batches, // added this back to the object
          isOutOfStock,
          isLowStock,
          isExpiringSoon,
          stockValue,
        };
      });

      setInventory(smartData);
    }
    setLoading(false);
  };

  // ── Metrics ──
  const metrics = useMemo(() => {
    let totalValue = 0;
    let lowCount = 0;
    let expCount = 0;
    let outCount = 0;

    inventory.forEach(i => {
      totalValue += i.stockValue;
      if (i.isLowStock) lowCount++;
      if (i.isExpiringSoon) expCount++;
      if (i.isOutOfStock) outCount++;
    });

    return { totalValue, lowCount, expCount, outCount };
  }, [inventory]);

  // ── Filter & Search ──
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // 1. Tab filter
      if (activeTab === 'low_stock' && !item.isLowStock) return false;
      if (activeTab === 'expiring' && !item.isExpiringSoon) return false;
      if (activeTab === 'out_of_stock' && !item.isOutOfStock) return false;

      // 2. Search query
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      
      const med = item.medicines;
      return med.name.toLowerCase().includes(q) || 
             med.company?.toLowerCase().includes(q) ||
             item.batches.some(b => b.batch_code?.toLowerCase().includes(q));
    });
  }, [inventory, searchQuery, activeTab]);

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
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

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Inventory</h1>
            <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">
              {activeStore.name}
            </span>
          </div>
          <Link to="/stock-entry" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Add Stock
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          
        {/* ── Summary Cards (Grid) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Value</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">₹{metrics.totalValue.toLocaleString('en-IN')}</p>
            </div>
            
            <button onClick={() => setActiveTab('low_stock')}
              className={`text-left flex flex-col justify-between border rounded-2xl p-4 sm:p-5 transition-all outline-none ${
                activeTab === 'low_stock' ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500/20 shadow-sm' : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
              }`}>
              <div className="flex items-center justify-between w-full mb-3 sm:mb-4">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                  <AlertTriangle className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Items</span>
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-amber-700/80 uppercase tracking-wider block mb-0.5">Low Stock</span>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-700 tracking-tight">{metrics.lowCount}</p>
              </div>
            </button>
            
            <button onClick={() => setActiveTab('expiring')}
               className={`text-left flex flex-col justify-between border rounded-2xl p-4 sm:p-5 transition-all outline-none ${
                activeTab === 'expiring' ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500/20 shadow-sm' : 'bg-white border-slate-200 hover:border-orange-200 hover:bg-orange-50/30'
              }`}>
              <div className="flex items-center justify-between w-full mb-3 sm:mb-4">
                <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                  <AlertCircle className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Batches</span>
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-orange-700/80 uppercase tracking-wider block mb-0.5">Expiring</span>
                <p className="text-xl sm:text-2xl font-extrabold text-orange-700 tracking-tight">{metrics.expCount}</p>
              </div>
            </button>

            <button onClick={() => setActiveTab('out_of_stock')}
               className={`text-left flex flex-col justify-between border rounded-2xl p-4 sm:p-5 transition-all outline-none ${
                activeTab === 'out_of_stock' ? 'bg-red-50 border-red-200 ring-2 ring-red-500/20 shadow-sm' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/30'
              }`}>
              <div className="flex items-center justify-between w-full mb-3 sm:mb-4">
                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                  <XCircle className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Items</span>
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-red-700/80 uppercase tracking-wider block mb-0.5">Empty</span>
                <p className="text-xl sm:text-2xl font-extrabold text-red-700 tracking-tight">{metrics.outCount}</p>
              </div>
            </button>
          </div>

          {/* ── Filter Tabs & Search ── */}
          <div className="bg-slate-50 sm:bg-white sm:border border-slate-200 sm:rounded-2xl sm:p-2 sm:shadow-sm space-y-3 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 sm:py-0">
            {/* Segmented Control */}
            <div className="flex bg-slate-200/50 sm:bg-slate-100 p-1 rounded-xl overflow-x-auto hide-scrollbar">
              {(['all', 'low_stock', 'expiring', 'out_of_stock'] as FilterTab[]).map(tab => {
                const isActive = activeTab === tab;
                const labels: Record<FilterTab, string> = {
                  'all': 'All View',
                  'low_stock': `Low Stock`,
                  'expiring': `Expiring`,
                  'out_of_stock': `Empty`
                };
                return (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 flex-1 px-4 py-2 sm:py-2.5 rounded-lg text-sm transition-all outline-none whitespace-nowrap ${
                      isActive 
                        ? 'bg-white text-blue-700 font-bold shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5' 
                        : 'text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-200/30'
                    }`}>
                    {labels[tab]}
                  </button>
                );
              })}
            </div>
            
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search medicine or batch code..."
                className="block w-full pl-11 pr-4 py-3 bg-white sm:bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:focus:bg-white transition-all placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>

          {/* ── List ── */}
          {loading ? (
             <div className="flex justify-center py-16">
               <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
             </div>
          ) : filteredInventory.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 mb-4 border border-slate-100">
                <Package className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No medicines found</h3>
              <p className="text-slate-500 text-sm">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInventory.map(item => (
                <InventoryItem 
                  key={item.id} 
                  item={item} 
                  onRefresh={fetchInventory}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <div className="fixed bottom-6 right-6 sm:hidden z-20">
        <Link to="/stock-entry" className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform">
          <Plus className="h-6 w-6" />
        </Link>
      </div>

    </div>
  );
}

// ── Components ──

function MetricCard({ title, value, subtitle, icon: Icon, color, bgColor, borderColor, onClick, active }: any) {
  return (
    <div 
      onClick={onClick}
      className={`min-w-[140px] sm:min-w-0 flex-1 snap-start overflow-hidden rounded-2xl flex flex-col justify-between ${bgColor} border ${active ? `border-2 ${borderColor} shadow-sm ring-2 ring-${borderColor.split('-')[1]}-500/20` : `border-transparent opacity-90`} p-4 sm:p-5 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:opacity-100 hover:border-slate-200' : ''}`}
    >
      <div className="flex justify-between items-start mb-4 sm:mb-6">
        <div className={`p-2 sm:p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {subtitle && (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider opacity-80">{subtitle}</span>
        )}
      </div>
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-slate-600 mb-1 sm:mb-2">{title}</h3>
        <p className={`text-xl sm:text-3xl font-extrabold ${color} leading-none tracking-tight`}>{value}</p>
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, label, count, color }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap border ${
        active 
          ? 'bg-white border-slate-200 shadow-sm text-slate-900' 
          : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${active ? color : 'bg-slate-200/80 text-slate-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
