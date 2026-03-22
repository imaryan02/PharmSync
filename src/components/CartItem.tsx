import React from 'react';
import { Trash2, Minus, Plus, IndianRupee } from 'lucide-react';

export interface CartItemType {
  inventory_id: string;
  medicine_id: string;
  name: string;
  company: string | null;
  available_quantity: number;
  quantity: number;
  price: number;
}

interface CartItemProps {
  item: CartItemType;
  key?: string | number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onUpdatePrice, onRemove }: CartItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      onUpdateQuantity(item.medicine_id, Math.min(val, item.available_quantity));
    } else if (e.target.value === '') {
      onUpdateQuantity(item.medicine_id, 0);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onUpdatePrice(item.medicine_id, val);
    } else if (e.target.value === '') {
      onUpdatePrice(item.medicine_id, 0);
    }
  };

  const increment = () => {
    if (item.quantity < item.available_quantity) {
      onUpdateQuantity(item.medicine_id, item.quantity + 1);
    }
  };

  const decrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.medicine_id, item.quantity - 1);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative group">
      <button
        onClick={() => onRemove(item.medicine_id)}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="pr-8 mb-3">
        <h4 className="font-bold text-slate-900 text-base">{item.name}</h4>
        {item.company && <p className="text-xs text-slate-500">{item.company}</p>}
        <p className="text-xs text-slate-400 mt-0.5">Stock: {item.available_quantity}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 w-fit">
          <button
            onClick={decrement}
            disabled={item.quantity <= 1}
            className="p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            min="1"
            max={item.available_quantity}
            value={item.quantity || ''}
            onChange={handleQuantityChange}
            className="w-12 text-center bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-slate-900"
          />
          <button
            onClick={increment}
            disabled={item.quantity >= item.available_quantity}
            className="p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-[120px]">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.price || ''}
              onChange={handlePriceChange}
              className="block w-full pl-7 pr-2 py-2 border border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors text-slate-900 font-medium"
              placeholder="Price"
            />
          </div>
          
          <div className="flex-1 text-right">
            <span className="text-xs text-slate-500 block mb-0.5">Total</span>
            <span className="font-bold text-slate-900 text-lg">
              ₹{(item.quantity * item.price).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
