import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { ArrowLeft, Store, MapPin } from 'lucide-react';

export default function EditStore() {
  const { user } = useAuth();
  const { activeStore, setActiveStore } = useStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    if (id && user) {
      fetchStore();
    }
  }, [id, user]);

  const fetchStore = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user?.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setName(data.name);
        setAddress(data.address || '');
      }
    } catch (err: any) {
      showError('Failed to fetch store details');
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id) return;
    
    setSubmitting(true);

    try {
      const { data, error: updateError } = await supabase
        .from('clinics')
        .update({
          name: name.trim(),
          address: address.trim() || null,
        })
        .eq('id', id)
        .eq('owner_id', user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (data) {
        showSuccess('Store updated successfully!');
        // Update global state if active
        if (activeStore?.id === id) {
          setActiveStore(data);
        }
        navigate('/stores');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update store');
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
          <h1 className="text-xl font-bold text-slate-900">Edit Store</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="e.g. City Pharmacy"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>
                  <textarea
                    id="address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors resize-none"
                    placeholder="Enter complete store address"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
