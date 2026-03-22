import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Inventory } from '../types';
import { Search, Plus, Package } from 'lucide-react';

interface MedicineSearchProps {
  inventory: Inventory[];
  onAdd: (item: Inventory) => void;
}

export default function MedicineSearch({ inventory, onAdd }: MedicineSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return inventory.filter(item => {
      const med = item.medicines;
      if (!med) return false;
      return (
        med.name.toLowerCase().includes(q) ||
        med.company?.toLowerCase().includes(q) ||
        med.composition?.toLowerCase().includes(q)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [inventory, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white shadow-sm"
          placeholder="Search medicines to add..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-60 sm:text-sm">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No matching medicines in stock.
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((item) => {
                const med = item.medicines!;
                return (
                  <li
                    key={item.id}
                    className="cursor-pointer select-none relative py-2 pl-3 pr-4 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    onClick={() => {
                      onAdd(item);
                      setQuery('');
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="font-semibold text-slate-900 truncate">
                          {med.name}
                        </span>
                        {med.company && (
                          <span className="text-xs text-slate-500 truncate">
                            {med.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block text-sm font-bold text-slate-700">
                            {item.total_quantity}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                            In Stock
                          </span>
                        </div>
                        <button className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                          <Plus className="h-4 w-4" />
                        </button>
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
