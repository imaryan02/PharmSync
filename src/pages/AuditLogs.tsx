import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { AuditLog } from '../types';
import AuditLogCard from '../components/AuditLogCard';
import { ArrowLeft, AlertCircle, List, Filter } from 'lucide-react';

export default function AuditLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  useEffect(() => {
    if (user) {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchLogs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Fetch logs scoped to user
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('AuditLogs fetch error:', JSON.stringify(error, null, 2));
    } else if (data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    let match = true;
    if (filterAction && log.action !== filterAction) match = false;
    if (filterEntity && log.entity_type !== filterEntity) match = false;
    return match;
  });

  // Extract unique filter options from the logs
  const actionOptions = Array.from(new Set(logs.map(l => l.action))).sort();
  const entityOptions = Array.from(new Set(logs.map(l => l.entity_type))).sort();

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6 flex-col md:flex-row">
        
        {/* Mobile-friendly Filters */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:sticky md:top-24">
            <div className="flex items-center gap-2 mb-4 font-semibold text-slate-900">
              <Filter className="h-4 w-4" />
              Filters
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Action Type</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <option value="">All Actions</option>
                  {actionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Entity Type</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={filterEntity}
                  onChange={(e) => setFilterEntity(e.target.value)}
                >
                  <option value="">All Entities</option>
                  {entityOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {(filterAction || filterEntity) && (
                <button 
                  onClick={() => { setFilterAction(''); setFilterEntity(''); }}
                  className="w-full py-2 text-sm text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Logs List */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
             <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-10 text-center text-slate-500">
               <List className="h-10 w-10 mx-auto mb-3 text-slate-300" />
               <p className="font-medium text-slate-900 mb-1">No audit logs found</p>
               <p className="text-sm">There are no activities matching your current view.</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <AuditLogCard key={log.id} log={log} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
