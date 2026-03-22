import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import { Inventory } from '../types';

interface LowStockListProps {
  items: Inventory[];
}

export default function LowStockList({ items }: LowStockListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-3">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">All Good!</h3>
        <p className="text-xs text-slate-500">No low stock items right now.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-bold">Low Stock Alerts</h3>
        </div>
        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md">
          {items.length} items
        </span>
      </div>
      <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="font-bold text-slate-900 text-sm truncate">
                {item.medicines?.name}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {item.medicines?.company || 'Unknown Company'}
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="block text-sm font-bold text-red-600">
                  {item.total_quantity}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Left
                </span>
              </div>
              <Link
                to="/stock-entry"
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                title="Add Stock"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
