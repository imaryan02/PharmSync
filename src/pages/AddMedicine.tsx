import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, Pill, Building2, Beaker, Tag, IndianRupee, Layers, Package, GitBranch } from 'lucide-react';

const MEDICINE_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Other'];
const PACK_SIZE_SUGGESTIONS = ['1x10', '1x1', '1x30', '2x10', '3x10', '100ml', '60ml', '200ml', '30ml'];

export default function AddMedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [composition, setComposition] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');
  const [mrp, setMrp] = useState('');
  const [type, setType] = useState('');
  const [packSize, setPackSize] = useState('');
  const [division, setDivision] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type || !packSize.trim()) return;
    
    setLoading(true);

    try {
      // Duplicate check — use .maybeSingle() so no 406 when medicine doesn't exist
      const { data: existing } = await supabase
        .from('medicines')
        .select('id')
        .eq('owner_id', user?.id)
        .ilike('name', name.trim())
        .maybeSingle();

      if (existing) {
        throw new Error('A medicine with this name already exists.');
      }

      const { error: insertError } = await supabase
        .from('medicines')
        .insert([
          {
            name: name.trim(),
            composition: composition.trim() || null,
            company: company.trim() || null,
            category: category.trim() || null,
            mrp: mrp ? parseFloat(mrp) : null,
            type: type || null,
            pack_size: packSize.trim() || null,
            division: division.trim() || null,
            owner_id: user?.id,
          }
        ]);

      if (insertError) throw insertError;

      // Audit log
      try {
        await supabase.from('audit_logs').insert([{
          action: 'Medicine added',
          entity_type: 'medicines',
          user_id: user?.id,
          actor_type: 'owner',
          metadata: { medicine_name: name.trim(), type, pack_size: packSize.trim() }
        }]);
      } catch (auditErr) {
        console.warn('Audit log skipped:', auditErr);
      }

      showSuccess('Medicine added successfully!');
      navigate('/medicines');
    } catch (err: any) {
      showError(err.message || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Add Medicine</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Medicine Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Pill className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="e.g. Paracetamol 500mg"
                  />
                </div>
              </div>

              {/* Composition */}
              <div>
                <label htmlFor="composition" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Composition <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                    <Beaker className="h-5 w-5 text-slate-400" />
                  </div>
                  <textarea
                    id="composition"
                    rows={2}
                    value={composition}
                    onChange={(e) => setComposition(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors resize-none"
                    placeholder="e.g. Paracetamol (500mg)"
                  />
                </div>
              </div>

              {/* Type + Pack Size (2-column row) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Medicine Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Layers className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      id="type"
                      required
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white appearance-none"
                    >
                      <option value="">Select type…</option>
                      {MEDICINE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="packSize" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Pack Size <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="packSize"
                      required
                      list="packSizeSuggestions"
                      value={packSize}
                      onChange={(e) => setPackSize(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="e.g. 1x10, 1x1, 100ml, 60ml"
                    />
                    <datalist id="packSizeSuggestions">
                      {PACK_SIZE_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Company + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Company <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="e.g. GSK"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Category <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="e.g. Analgesic, Antibiotic"
                    />
                  </div>
                </div>
              </div>

              {/* Division */}
              <div>
                <label htmlFor="division" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Division <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GitBranch className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="division"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="e.g. General, Pediatric, Cardio"
                  />
                </div>
              </div>

              {/* MRP */}
              <div>
                <label htmlFor="mrp" className="block text-sm font-medium text-slate-700 mb-1.5">
                  MRP (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    id="mrp"
                    step="0.01"
                    min="0"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !type || !packSize.trim()}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
