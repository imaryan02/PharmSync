import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Batch } from '../types';
import { Hash, Calendar, Package, IndianRupee, X, CheckCircle2 } from 'lucide-react';

interface BatchEditModalProps {
  batch: Batch;
  clinicId: string;
  medicineId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchEditModal({ batch, clinicId, medicineId, onClose, onSuccess }: BatchEditModalProps) {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batch_code: batch.batch_code || '',
    expiry_date: batch.expiry_date ? batch.expiry_date.slice(0, 7) : '',
    quantity_remaining: batch.quantity_remaining.toString(),
    purchase_price: batch.purchase_price?.toString() || '',
    selling_price: batch.selling_price?.toString() || '',
    mrp: batch.mrp?.toString() || '',
  });

  const handleSave = async () => {
    const qty = parseFloat(form.quantity_remaining);
    if (isNaN(qty) || qty < 0) {
      showError('Quantity must be a non-negative number.');
      return;
    }
    if (!form.expiry_date) {
      showError('Expiry date is required.');
      return;
    }

    setSaving(true);
    try {
      const oldQty = batch.quantity_remaining;
      const diff = qty - oldQty;

      // 1. Update batch row
      const { error: batchErr } = await supabase
        .from('batches')
        .update({
          batch_code: form.batch_code.trim() || null,
          expiry_date: `${form.expiry_date}-01`,
          quantity_remaining: qty,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
          selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
          mrp: form.mrp ? parseFloat(form.mrp) : null,
        })
        .eq('id', batch.id);

      if (batchErr) throw batchErr;

      // 2. Sync inventory total if quantity changed
      if (diff !== 0) {
        const { data: inv, error: invErr } = await supabase
          .from('inventory')
          .select('id, total_quantity')
          .eq('clinic_id', clinicId)
          .eq('medicine_id', medicineId)
          .maybeSingle();

        if (invErr) throw invErr;
        if (inv) {
          const newTotal = Math.max(0, inv.total_quantity + diff);
          const { error: updErr } = await supabase
            .from('inventory')
            .update({ total_quantity: newTotal })
            .eq('id', inv.id);
          if (updErr) throw updErr;
        }
      }

      // 3. Audit log
      try {
        await supabase.from('audit_logs').insert([{
          action: 'Batch updated',
          entity_type: 'inventory',
          user_id: user?.id,
          actor_type: 'owner',
          metadata: { 
            batch_code: form.batch_code.trim() || null, 
            quantity_change: diff,
            new_quantity: qty
          }
        }]);
      } catch (auditErr) {
        console.warn('Audit log skipped:', auditErr);
      }

      showSuccess('Batch updated successfully!');
      onSuccess();
    } catch (err: any) {
      showError(err.message || 'Failed to update batch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm sm:backdrop-blur-none">
      <div 
        className="absolute inset-0 z-0 sm:hidden" 
        onClick={onClose}
      />
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden z-10 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Mobile handle */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Edit Batch</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Row 1: Code & Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Batch Code</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={form.batch_code}
                  onChange={e => setForm(f => ({ ...f, batch_code: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:font-normal"
                  placeholder="e.g. BATCH-001"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Expiry <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="month"
                  required
                  value={form.expiry_date}
                  onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Quantity Left <span className="text-red-500">*</span></label>
            <div className="relative">
              <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
              <input
                type="number"
                min="0"
                required
                value={form.quantity_remaining}
                onChange={e => setForm(f => ({ ...f, quantity_remaining: e.target.value }))}
                className="block w-full pl-10 pr-3 py-3 bg-blue-50 border border-blue-100 rounded-xl text-lg font-extrabold text-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter quantity"
              />
            </div>
          </div>

          {/* Row 3: Pricing */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Purchase</label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchase_price}
                  onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                  className="block w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Selling</label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.selling_price}
                  onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                  className="block w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-emerald-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">MRP</label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.mrp}
                  onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))}
                  className="block w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-slate-100 bg-slate-50/50 pb-safe">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.expiry_date || !form.quantity_remaining}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 shadow-[0_2px_10px_rgba(37,99,235,0.2)] text-white text-sm font-bold disabled:opacity-50 transition-all hover:bg-blue-700 active:scale-[0.98]"
          >
            {saving ? (
              <div className="animate-spin h-5 w-5 rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
