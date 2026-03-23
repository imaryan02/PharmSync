import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Order } from '../types';

interface OrderListItemProps {
  order: Order;
  key?: string | number;
}

export default function OrderListItem({ order }: OrderListItemProps) {
  const parseDBDate = (isoStr: string) => {
    if (!isoStr) return new Date();
    return new Date(isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z');
  };

  const date = parseDBDate(order.created_at);
  const formattedTime = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const formattedDate = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow group mb-3 last:mb-0"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-slate-900">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          {order.status === 'refunded' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
              Refunded
            </span>
          )}
          {order.status === 'cancelled' && (
            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
              Cancelled
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {formattedDate} at {formattedTime}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-base font-bold text-slate-900">
          ₹{(Number(order.final_amount) || Number(order.total_amount) || 0).toFixed(2)}
        </span>
        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
      </div>
    </Link>
  );
}
