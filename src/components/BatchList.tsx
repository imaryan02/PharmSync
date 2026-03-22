import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Batch } from '../types';
import { Calendar, Hash, Package } from 'lucide-react';

interface BatchListProps {
  clinicId: string;
  medicineId: string;
}

export default function BatchList({ clinicId, medicineId }: BatchListProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('medicine_id', medicineId)
        .gt('quantity_remaining', 0)
        .order('expiry_date', { ascending: true });

      if (!error && data) {
        setBatches(data);
      }
      setLoading(false);
    };

    fetchBatches();
  }, [clinicId, medicineId]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        No active batches found for this medicine.
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border-t border-slate-100 p-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Batch Breakdown
      </h4>
      <div className="space-y-2">
        {batches.map((batch) => {
          // Check if expiry is near (within 3 months)
          const expiryDate = new Date(batch.expiry_date);
          const today = new Date();
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(today.getMonth() + 3);
          
          const isExpiringSoon = expiryDate <= threeMonthsFromNow && expiryDate >= today;
          const isExpired = expiryDate < today;

          return (
            <div 
              key={batch.id} 
              className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Hash className="h-4 w-4 text-slate-400" />
                  {batch.batch_code || 'N/A'}
                </div>
                <div className={`flex items-center gap-1.5 text-sm ${isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                  <Calendar className="h-4 w-4" />
                  {new Date(batch.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                <Package className="h-4 w-4 text-slate-500" />
                {batch.quantity_remaining}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
