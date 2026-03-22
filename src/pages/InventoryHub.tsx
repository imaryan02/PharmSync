import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { Inventory, Medicine } from '../types';
import InventoryItem from '../components/InventoryItem';
import MedicineCard from '../components/MedicineCard';
import SearchBar from '../components/SearchBar';
import { Plus, Package, Pill, AlertCircle, ArrowLeft } from 'lucide-react';

type Tab = 'stock' | 'medicines';

export default function InventoryHub() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { error: showError, success: showSuccess } = useToast();

  const activeTab: Tab = (searchParams.get('tab') as Tab) || 'stock';
  const setTab = (tab: Tab) => setSearchParams({ tab });

  // --- Stock Tab State ---
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invSearch, setInvSearch] = useState('');

  // --- Medicines Tab State ---
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medLoading, setMedLoading] = useState(true);
  const [medSearch, setMedSearch] = useState('');

  // Fetch inventory whenever store changes
  useEffect(() => {
    if (user && activeStore) {
      fetchInventory();
    } else {
      setInvLoading(false);
    }
  }, [user, activeStore]);

  // Fetch medicines whenever user changes
  useEffect(() => {
    if (user) {
      fetchMedicines();
    } else {
      setMedLoading(false);
    }
  }, [user]);

  const fetchInventory = async () => {
    setInvLoading(true);
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

    if (!error && data) setInventory(data as Inventory[]);
    setInvLoading(false);
  };

  const fetchMedicines = async () => {
    setMedLoading(true);
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('owner_id', user?.id)
      .order('name', { ascending: true });

    if (!error && data) setMedicines(data);
    setMedLoading(false);
  };

  const handleEditMedicine = (medicine: Medicine) => {
    navigate(`/medicines/${medicine.id}/edit`);
  };

  const handleDeleteMedicine = async (medicine: Medicine) => {
    if (!window.confirm(`Delete "${medicine.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('medicines').delete().eq('id', medicine.id);
    if (error) {
      showError(error.message || 'Failed to delete medicine');
    } else {
      showSuccess('Medicine deleted');
      fetchMedicines();
    }
  };

  const filteredInventory = useMemo(() => {
    if (!invSearch.trim()) return inventory;
    const q = invSearch.toLowerCase();
    return inventory.filter(item => {
      const med = item.medicines;
      if (!med) return false;
      return (
        med.name.toLowerCase().includes(q) ||
        med.company?.toLowerCase().includes(q) ||
        med.composition?.toLowerCase().includes(q)
      );
    });
  }, [inventory, invSearch]);

  const filteredMedicines = useMemo(() => {
    if (!medSearch.trim()) return medicines;
    const q = medSearch.toLowerCase();
    return medicines.filter(med =>
      med.name.toLowerCase().includes(q) ||
      med.company?.toLowerCase().includes(q) ||
      med.composition?.toLowerCase().includes(q)
    );
  }, [medicines, medSearch]);

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-transparent mt-2 mb-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
            </div>

            {/* Action button changes based on active tab */}
            {activeTab === 'stock' ? (
              <Link
                to="/stock-entry"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Stock
              </Link>
            ) : (
              <Link
                to="/medicines/new"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Medicine
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setTab('stock')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'stock'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="h-4 w-4" />
            Stock
            {inventory.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'stock' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {inventory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('medicines')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'medicines'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className="h-4 w-4" />
            Medicines
            {medicines.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'medicines' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {medicines.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24">

        {/* ====== STOCK TAB ====== */}
        {activeTab === 'stock' && (
          <>
            {!activeStore ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
                <p className="text-slate-600 mb-6">Please select an active store from the dashboard.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : invLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-400 mb-4">
                  <Package className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No inventory yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Add stock to start tracking your medicines.
                </p>
                <Link
                  to="/stock-entry"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Stock
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <SearchBar value={invSearch} onChange={setInvSearch} placeholder="Search stock..." />
                </div>
                {filteredInventory.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No matches found.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredInventory.map(item => (
                      <InventoryItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ====== MEDICINES TAB ====== */}
        {activeTab === 'medicines' && (
          <>
            {medLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : medicines.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-400 mb-4">
                  <Pill className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No medicines yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Add your first medicine to the master list to get started.
                </p>
                <Link
                  to="/medicines/new"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Medicine
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <SearchBar value={medSearch} onChange={setMedSearch} placeholder="Search by name, company, composition..." />
                </div>
                {filteredMedicines.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No matches found.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredMedicines.map(medicine => (
                      <MedicineCard
                        key={medicine.id}
                        medicine={medicine}
                        onEdit={() => handleEditMedicine(medicine)}
                        onDelete={() => handleDeleteMedicine(medicine)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 sm:hidden z-20">
        {activeTab === 'stock' ? (
          <Link
            to="/stock-entry"
            className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </Link>
        ) : (
          <Link
            to="/medicines/new"
            className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}
      </div>
    </div>
  );
}
