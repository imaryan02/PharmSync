import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { ArrowLeft, Store, MapPin } from 'lucide-react';

export default function CreateStore() {
  const { user } = useAuth();
  const { setActiveStore } = useStore();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      const { data, error: insertError } = await supabase
        .from('clinics')
        .insert({
          name: name.trim(),
          address: address.trim() || null,
          owner_id: currentUser?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        showSuccess('Store created successfully!');
        setActiveStore(data);
        navigate('/dashboard');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to create store');
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
          <h1 className="text-xl font-bold text-slate-900">Create New Store</h1>
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
                  disabled={loading || !name.trim()}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
