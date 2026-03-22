import React, { useState } from 'react';
import { Inventory } from '../types';
import { ChevronDown, ChevronUp, Pill, Building2 } from 'lucide-react';
import BatchList from './BatchList';

interface InventoryItemProps {
  item: Inventory;
  key?: string | number;
}

export default function InventoryItem({ item }: InventoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const medicine = item.medicines;

  if (!medicine) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      <div 
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Pill className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate">{medicine.name}</h3>
            {medicine.company && (
              <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{medicine.company}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 pl-4 shrink-0">
          <div className="text-right">
            <span className="block text-2xl font-bold text-slate-900 leading-none">
              {item.total_quantity}
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total
            </span>
          </div>
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <BatchList clinicId={item.clinic_id} medicineId={item.medicine_id} />
      )}
    </div>
  );
}
