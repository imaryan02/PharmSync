import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, Pill, Building2, Beaker, Tag, IndianRupee } from 'lucide-react';

export default function EditMedicine() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [name, setName] = useState('');
  const [composition, setComposition] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');
  const [mrp, setMrp] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    if (id && user) {
      fetchMedicine();
    }
  }, [id, user]);

  const fetchMedicine = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name);
        setComposition(data.composition || '');
        setCompany(data.company || '');
        setCategory(data.category || '');
        setMrp(data.mrp ? data.mrp.toString() : '');
      }
    } catch (err: any) {
      showError('Failed to fetch medicine details');
      navigate('/medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id) return;
    
    setSubmitting(true);

    try {
      // Basic duplicate check excluding current ID
      const { data: existing } = await supabase
        .from('medicines')
        .select('id')
        .eq('owner_id', user?.id)
        .ilike('name', name.trim())
        .neq('id', id)
        .single();

      if (existing) {
        throw new Error('Another medicine with this name already exists.');
      }

      await performUpdate();

    } catch (err: any) {
      if (err.code === 'PGRST116') {
         // No rows returned from duplicate check (meaning it's safe to update)
         await performUpdate();
      } else {
        showError(err.message || 'Failed to update medicine');
        setSubmitting(false);
      }
    }
  };

  const performUpdate = async () => {
    try {
      const { error: updateError } = await supabase
        .from('medicines')
        .update({
          name: name.trim(),
          composition: composition.trim() || null,
          company: company.trim() || null,
          category: category.trim() || null,
          mrp: mrp ? parseFloat(mrp) : null,
        })
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (updateError) throw updateError;

      showSuccess('Medicine updated successfully!');
      navigate('/medicines');
    } catch (err: any) {
      showError(err.message || 'Failed to update medicine');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <h1 className="text-xl font-bold text-slate-900">Edit Medicine</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">

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
                      placeholder="e.g. Tablet, Syrup"
                    />
                  </div>
                </div>
              </div>

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
                  disabled={submitting || !name.trim()}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Updating...' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
