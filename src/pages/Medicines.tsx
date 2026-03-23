import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Medicine } from '../types';
import MedicineCard from '../components/MedicineCard';
import SearchBar from '../components/SearchBar';
import { Plus, Pill, ArrowLeft } from 'lucide-react';

export default function Medicines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredMedicines = useMemo(() => {
    if (!searchQuery.trim()) return medicines;
    
    const query = searchQuery.toLowerCase();
    return medicines.filter((med) => {
      const matchName = med.name.toLowerCase().includes(query);
      const matchCompany = med.company?.toLowerCase().includes(query);
      const matchComposition = med.composition?.toLowerCase().includes(query);
      const matchAliases = med.aliases?.some(alias => alias.toLowerCase().includes(query));
      
      return matchName || matchCompany || matchComposition || matchAliases;
    });
  }, [medicines, searchQuery]);

  const handleEdit = (medicine: Medicine) => {
    navigate(`/medicines/${medicine.id}/edit`);
  };

  const handleDelete = async (medicine: Medicine) => {
    if (window.confirm(`Are you sure you want to delete ${medicine.name}?`)) {
      setLoading(true);
      const { error } = await supabase.from('medicines').delete().eq('id', medicine.id);
      if (error) {
        showError(error.message || 'Failed to delete medicine');
      } else {
        showSuccess('Medicine deleted successfully');
        fetchMedicines();
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-900">Medicines Master</h1>
            </div>
            <Link
              to="/medicines/new"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Medicine
            </Link>
          </div>
          <div className="pb-4">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search by name, composition, company..." 
            />
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-400 mb-4">
              <Pill className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No medicines found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Your medicine master list is empty. Add your first medicine to get started.
            </p>
            <Link
              to="/medicines/new"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Medicine
            </Link>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No medicines match your search.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 font-medium hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMedicines.map((medicine) => (
              <MedicineCard 
                key={medicine.id} 
                medicine={medicine} 
                onEdit={() => handleEdit(medicine)}
                onDelete={() => handleDelete(medicine)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Add FAB */}
      <div className="fixed bottom-24 right-5 sm:hidden z-20">
        <Link
          to="/medicines/new"
          className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
