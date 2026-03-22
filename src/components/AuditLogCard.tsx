import React from 'react';
import { AuditLog } from '../types';
import { Activity, PackagePlus, PackageMinus, ShoppingCart, RefreshCcw, User, Tag, Clock } from 'lucide-react';

interface AuditLogCardProps {
  log: AuditLog;
  key?: React.Key;
}

export default function AuditLogCard({ log }: AuditLogCardProps) {
  // Try to parse metadata if it comes back as string from Supabase
  let meta = log.metadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = null;
    }
  }

  const getIcon = () => {
    switch (log.action) {
      case 'Stock adjusted':
        if (meta?.type === 'Increase') return <PackagePlus className="h-5 w-5 text-blue-500" />;
        return <PackageMinus className="h-5 w-5 text-red-500" />;
      case 'Order created':
        return <ShoppingCart className="h-5 w-5 text-emerald-500" />;
      case 'Refund processed':
        return <RefreshCcw className="h-5 w-5 text-amber-500" />;
      case 'Stock entry created':
        return <PackagePlus className="h-5 w-5 text-indigo-500" />;
      default:
        return <Activity className="h-5 w-5 text-slate-500" />;
    }
  };

  const getActorBadge = () => {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
        <User className="h-3 w-3" />
        {log.actor_type}
      </div>
    );
  };

  return (
    <div className="bg-white border text-left border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-4">
      <div className="mt-1 bg-slate-50 p-2 rounded-lg shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-base font-semibold text-slate-900 truncate">{log.action}</h3>
          <span className="shrink-0 text-xs text-slate-500 flex items-center gap-1 relative top-1">
            <Clock className="h-3 w-3" />
            {new Date(log.created_at).toLocaleString([], {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
          <div className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Tag className="h-3 w-3" />
            {log.entity_type}
          </div>
          <span className="text-slate-300">•</span>
          {getActorBadge()}
        </div>

        {meta && (
          <div className="mt-2 bg-slate-50 rounded bg-opacity-50 p-2 text-xs text-slate-600 border border-slate-100">
            {meta.reason && <p><strong className="font-medium text-slate-700">Reason:</strong> {meta.reason}</p>}
            {meta.quantity_change !== undefined && (
              <p><strong className="font-medium text-slate-700">Change:</strong> {meta.quantity_change > 0 ? '+' : ''}{meta.quantity_change}</p>
            )}
            {meta.medicine_name && <p><strong className="font-medium text-slate-700">Item:</strong> {meta.medicine_name}</p>}
            {meta.amount !== undefined && <p><strong className="font-medium text-slate-700">Amount:</strong> ₹{meta.amount}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
