import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Order } from '../types';
import { ArrowLeft, ShoppingBag, Search, ChevronRight } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && activeStore) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user, activeStore]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('clinic_id', activeStore?.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  if (!activeStore) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Store Selected</h2>
          <p className="text-slate-600 mb-6">
            Please select an active store from the dashboard to view orders.
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

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Orders</h1>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-400 mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No orders found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              You haven't created any orders yet.
            </p>
            <Link
              to="/orders/new"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Order
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const date = new Date(order.created_at);
              const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      {order.status === 'refunded' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
                          Refunded
                        </span>
                      )}
                      {order.status === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-medium">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-bold text-slate-900">
                      ₹{order.total_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div>
                      {formattedDate} at {formattedTime}
                    </div>
                    <div className="flex items-center text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
