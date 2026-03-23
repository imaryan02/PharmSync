import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../hooks/useToast';
import { Batch } from '../types';
import { Calendar, Hash, Package, Pencil, Trash2, X, IndianRupee, CheckCircle2 } from 'lucide-react';

interface BatchListProps {
  clinicId: string;
  medicineId: string;
}

interface EditForm {
  batch_code: string;
  expiry_date: string; // YYYY-MM format for <input type="month">
  quantity_remaining: string;
  purchase_price: string;
  selling_price: string;
  mrp: string;
}

export default function BatchList({ clinicId, medicineId }: BatchListProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { error: showError, success: showSuccess } = useToast();

  const fetchBatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('medicine_id', medicineId)
      .gt('quantity_remaining', 0)
      .order('expiry_date', { ascending: true });

    if (!error && data) setBatches(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, [clinicId, medicineId]);

  // --- Edit helpers ---
  const openEdit = (batch: Batch) => {
    setEditingBatch(batch);
    // expiry_date in DB is YYYY-MM-DD; convert to YYYY-MM for month input
    const expiry = batch.expiry_date?.slice(0, 7) ?? '';
    setForm({
      batch_code: batch.batch_code ?? '',
      expiry_date: expiry,
      quantity_remaining: batch.quantity_remaining.toString(),
      purchase_price: batch.purchase_price?.toString() ?? '',
      selling_price: batch.selling_price?.toString() ?? '',
      mrp: batch.mrp?.toString() ?? '',
    });
  };

  const closeEdit = () => {
    setEditingBatch(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!editingBatch || !form) return;
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
      const oldQty = editingBatch.quantity_remaining;
      const diff = qty - oldQty;

      // 1. Update the batch row
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
        .eq('id', editingBatch.id);

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

      showSuccess('Batch updated successfully!');
      closeEdit();
      await fetchBatches();
    } catch (err: any) {
      showError(err.message || 'Failed to update batch.');
    } finally {
      setSaving(false);
    }
  };

  // --- Delete handler ---
  const handleDelete = async (batch: Batch) => {
    if (!window.confirm(`Delete batch "${batch.batch_code || 'N/A'}"? This will remove ${batch.quantity_remaining} units from inventory. This cannot be undone.`)) return;

    setDeletingId(batch.id);
    try {
      // 1. Delete batch
      const { error: delErr } = await supabase
        .from('batches')
        .delete()
        .eq('id', batch.id);

      if (delErr) throw delErr;

      // 2. Reduce inventory total
      const { data: inv, error: invErr } = await supabase
        .from('inventory')
        .select('id, total_quantity')
        .eq('clinic_id', clinicId)
        .eq('medicine_id', medicineId)
        .maybeSingle();

      if (invErr) throw invErr;
      if (inv) {
        const newTotal = Math.max(0, inv.total_quantity - batch.quantity_remaining);
        await supabase
          .from('inventory')
          .update({ total_quantity: newTotal })
          .eq('id', inv.id);
      }

      showSuccess('Batch deleted.');
      await fetchBatches();
    } catch (err: any) {
      showError(err.message || 'Failed to delete batch.');
    } finally {
      setDeletingId(null);
    }
  };

  // ========================
  // RENDER
  // ========================
  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        No active batches found for this medicine.
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-50 border-t border-slate-100 p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Batch Breakdown
        </h4>
        <div className="space-y-2">
          {batches.map((batch) => {
            const expiryDate = new Date(batch.expiry_date);
            const today = new Date();
            const threeMonthsFromNow = new Date();
            threeMonthsFromNow.setMonth(today.getMonth() + 3);
            const isExpiringSoon = expiryDate <= threeMonthsFromNow && expiryDate >= today;
            const isExpired = expiryDate < today;
            const isDeleting = deletingId === batch.id;

            return (
              <div
                key={batch.id}
                className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Hash className="h-4 w-4 text-slate-400" />
                    {batch.batch_code || 'N/A'}
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm ${isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                    <Calendar className="h-4 w-4" />
                    {new Date(batch.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {isExpired && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Expired</span>}
                    {isExpiringSoon && !isExpired && <span className="ml-1 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Expiring soon</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                    <Package className="h-4 w-4 text-slate-500" />
                    {batch.quantity_remaining}
                  </div>
                  <button
                    onClick={() => openEdit(batch)}
                    title="Edit batch"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(batch)}
                    disabled={isDeleting}
                    title="Delete batch"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting
                      ? <div className="animate-spin h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editingBatch && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Edit Batch</h2>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Batch code + expiry in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Batch Code</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.batch_code}
                      onChange={e => setForm(f => f ? { ...f, batch_code: e.target.value } : f)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. BATCH-001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="month"
                      required
                      value={form.expiry_date}
                      onChange={e => setForm(f => f ? { ...f, expiry_date: e.target.value } : f)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantity Remaining <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.quantity_remaining}
                    onChange={e => setForm(f => f ? { ...f, quantity_remaining: e.target.value } : f)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              {/* Prices in 3 columns */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Purchase ₹</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.purchase_price}
                      onChange={e => setForm(f => f ? { ...f, purchase_price: e.target.value } : f)}
                      className="block w-full pl-8 pr-2 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Selling ₹</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.selling_price}
                      onChange={e => setForm(f => f ? { ...f, selling_price: e.target.value } : f)}
                      className="block w-full pl-8 pr-2 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">MRP ₹</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.mrp}
                      onChange={e => setForm(f => f ? { ...f, mrp: e.target.value } : f)}
                      className="block w-full pl-8 pr-2 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.expiry_date || !form.quantity_remaining}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
