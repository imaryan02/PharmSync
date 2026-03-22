import React, { useState, useRef, useEffect } from 'react';
import { Medicine } from '../types';
import { Search, ChevronDown, Check } from 'lucide-react';

interface MedicineDropdownProps {
  medicines: Medicine[];
  value: string;
  onChange: (medicineId: string) => void;
}

export default function MedicineDropdown({ medicines, value, onChange }: MedicineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMedicine = medicines.find(m => m.id === value);

  const filteredMedicines = medicines.filter(med => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      med.name.toLowerCase().includes(query) ||
      med.company?.toLowerCase().includes(query) ||
      med.composition?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-300 rounded-xl pl-4 pr-10 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors flex items-center justify-between"
      >
        <span className={`block truncate ${!selectedMedicine ? 'text-slate-400' : 'text-slate-900'}`}>
          {selectedMedicine ? (
            <span className="flex flex-col">
              <span className="font-medium">{selectedMedicine.name}</span>
              {selectedMedicine.company && (
                <span className="text-xs text-slate-500">{selectedMedicine.company}</span>
              )}
            </span>
          ) : (
            'Select a medicine...'
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-slate-50"
                placeholder="Search medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {filteredMedicines.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No medicines found.
            </div>
          ) : (
            <ul className="py-1">
              {filteredMedicines.map((med) => (
                <li
                  key={med.id}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-slate-50 ${
                    value === med.id ? 'bg-blue-50 text-blue-900' : 'text-slate-900'
                  }`}
                  onClick={() => {
                    onChange(med.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <div className="flex flex-col">
                    <span className={`block truncate ${value === med.id ? 'font-semibold' : 'font-medium'}`}>
                      {med.name}
                    </span>
                    {med.company && (
                      <span className={`block truncate text-xs ${value === med.id ? 'text-blue-700' : 'text-slate-500'}`}>
                        {med.company}
                      </span>
                    )}
                  </div>
                  {value === med.id && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                      <Check className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
