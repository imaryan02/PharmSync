import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { Clinic } from '../types';
import { Store, ChevronDown } from 'lucide-react';

export default function StoreSelector() {
  const { activeStore, setActiveStore } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Clinic[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('owner_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setStores(data);
      if (!activeStore && data.length > 0) {
        setActiveStore(data[0]);
      } else if (activeStore && !data.find(s => s.id === activeStore.id)) {
        setActiveStore(data.length > 0 ? data[0] : null);
      }
    }
  };

  if (stores.length === 0) return null;

  return (
    <div className="relative ml-2 sm:ml-0 flex-1 min-w-0 sm:flex-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors w-full"
      >
        <Store className="h-4 w-4 text-slate-500 shrink-0" />
        <span className="text-sm font-bold text-slate-800 truncate text-left w-full sm:w-auto sm:max-w-[200px]">
          {activeStore?.name || 'Select Store'}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-auto sm:ml-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/5 sm:bg-transparent" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-32px)] sm:w-64 max-w-sm bg-white rounded-xl shadow-xl shadow-black/5 border border-slate-100 z-50 py-1 overflow-hidden origin-top-left sm:origin-top-right">
            <div className="px-3 py-2 border-b border-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Stores</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    setActiveStore(store);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 ${activeStore?.id === store.id ? 'bg-blue-50/50 text-blue-700 font-medium' : 'text-slate-700'}`}
                >
                  <Store className={`h-4 w-4 ${activeStore?.id === store.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{store.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-50 p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/stores');
                }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
              >
                Manage Stores
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
