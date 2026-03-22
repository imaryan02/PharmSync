import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { Inventory, Batch } from '../types';
import MedicineSearch from '../components/MedicineSearch';
import CartItem, { CartItemType } from '../components/CartItem';
import { ArrowLeft, AlertCircle, ShoppingCart, CheckCircle2 } from 'lucide-react';

export default function CreateOrder() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const [cart, setCart] = useState<CartItemType[]>([]);

  useEffect(() => {
    if (user && activeStore) {
      fetchInventory();
    } else {
      setLoading(false);
    }
  }, [user, activeStore]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        medicines (
          id,
          name,
          company,
          mrp
        )
      `)
      .eq('clinic_id', activeStore?.id)
      .gt('total_quantity', 0);

    if (!error && data) {
      setInventory(data as Inventory[]);
    }
    setLoading(false);
  };

  const handleAddToCart = (item: Inventory) => {
    const med = item.medicines!;
    const existing = cart.find(c => c.medicine_id === item.medicine_id);
    if (existing) {
      if (existing.quantity < item.total_quantity) {
        setCart(cart.map(c => 
          c.medicine_id === item.medicine_id 
            ? { ...c, quantity: c.quantity + 1 } 
            : c
        ));
      }
    } else {
      setCart([...cart, {
        inventory_id: item.id,
        medicine_id: item.medicine_id,
        name: med.name,
        company: med.company,
        available_quantity: item.total_quantity,
        quantity: 1,
        price: med.mrp || 0,
      }]);
    }
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setCart(cart.map(c => c.medicine_id === id ? { ...c, quantity: qty } : c));
  };

  const handleUpdatePrice = (id: string, price: number) => {
    setCart(cart.map(c => c.medicine_id === id ? { ...c, price: price } : c));
  };

  const handleRemove = (id: string) => {
    setCart(cart.filter(c => c.medicine_id !== id));
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [cart]);

  const handleSubmit = async () => {
    if (!activeStore || !user || cart.length === 0) return;
    
    // Validate cart
    for (const item of cart) {
      if (item.quantity <= 0 || item.quantity > item.available_quantity) {
        showError(`Invalid quantity for ${item.name}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          clinic_id: activeStore.id,
          created_by: user.id,
          total_amount: totalAmount,
          status: 'active'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Process each item
      for (const item of cart) {
        // Create order_item
        const { data: orderItemData, error: itemError } = await supabase
          .from('order_items')
          .insert([{
            order_id: orderData.id,
            medicine_id: item.medicine_id,
            quantity: item.quantity,
            selling_price: item.price
          }])
          .select()
          .single();

        if (itemError) throw itemError;

        // 3. Allocate batches (FEFO)
        const { data: batches, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('clinic_id', activeStore.id)
          .eq('medicine_id', item.medicine_id)
          .gt('quantity_remaining', 0)
          .order('expiry_date', { ascending: true });

        if (batchError) throw batchError;

        let remainingToAllocate = item.quantity;
        
        for (const batch of (batches as Batch[])) {
          if (remainingToAllocate <= 0) break;

          const allocateQty = Math.min(batch.quantity_remaining, remainingToAllocate);
          
          // Create order_batch
          const { error: obError } = await supabase
            .from('order_batches')
            .insert([{
              order_item_id: orderItemData.id,
              batch_id: batch.id,
              quantity: allocateQty
            }]);

          if (obError) throw obError;

          // Deduct from batch
          const { error: updateBatchError } = await supabase
            .from('batches')
            .update({ quantity_remaining: batch.quantity_remaining - allocateQty })
            .eq('id', batch.id);

          if (updateBatchError) throw updateBatchError;

          remainingToAllocate -= allocateQty;
        }

        if (remainingToAllocate > 0) {
          throw new Error(`Not enough stock for ${item.name}`);
        }

        // 4. Update inventory total
        const { error: invError } = await supabase
          .from('inventory')
          .update({ total_quantity: item.available_quantity - item.quantity })
          .eq('id', item.inventory_id);

        if (invError) throw invError;
      }

      showSuccess('Order created successfully!');
      setCart([]);
      fetchInventory(); // Refresh stock

    } catch (err: any) {
      console.error('Order creation error:', err);
      showError(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-600 mb-6">
            Please select an active store from the dashboard to create orders.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center border-dashed">
          <ShoppingCart className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Stock Available</h2>
          <p className="text-slate-600 mb-6">
            You need to add stock to your inventory before you can create orders.
          </p>
          <Link
            to="/stock-entry"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Stock
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">New Order</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="mb-6">
          <MedicineSearch inventory={inventory} onAdd={handleAddToCart} />
        </div>

        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p>Search and add medicines to the cart to begin billing.</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem
                key={item.medicine_id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdatePrice={handleUpdatePrice}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-500">Total Amount</span>
              <span className="text-2xl font-bold text-slate-900">₹{totalAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 max-w-[200px] flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Processing...' : 'Create Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
