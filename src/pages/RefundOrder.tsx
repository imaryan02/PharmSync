import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { Order, OrderItem, Medicine, OrderBatch } from '../types';
import { ArrowLeft, RefreshCcw, AlertCircle, Minus, Plus, CheckCircle2 } from 'lucide-react';

interface OrderItemWithMedicine extends OrderItem {
  medicines: Medicine;
  refunded_quantity: number;
}

interface RefundState {
  [orderItemId: string]: number;
}

export default function RefundOrder() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [refundQuantities, setRefundQuantities] = useState<RefundState>({});
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user && activeStore && id) {
      fetchOrderAndRefunds();
    } else {
      setLoading(false);
    }
  }, [user, activeStore, id]);

  const fetchOrderAndRefunds = async () => {
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
            company
          )
        `)
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // Fetch existing refunds for this order
      const { data: refundsData, error: refundsError } = await supabase
        .from('refunds')
        .select('id')
        .eq('order_id', id);

      if (refundsError) throw refundsError;

      let refundItemsData: any[] = [];
      if (refundsData && refundsData.length > 0) {
        const refundIds = refundsData.map(r => r.id);
        const { data: riData, error: riError } = await supabase
          .from('refund_items')
          .select('order_item_id, quantity')
          .in('refund_id', refundIds);
          
        if (riError) throw riError;
        refundItemsData = riData || [];
      }

      // Calculate refunded quantities per order item
      const refundedMap: Record<string, number> = {};
      refundItemsData.forEach(ri => {
        refundedMap[ri.order_item_id] = (refundedMap[ri.order_item_id] || 0) + ri.quantity;
      });

      const processedItems = (itemsData as any[]).map(item => ({
        ...item,
        refunded_quantity: refundedMap[item.id] || 0
      }));

      setItems(processedItems);
      
      // Initialize refund state
      const initialRefundState: RefundState = {};
      processedItems.forEach(item => {
        initialRefundState[item.id] = 0;
      });
      setRefundQuantities(initialRefundState);

    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, qty: number, max: number) => {
    const validQty = Math.max(0, Math.min(qty, max));
    setRefundQuantities(prev => ({ ...prev, [itemId]: validQty }));
  };

  const totalRefundAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = refundQuantities[item.id] || 0;
      return sum + (qty * item.selling_price);
    }, 0);
  }, [items, refundQuantities]);

  const hasItemsToRefund = useMemo(() => {
    return Object.values(refundQuantities).some((qty) => (qty as number) > 0);
  }, [refundQuantities]);

  const handleSubmit = async () => {
    if (!activeStore || !user || !order || !hasItemsToRefund) return;
    
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Refund record
      const { data: refundData, error: refundError } = await supabase
        .from('refunds')
        .insert([{
          order_id: order.id,
          // created_by omitted — FK references employees table, not auth.users
          reason: reason.trim() || null
        }])
        .select()
        .single();

      if (refundError) throw refundError;

      // 2. Process each item being refunded
      for (const item of items) {
        const refundQty = refundQuantities[item.id];
        if (refundQty <= 0) continue;

        // Fetch order_batches for this item to know which batches to restore
        const { data: orderBatches, error: obError } = await supabase
          .from('order_batches')
          .select('*')
          .eq('order_item_id', item.id)
          .order('created_at', { ascending: false }); // Restore to most recently used batch first (LIFO for refunds)

        if (obError) throw obError;

        let remainingToRestore = refundQty;

        for (const ob of (orderBatches as OrderBatch[])) {
          if (remainingToRestore <= 0) break;

          // We can only restore up to what was taken from this batch in this order
          // Wait, we need to track how much of THIS order_batch has already been refunded.
          // For simplicity, we assume we just restore to the batch. 
          // A more robust system would track refunded qty per order_batch.
          // We'll restore up to ob.quantity.
          
          const restoreQty = Math.min(ob.quantity, remainingToRestore);

          // Insert refund_item
          const { error: riError } = await supabase
            .from('refund_items')
            .insert([{
              refund_id: refundData.id,
              batch_id: ob.batch_id,
              quantity: restoreQty,
              order_item_id: item.id
            }]);

          if (riError) throw riError;

          // Update batch quantity
          // First get current batch qty
          const { data: batchData, error: bError } = await supabase
            .from('batches')
            .select('quantity_remaining')
            .eq('id', ob.batch_id)
            .single();
            
          if (bError) throw bError;

          const { error: updateBatchError } = await supabase
            .from('batches')
            .update({ quantity_remaining: batchData.quantity_remaining + restoreQty })
            .eq('id', ob.batch_id);

          if (updateBatchError) throw updateBatchError;

          remainingToRestore -= restoreQty;
        }

        // Update inventory total
        const { data: invData, error: invFetchError } = await supabase
          .from('inventory')
          .select('id, total_quantity')
          .eq('clinic_id', activeStore.id)
          .eq('medicine_id', item.medicine_id)
          .single();

        if (invFetchError) throw invFetchError;

        const { error: invError } = await supabase
          .from('inventory')
          .update({ total_quantity: invData.total_quantity + refundQty })
          .eq('id', invData.id);

        if (invError) throw invError;
      }

      // Update order status if fully refunded
      // Check if all items are fully refunded
      let isFullyRefunded = true;
      for (const item of items) {
        const totalRefundedNow = item.refunded_quantity + (refundQuantities[item.id] || 0);
        if (totalRefundedNow < item.quantity) {
          isFullyRefunded = false;
          break;
        }
      }

      if (isFullyRefunded) {
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('id', order.id);
          
        if (updateOrderError) throw updateOrderError;
      }

      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/orders/${order.id}`);
      }, 2000);

    } catch (err: any) {
      console.error('Refund creation error:', err);
      setError(err.message || 'Failed to process refund');
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
            Please select an active store from the dashboard to process refunds.
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">
            {error || "Failed to load order for refund."}
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

  const allRefunded = items.every(item => item.quantity === item.refunded_quantity);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <button onClick={() => navigate(`/orders/${order.id}`)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Process Refund</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>Refund processed successfully! Redirecting...</span>
          </div>
        )}

        {allRefunded ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Fully Refunded</h3>
            <p>All items in this order have already been refunded.</p>
            <Link
              to={`/orders/${order.id}`}
              className="mt-6 inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              Back to Order
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 px-1">
                Select Items to Refund
              </h3>
              <div className="space-y-3">
                {items.map((item) => {
                  const maxRefundable = item.quantity - item.refunded_quantity;
                  const currentRefundQty = refundQuantities[item.id] || 0;
                  
                  return (
                    <div key={item.id} className={`bg-white border rounded-2xl p-4 shadow-sm transition-colors ${maxRefundable === 0 ? 'border-slate-100 opacity-60' : currentRefundQty > 0 ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-base truncate">{item.medicines.name}</h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <span>Ordered: {item.quantity}</span>
                            {item.refunded_quantity > 0 && (
                              <span className="text-amber-600 font-medium">Refunded: {item.refunded_quantity}</span>
                            )}
                            <span>@ ₹{item.selling_price.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {maxRefundable > 0 ? (
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 w-fit">
                              <button
                                onClick={() => handleQuantityChange(item.id, currentRefundQty - 1, maxRefundable)}
                                disabled={currentRefundQty <= 0}
                                className="p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={maxRefundable}
                                value={currentRefundQty || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  handleQuantityChange(item.id, isNaN(val) ? 0 : val, maxRefundable);
                                }}
                                className="w-12 text-center bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-slate-900"
                              />
                              <button
                                onClick={() => handleQuantityChange(item.id, currentRefundQty + 1, maxRefundable)}
                                disabled={currentRefundQty >= maxRefundable}
                                className="p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-right min-w-[80px]">
                              <span className="block font-bold text-slate-900 text-lg">
                                ₹{(currentRefundQty * item.selling_price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
                            Fully Refunded
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
              <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Refund (Optional)
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none"
                placeholder="e.g., Patient returned medicine, wrong item billed..."
              />
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      {!allRefunded && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-500">Refund Amount</span>
              <span className="text-2xl font-bold text-slate-900">₹{totalRefundAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !hasItemsToRefund}
              className="flex-1 max-w-[200px] flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Processing...' : 'Confirm Refund'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
