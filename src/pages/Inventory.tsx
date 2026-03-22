import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Inventory } from '../types';
import InventoryItem from '../components/InventoryItem';
import SearchBar from '../components/SearchBar';
import { ArrowLeft, Package, Plus, AlertCircle } from 'lucide-react';

export default function InventoryPage() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && activeStore) {
      fetchInventory();
    } else {
      setLoading(false);
    }
  }, [user, activeStore]);

  const fetchInventory = async () => {
    setLoading(true);
    // Fetch inventory with joined medicine data
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        medicines (
          id,
          name,
          company,
          composition
        )
      `)
      .eq('clinic_id', activeStore?.id)
      .gt('total_quantity', 0)
      .order('total_quantity', { ascending: false });
    
    if (!error && data) {
      setInventory(data as Inventory[]);
    }
    setLoading(false);
  };

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    
    const query = searchQuery.toLowerCase();
    return inventory.filter((item) => {
      const med = item.medicines;
      if (!med) return false;
      
      const matchName = med.name.toLowerCase().includes(query);
      const matchCompany = med.company?.toLowerCase().includes(query);
      const matchComposition = med.composition?.toLowerCase().includes(query);
      
      return matchName || matchCompany || matchComposition;
    });
  }, [inventory, searchQuery]);

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-600 mb-6">
            Please select an active store from the dashboard to view inventory.
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

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
            </div>
            <Link
              to="/stock-entry"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Stock
            </Link>
          </div>
          <div className="pb-4">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search inventory..." 
            />
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-400 mb-4">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No inventory found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Your inventory is empty. Add stock to start tracking your medicines.
            </p>
            <Link
              to="/stock-entry"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Stock
            </Link>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No inventory matches your search.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 font-medium hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInventory.map((item) => (
              <InventoryItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 sm:hidden z-20">
        <Link
          to="/stock-entry"
          className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
