import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { Medicine } from '../types';
import MedicineDropdown from '../components/MedicineDropdown';
import { ArrowLeft, PackagePlus, Calendar, Hash, IndianRupee, Pill, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StockEntry() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  // Form state
  const [medicineId, setMedicineId] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [bonusQuantity, setBonusQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');

  useEffect(() => {
    if (user) {
      fetchMedicines();
    }
  }, [user]);

  const fetchMedicines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('owner_id', user?.id)
      .order('name', { ascending: true });
    
    if (!error && data) {
      setMedicines(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setMedicineId('');
    setBatchCode('');
    setExpiryDate('');
    setQuantity('');
    setBonusQuantity('');
    setPurchasePrice('');
    setSellingPrice('');
    setMrp('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) {
      showError('Please select a store first.');
      return;
    }
    if (!medicineId || !expiryDate || !quantity || parseInt(quantity) <= 0) {
      showError('Please fill all required fields correctly.');
      return;
    }

    setSubmitting(true);

    try {
      const qty = parseInt(quantity);

      // 1. Insert into batches
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .insert([
          {
            clinic_id: activeStore.id,
            medicine_id: medicineId,
            batch_code: batchCode.trim() || null,
            expiry_date: `${expiryDate}-01`,
            quantity_remaining: qty,
            purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
            selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
            mrp: mrp ? parseFloat(mrp) : null,
          }
        ])
        .select()
        .single();

      if (batchError) throw batchError;

      // 2. Insert into stock_entries
      const { error: entryError } = await supabase
        .from('stock_entries')
        .insert([
          {
            clinic_id: activeStore.id,
            medicine_id: medicineId,
            batch_id: batchData.id,
            quantity: qty,
            bonus_quantity: bonusQuantity ? parseInt(bonusQuantity) : 0,
            // created_by omitted — FK references employees table, not auth.users
          }
        ]);

      if (entryError) throw entryError;

      // 3. Update inventory
      // First check if inventory record exists
      const { data: invData, error: invCheckError } = await supabase
        .from('inventory')
        .select('*')
        .eq('clinic_id', activeStore.id)
        .eq('medicine_id', medicineId)
        .maybeSingle();

      if (invCheckError) throw invCheckError;

      if (invData) {
        // Update existing
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ total_quantity: invData.total_quantity + qty })
          .eq('id', invData.id);
        
        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('inventory')
          .insert([
            {
              clinic_id: activeStore.id,
              medicine_id: medicineId,
              total_quantity: qty,
            }
          ]);
        if (insertError) throw insertError;
      }

      // Audit log
      try {
        const medName = medicines.find(m => m.id === medicineId)?.name || 'Unknown Medicine';
        await supabase.from('audit_logs').insert([{
          action: 'Stock entered',
          entity_type: 'inventory',
          user_id: user?.id,
          actor_type: 'owner',
          metadata: { medicine_name: medName, batch_code: batchCode.trim() || null, quantity: qty }
        }]);
      } catch (auditErr) {
        console.warn('Audit log skipped:', auditErr);
      }

      showSuccess('Stock added successfully!');
      resetForm();

    } catch (err: any) {
      console.error('Stock entry error:', err);
      showError(err.message || 'Failed to add stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-600 mb-6">
            Please select an active store from the dashboard before adding stock.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (medicines.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center border-dashed">
          <Pill className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Medicines Found</h2>
          <p className="text-slate-600 mb-6">
            You need to add medicines to your master list before you can enter stock.
          </p>
          <Link
            to="/medicines/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Medicines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Add Stock</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between bg-blue-50 text-blue-800 px-4 py-3 rounded-xl border border-blue-100">
              <span className="text-sm font-medium">Adding stock to:</span>
              <span className="text-sm font-bold">{activeStore.name}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Medicine <span className="text-red-500">*</span>
                </label>
                <MedicineDropdown
                  medicines={medicines}
                  value={medicineId}
                  onChange={setMedicineId}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="batchCode" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Batch Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="batchCode"
                      value={batchCode}
                      onChange={(e) => setBatchCode(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="e.g. BATCH-123"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="month"
                      id="expiryDate"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PackagePlus className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    id="quantity"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bonusQuantity" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Bonus Quantity <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CheckCircle2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    id="bonusQuantity"
                    min="0"
                    value={bonusQuantity}
                    onChange={(e) => setBonusQuantity(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="Enter bonus quantity"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="purchasePrice" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Purchase Price <span className="text-slate-400 font-normal">(Opt)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      id="purchasePrice"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="block w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sellingPrice" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Selling Price <span className="text-slate-400 font-normal">(Opt)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      id="sellingPrice"
                      step="0.01"
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="block w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mrp" className="block text-sm font-medium text-slate-700 mb-1.5">
                    MRP <span className="text-slate-400 font-normal">(Opt)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      id="mrp"
                      step="0.01"
                      min="0"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      className="block w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !medicineId || !expiryDate || !quantity}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Adding Stock...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
