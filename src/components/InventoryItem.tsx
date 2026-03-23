import React, { useState } from 'react';
import { SmartInventory } from '../pages/Inventory';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../hooks/useToast';
import { ChevronDown, ChevronUp, Pill, Building2, AlertTriangle, IndianRupee, Clock, Plus, Trash2, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import BatchEditModal from './BatchEditModal';
import { Batch } from '../types';

interface InventoryItemProps {
  item: SmartInventory;
  onRefresh: () => void;
  key?: string | number;
}

export default function InventoryItem({ item, onRefresh }: InventoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { error: showError, success: showSuccess } = useToast();

  const medicine = item.medicines;
  if (!medicine) return null;

  // Status colors
  let statusBorder = 'border-slate-200';
  let badge = null;

  if (item.isOutOfStock) {
    statusBorder = 'border-red-300 shadow-[0_4px_12px_rgba(239,68,68,0.1)]';
    badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider"><AlertTriangle className="h-3 w-3" /> Out of stock</span>;
  } else if (item.isExpiringSoon) {
    statusBorder = 'border-orange-300 shadow-[0_4px_12px_rgba(249,115,22,0.1)]';
    badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider"><Clock className="h-3 w-3" /> Expiring Soon</span>;
  } else if (item.isLowStock) {
    statusBorder = 'border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.1)]';
    badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider"><AlertTriangle className="h-3 w-3" /> Low Stock</span>;
  }

  // Type color
  const getTypeColor = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'tablet': return 'bg-blue-50 text-blue-600';
      case 'capsule': return 'bg-purple-50 text-purple-600';
      case 'syrup': return 'bg-amber-50 text-amber-600';
      case 'injection': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const handleDeleteBatch = async (batch: Batch) => {
    if (!window.confirm(`Delete batch "${batch.batch_code || 'N/A'}"? This will remove ${batch.quantity_remaining} units from inventory. This cannot be undone.`)) return;

    setDeletingId(batch.id);
    try {
      const { error: delErr } = await supabase.from('batches').delete().eq('id', batch.id);
      if (delErr) throw delErr;

      const newTotal = Math.max(0, item.total_quantity - batch.quantity_remaining);
      await supabase.from('inventory').update({ total_quantity: newTotal }).eq('id', item.id);

      showSuccess('Batch deleted permanently.');
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete batch.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className={`bg-white rounded-2xl border ${statusBorder} overflow-hidden transition-all duration-200`}>
        {/* ── Main Row ── */}
        <div 
          className="p-4 sm:p-5 flex items-start sm:items-center justify-between cursor-pointer hover:bg-slate-50/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
            <div className={`p-2.5 rounded-xl shrink-0 ${getTypeColor(medicine.type)} hidden sm:block`}>
              <Pill className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 border-gray-100 pb-1">
                <h3 className="font-bold text-slate-900 text-lg sm:text-base leading-tight truncate">{medicine.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                   {badge}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500 font-medium">
                {medicine.company && (
                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                    <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{medicine.company}</span>
                  </span>
                )}
                {medicine.type && (
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-slate-600">{medicine.type}</span>
                )}
                {medicine.pack_size && (
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-slate-600 tracking-wide font-semibold">📦 {medicine.pack_size}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className={`block text-2xl sm:text-xl font-extrabold leading-none ${item.isOutOfStock ? 'text-red-500' : 'text-slate-900'}`}>
                {item.total_quantity}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">
                Quantity
              </span>
            </div>
            <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}>
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </div>

        {/* ── Expanded Section ── */}
        {isExpanded && (
          <div className="bg-slate-50/50 border-t border-slate-100 p-4 sm:p-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
               <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm w-fit">
                 <IndianRupee className="h-4 w-4 text-emerald-600" />
                 Stock Value: <span className="text-slate-900">₹{item.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
               </div>
               
               <div className="flex items-center gap-2">
                 <Link to={`/medicines/${medicine.id}/edit`}
                   className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors">
                   <Pencil className="h-4 w-4" /> Edit Medicine
                 </Link>
                 <Link to={`/stock-entry`}
                   state={{ medicineId: item.medicine_id }} 
                   className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-[0_2px_8px_rgba(37,99,235,0.2)] transition-colors active:scale-95">
                   <Plus className="h-4 w-4" /> Add Stock
                 </Link>
               </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">Active Batches ({item.batches?.length || 0})</p>
              {(!item.batches || item.batches.length === 0) ? (
                 <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                   <p className="text-sm font-medium text-slate-500">No active batches left.</p>
                 </div>
              ) : (
                 <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                   {item.batches.map(batch => {
                      const exp = new Date(batch.expiry_date);
                      const today = new Date();
                      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
                      const isExp = diffDays <= 30 && diffDays >= 0;
                      const isExpired = diffDays < 0;
                      const isDeleting = deletingId === batch.id;

                      return (
                        <div key={batch.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
                            <div className={`w-1.5 h-10 rounded-full shrink-0 ${isExpired ? 'bg-red-500' : isExp ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                            <div>
                              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                {batch.batch_code || <span className="text-slate-400 italic font-mono">NO-CODE</span>}
                                {isExpired && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Expired</span>}
                                {isExp && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Expiring</span>}
                              </p>
                              <p className="text-xs font-medium text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                <span><span className="text-slate-400">Exp:</span> {exp.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                                <span className="text-slate-300 hidden sm:inline">•</span>
                                <span className="flex items-center gap-1" title="Purchase Price → Selling Price">
                                  <IndianRupee className="h-3 w-3 text-slate-400" />
                                  {batch.purchase_price ?? 0} <span className="text-slate-300">→</span> {batch.selling_price ?? batch.mrp ?? 0}
                                </span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-5 sm:pl-0">
                            {/* Quantity pill */}
                            <div className="bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 text-right min-w-[3rem]">
                              <span className="block text-sm font-extrabold text-blue-900 leading-none mb-0.5">{batch.quantity_remaining}</span>
                              <span className="text-[9px] font-extrabold text-blue-500/70 uppercase tracking-wider">Qty</span>
                            </div>
                            
                            {/* Actions (visible on hover on desktop, always on mobile) */}
                            <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingBatch(batch)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button 
                                disabled={isDeleting}
                                onClick={() => handleDeleteBatch(batch)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <div className="animate-spin h-4 w-4 rounded-full border-2 border-red-500 border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                   })}
                 </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingBatch && (
        <BatchEditModal
          batch={editingBatch}
          clinicId={item.clinic_id}
          medicineId={medicine.id}
          onClose={() => setEditingBatch(null)}
          onSuccess={() => {
            setEditingBatch(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
