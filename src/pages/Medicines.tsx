import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Medicine } from '../types';
import MedicineCard from '../components/MedicineCard';
import SearchBar from '../components/SearchBar';
import { Plus, Pill, ArrowLeft, Filter, ArrowUpDown } from 'lucide-react';

type SortOption = 'name_asc' | 'name_desc' | 'newest';

export default function Medicines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');

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
      .order('created_at', { ascending: false }); // Fetch by creation time, sort later
    
    if (!error && data) {
      setMedicines(data);
    }
    setLoading(false);
  };

  // Extract unique types from medicines for filter tabs
  const medicineTypes = useMemo(() => {
    const types = new Set(medicines.map(m => m.type).filter(Boolean) as string[]);
    return ['All', ...Array.from(types).sort()];
  }, [medicines]);

  // Process data (Search -> Filter by Type -> Sort)
  const filteredMedicines = useMemo(() => {
    let result = [...medicines];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((med) => {
        const matchName = med.name.toLowerCase().includes(q);
        const matchCompany = med.company?.toLowerCase().includes(q);
        const matchComposition = med.composition?.toLowerCase().includes(q);
        const matchAliases = med.aliases?.some(alias => alias.toLowerCase().includes(q));
        
        return matchName || matchCompany || matchComposition || matchAliases;
      });
    }

    // 2. Filter by Type
    if (activeType !== 'All') {
      result = result.filter(med => med.type === activeType);
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'newest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [medicines, searchQuery, activeType, sortBy]);

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
    <div className="w-full flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* ── Fixed Header Section ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          
          {/* Top Bar: Title & Action */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/dashboard')} 
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Medicine Catalog</h1>
                {!loading && (
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {medicines.length} total items
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/medicines/new"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl shadow-sm shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Medicine
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search by name, generic, company, composition..." 
            />
          </div>

          {/* Filters & Sorting Tools */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Horizontal Scrollable Type Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 sm:pb-0 sm:mb-0 hide-scrollbar flex-1 mask-fade-right pr-4">
              <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block mr-1" />
              {medicineTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                    activeType === type 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 shadow-sm py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-sm font-semibold text-slate-700 border-none focus:ring-0 py-0 pl-1.5 pr-6 cursor-pointer outline-none w-full"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="newest">Newest Added</option>
                </select>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
            <p className="text-sm font-semibold text-slate-400">Loading catalog...</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500 mb-5 border-4 border-blue-100">
              <Pill className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No medicines found</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
              Your medicine master list is completely empty. Add your first medicine to start building your catalog.
            </p>
            <Link
              to="/medicines/new"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add First Medicine
            </Link>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No matches found</h3>
            <p className="text-slate-500 text-sm mb-6">Could not find any medicines matching your filters.</p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveType('All'); setSortBy('name_asc'); }}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-blue-600 bg-blue-50 border border-transparent hover:border-blue-100 hover:bg-blue-100 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2">
              Showing {filteredMedicines.length} results
            </p>
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

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-right {
          -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
      `}</style>
    </div>
  );
}
