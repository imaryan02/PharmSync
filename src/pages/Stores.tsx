import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { Clinic } from '../types';
import StoreCard from '../components/StoreCard';
import { Plus, Store as StoreIcon, ArrowLeft } from 'lucide-react';

export default function Stores() {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const { activeStore, setActiveStore } = useStore();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  const fetchStores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('owner_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setStores(data);
    }
    setLoading(false);
  };

  const handleSelectStore = (store: Clinic) => {
    setActiveStore(store);
    navigate('/dashboard');
  };

  const handleEdit = (e: React.MouseEvent, store: Clinic) => {
    e.stopPropagation();
    navigate(`/stores/${store.id}/edit`);
  };

  const handleDelete = async (e: React.MouseEvent, store: Clinic) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      setLoading(true);
      const { error } = await supabase.from('clinics').delete().eq('id', store.id);
      
      if (error) {
        showError(error.message || 'Failed to delete store');
      } else {
        showSuccess('Store deleted successfully');
        if (activeStore?.id === store.id) {
          setActiveStore(null);
        }
        fetchStores();
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Your Stores</h1>
          </div>
          <Link
            to="/stores/new"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Store
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <StoreIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No stores found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Get started by creating your first pharmacy store location.
            </p>
            <Link
              to="/stores/new"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Store
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                isActive={activeStore?.id === store.id}
                onClick={() => handleSelectStore(store)}
                onEdit={(e) => handleEdit(e, store)}
                onDelete={(e) => handleDelete(e, store)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Add FAB */}
      <div className="fixed bottom-24 right-5 sm:hidden z-20">
        <Link
          to="/stores/new"
          className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
