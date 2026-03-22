import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { Inventory } from '../types';
import AdjustmentForm, { AdjustmentFormData } from '../components/AdjustmentForm';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StockAdjustments() {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    if (activeStore) {
      fetchInventory();
    } else {
      setLoading(false);
    }
  }, [activeStore]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        medicines (
          id,
          name,
          company
        )
      `)
      .eq('clinic_id', activeStore?.id);

    if (!error && data) {
      setInventory(data as Inventory[]);
    }
    setLoading(false);
  };

  const handleAdjustmentSubmit = async (data: AdjustmentFormData) => {
    if (!activeStore || !user) return;
    
    setSubmitting(true);

    const isIncrease = data.type === 'Increase';
    const quantityChange = isIncrease ? data.quantity : -data.quantity;

    try {
      // 1. Insert into stock_adjustments
      const { data: adjData, error: adjError } = await supabase
        .from('stock_adjustments')
        .insert([{
          clinic_id: activeStore.id,
          medicine_id: data.inventoryItem.medicine_id,
          batch_id: data.batchItem?.id || null,
          quantity_change: quantityChange,
          reason: data.reason,
          // created_by omitted — FK references employees table, not auth.users
        }])
        .select()
        .single();

      if (adjError) throw adjError;

      // 2. Update inventory.total_quantity
      const newTotalQuantity = data.inventoryItem.total_quantity + quantityChange;

      // Guard: never allow inventory to go negative
      if (newTotalQuantity < 0) {
        throw new Error(`Cannot decrease more than available stock (${data.inventoryItem.total_quantity} units)`);
      }

      const { error: invError } = await supabase
        .from('inventory')
        .update({ total_quantity: newTotalQuantity })
        .eq('id', data.inventoryItem.id);

      if (invError) throw invError;

      // 3. Update batches.quantity_remaining if batch selected
      if (data.batchItem) {
        const newBatchQuantity = data.batchItem.quantity_remaining + quantityChange;

        // Guard: never allow batch to go negative
        if (newBatchQuantity < 0) {
          throw new Error(`Cannot decrease more than batch stock (${data.batchItem.quantity_remaining} units in this batch)`);
        }

        const { error: batchError } = await supabase
          .from('batches')
          .update({ quantity_remaining: newBatchQuantity })
          .eq('id', data.batchItem.id);
        
        if (batchError) throw batchError;
      }

      // 4. Insert into audit_logs (non-blocking — schema may differ)
      try {
        const metadata = {
          adjustment_id: adjData.id,
          reason: data.reason,
          medicine_name: data.inventoryItem.medicines?.name,
          batch_code: data.batchItem?.batch_code,
          quantity_change: quantityChange,
          type: data.type
        };

        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert([{
            action: 'Stock adjusted',
            entity_type: 'inventory',
            user_id: user.id, // mapped actor to user_id (per schema)
            actor_type: 'owner', // Must be 'owner' or 'employee' per DB check
            metadata: metadata
          }]);

        if (auditError) {
          console.warn('Audit log failed (non-critical):', JSON.stringify(auditError, null, 2));
        }
      } catch (auditErr) {
        console.warn('Audit log insert skipped:', JSON.stringify(auditErr, null, 2));
      }

      // Success
      showSuccess('Stock adjusted successfully');
      fetchInventory(); // Map new data

    } catch (err: any) {
      console.error('Stock adjustment error:', err);
      showError(err.message || 'Failed to process adjustment');
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
            Please select an active store to manage stock adjustments.
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Stock Adjustments</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6">
          <p className="text-slate-600 text-sm">
            Manually increase or decrease stock levels to correct disparities such as expired, damaged, or lost medicines.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <AdjustmentForm 
            inventory={inventory} 
            onSubmit={handleAdjustmentSubmit} 
            submitting={submitting} 
          />
        )}
      </main>
    </div>
  );
}
