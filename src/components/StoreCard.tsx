import React from 'react';
import { Clinic } from '../types';
import { Store, MapPin, CheckCircle2, Edit2, Trash2 } from 'lucide-react';

interface StoreCardProps {
  store: Clinic;
  isActive: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  key?: string | number;
}

export default function StoreCard({ store, isActive, onClick, onEdit, onDelete }: StoreCardProps) {
  return (
    <div
      className={`w-full relative p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isActive 
          ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/30' 
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div 
        className="flex-1 text-left cursor-pointer flex items-start gap-4"
        onClick={onClick}
      >
        <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          <Store className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-lg ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>
              {store.name}
            </h3>
            {isActive && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
          </div>
          {store.address && (
            <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{store.address}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Edit Store"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete Store"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
