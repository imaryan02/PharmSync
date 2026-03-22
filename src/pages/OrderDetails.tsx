import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Order, OrderItem, Medicine } from '../types';
import { ArrowLeft, RefreshCcw, AlertCircle, ShoppingBag, Calendar, Clock, Receipt } from 'lucide-react';

interface OrderItemWithMedicine extends OrderItem {
  medicines: Medicine;
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && activeStore && id) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [user, activeStore, id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('clinic_id', activeStore?.id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');
      setOrder(orderData as Order);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          medicines (
            id,
            name,
            company,
            composition
          )
        `)
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData as OrderItemWithMedicine[]);
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-600 mb-6">
            Please select an active store from the dashboard to view order details.
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

  if (error || !order) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center border-dashed">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
          <p className="text-slate-600 mb-6">
            {error || "The order you are looking for does not exist or you don't have permission to view it."}
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const orderDate = new Date(order.created_at);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/orders')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Order Details</h1>
          </div>
          {order.status !== 'refunded' && order.status !== 'cancelled' && (
            <Link
              to={`/orders/${order.id}/refund`}
              className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" />
              Refund
            </Link>
          )}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Order Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-400" />
              <span className="font-semibold text-slate-900 text-lg">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-bold text-slate-900">
                ₹{order.total_amount.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Amount
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              {orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              {orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="col-span-2 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Status:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                order.status === 'active' ? 'bg-green-100 text-green-700' :
                order.status === 'refunded' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 px-1">
          Items Ordered
        </h3>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-base truncate">{item.medicines.name}</h4>
                {item.medicines.company && (
                  <p className="text-xs text-slate-500 truncate">{item.medicines.company}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                  <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                    Qty: {item.quantity}
                  </span>
                  <span>@ ₹{item.selling_price.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="block font-bold text-slate-900 text-lg">
                  ₹{(item.quantity * item.selling_price).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar for Refund */}
      {order.status !== 'refunded' && order.status !== 'cancelled' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 sm:hidden">
          <div className="max-w-3xl mx-auto">
            <Link
              to={`/orders/${order.id}/refund`}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
            >
              <RefreshCcw className="h-5 w-5 mr-2" />
              Refund Items
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
