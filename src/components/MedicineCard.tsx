import React from 'react';
import { Medicine } from '../types';
import { Pill, Building2, Beaker, Edit2, Trash2 } from 'lucide-react';

interface MedicineCardProps {
  medicine: Medicine;
  onEdit: () => void;
  onDelete: () => void;
  key?: string | number;
}

export default function MedicineCard({ medicine, onEdit, onDelete }: MedicineCardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
          <Pill className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 min-w-0">
            <h3 className="font-bold text-slate-900 truncate text-lg pr-2 flex-1 min-w-0">{medicine.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {medicine.mrp && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium whitespace-nowrap">
                  ₹{medicine.mrp}
                </span>
              )}
              <div className="flex items-center border-l pl-2 ml-1 border-slate-200 gap-1">
                <button
                  onClick={onEdit}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit Medicine"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete Medicine"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {medicine.company && (
            <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-sm min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1 min-w-0">{medicine.company}</span>
            </div>
          )}
          
          {medicine.composition && (
            <div className="flex items-start gap-1.5 mt-1.5 text-slate-500 text-sm min-w-0">
              <Beaker className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-snug flex-1 min-w-0">{medicine.composition}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
