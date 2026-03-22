import React, { useState, useEffect } from 'react';
import { Inventory, Batch, Medicine } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Pill, Activity, AlertTriangle, Search, ChevronDown } from 'lucide-react';

export interface AdjustmentFormData {
  inventoryItem: Inventory;
  batchItem: Batch | null;
  type: 'Increase' | 'Decrease';
  quantity: number;
  reason: string;
}

interface AdjustmentFormProps {
  inventory: Inventory[];
  onSubmit: (data: AdjustmentFormData) => Promise<void>;
  submitting: boolean;
}

const REASONS = [
  'Expired',
  'Damaged',
  'Count mismatch',
  'Manual correction',
  'Lost stock',
  'Other'
];

export default function AdjustmentForm({ inventory, onSubmit, submitting }: AdjustmentFormProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedInv, setSelectedInv] = useState<Inventory | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  const [type, setType] = useState<'Increase' | 'Decrease'>('Decrease');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('');

  const [error, setError] = useState('');

  const filteredInventory = inventory.filter(inv => {
    if (!inv.medicines) return false;
    const term = search.toLowerCase();
    return (
      inv.medicines.name.toLowerCase().includes(term) ||
      (inv.medicines.company && inv.medicines.company.toLowerCase().includes(term))
    );
  }).slice(0, 50); // Limit to top 50 matches

  useEffect(() => {
    if (selectedInv) {
      fetchBatches(selectedInv.medicine_id, selectedInv.clinic_id);
    } else {
      setBatches([]);
      setSelectedBatch(null);
    }
  }, [selectedInv]);

  const fetchBatches = async (medicineId: string, clinicId: string) => {
    setLoadingBatches(true);
    const { data } = await supabase
      .from('batches')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('medicine_id', medicineId)
      .gt('quantity_remaining', 0)
      .order('expiry_date', { ascending: true });
    
    if (data) {
      setBatches(data as Batch[]);
      if (data.length === 1) {
        setSelectedBatch(data[0] as Batch);
      }
    }
    setLoadingBatches(false);
  };

  const handleSelectInv = (inv: Inventory) => {
    setSelectedInv(inv);
    setSearch(inv.medicines?.name || '');
    setShowDropdown(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv) {
      setError('Please select a medicine');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason');
      return;
    }

    if (type === 'Decrease') {
      if (qty > selectedInv.total_quantity) {
        setError(`Cannot decrease more than total inventory (${selectedInv.total_quantity})`);
        return;
      }
      if (selectedBatch && qty > selectedBatch.quantity_remaining) {
        setError(`Cannot decrease more than batch quantity (${selectedBatch.quantity_remaining})`);
        return;
      }
    }

    setError('');
    onSubmit({
      inventoryItem: selectedInv,
      batchItem: selectedBatch,
      type,
      quantity: qty,
      reason
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2 border border-red-100">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Medicine Selection */}
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-1">Select Medicine *</label>
        <div className="relative">
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Search store inventory..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
              if (selectedInv) setSelectedInv(null);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        </div>

        {showDropdown && search && !selectedInv && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            {filteredInventory.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No matches found in inventory</div>
            ) : (
              filteredInventory.map(inv => (
                <button
                  key={inv.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-3"
                  onClick={() => handleSelectInv(inv)}
                >
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-500">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{inv.medicines?.name}</div>
                    <div className="text-xs text-slate-500 flex gap-2">
                      <span>{inv.medicines?.company}</span>
                      <span>•</span>
                      <span className="font-medium text-blue-600">Stock: {inv.total_quantity}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Batch Selection */}
      {selectedInv && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Batch (Optional)</label>
          <div className="relative">
            <select
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedBatch?.id || ''}
              onChange={(e) => {
                const b = batches.find(b => b.id === e.target.value);
                setSelectedBatch(b || null);
              }}
              disabled={loadingBatches || batches.length === 0}
            >
              <option value="">-- No specific batch --</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batch_code || 'N/A'} (Exp: {new Date(b.expiry_date).toLocaleDateString()}) - Qty: {b.quantity_remaining}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Type & Quantity Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Action Type *</label>
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-lg transition-colors ${type === 'Increase' ? 'bg-white shadow relative text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setType('Increase')}
            >
              Increase
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-lg transition-colors ${type === 'Decrease' ? 'bg-white shadow relative text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setType('Decrease')}
            >
              Decrease
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
          <input
            type="number"
            min="1"
            className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none h-[42px]"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="e.g. 5"
          />
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
        <select
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="" disabled>Select reason...</option>
          {REASONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting || !selectedInv}
        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Saving Adjustment...' : 'Save Adjustment'}
      </button>

    </form>
  );
}
