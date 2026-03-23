import React, { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Inventory } from '../types';
import { Search, Plus } from 'lucide-react';

interface MedicineSearchProps {
  inventory: Inventory[];
  onAdd: (item: Inventory) => void;
}

export interface MedicineSearchHandle {
  focus: () => void;
}

const MedicineSearch = forwardRef<MedicineSearchHandle, MedicineSearchProps>(
  function MedicineSearch({ inventory, onAdd }, ref) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const filtered = useMemo(() => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return inventory
        .filter((item) => {
          const med = item.medicines;
          if (!med) return false;
          return (
            med.name.toLowerCase().includes(q) ||
            med.company?.toLowerCase().includes(q) ||
            med.composition?.toLowerCase().includes(q)
          );
        })
        .slice(0, 8);
    }, [inventory, query]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (item: Inventory) => {
      onAdd(item);
      setQuery('');
      setIsOpen(false);
      // re-focus for rapid adding
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && filtered.length === 1) {
        handleSelect(filtered[0]);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    return (
      <div className="relative" ref={wrapperRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500 text-base font-medium bg-white shadow-sm transition-colors placeholder:text-slate-400"
            placeholder="Search medicines..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => query.trim() && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </div>

        {isOpen && query.trim() && (
          <div className="absolute z-30 mt-2 w-full bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100 max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500 text-center">
                No matching medicines in stock.
              </div>
            ) : (
              <ul>
                {filtered.map((item) => {
                  const med = item.medicines!;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-blue-50 active:bg-blue-100 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                      onClick={() => handleSelect(item)}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="font-semibold text-slate-900 text-sm leading-snug truncate">
                          {med.name}
                        </span>
                        {med.company && (
                          <span className="text-xs text-slate-400 truncate">{med.company}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className="block text-sm font-bold text-slate-800">{item.total_quantity}</span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">in stock</span>
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
);

export default MedicineSearch;
