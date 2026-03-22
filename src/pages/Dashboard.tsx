import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import StoreSelector from '../components/StoreSelector';
import StatCard from '../components/StatCard';
import QuickActionCard from '../components/QuickActionCard';
import OrderListItem from '../components/OrderListItem';
import LowStockList from '../components/LowStockList';
import { Activity, LogOut, Store as StoreIcon, Plus, MapPin, Pill, Package, ShoppingCart, Receipt, TrendingUp, AlertTriangle, RefreshCcw, List } from 'lucide-react';
import { Inventory, Order } from '../types';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { activeStore, setActiveStore } = useStore();
  const [loading, setLoading] = useState(true);

  const [totalMedicines, setTotalMedicines] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  
  const [lowStockItems, setLowStockItems] = useState<Inventory[]>([]);
  const [topInventory, setTopInventory] = useState<Inventory[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    const checkStores = async () => {
      if (!user) return;
      
      // Always fetch stores from DB so newly created stores appear
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        if (!activeStore) {
          // No active store yet → auto-select the first
          if (data.length > 0) {
            setActiveStore(data[0]);
          }
        } else {
          // Validate that the current active store still exists
          const stillExists = data.find(s => s.id === activeStore.id);
          if (!stillExists && data.length > 0) {
            setActiveStore(data[0]);
          } else if (!stillExists) {
            setActiveStore(null);
          }
        }
      }
      setLoading(false);
    };
    
    checkStores();
  }, [user]);

  useEffect(() => {
    if (activeStore) {
      fetchDashboardData();
    }
  }, [activeStore]);

  const fetchDashboardData = async () => {
    if (!activeStore) return;

    // 1. Total Medicines (Global for user)
    const { count: medCount } = await supabase
      .from('medicines')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user?.id);
    setTotalMedicines(medCount || 0);

    // 2. Total Stock & Low Stock Alerts
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select(`
        *,
        medicines (
          id,
          name,
          company
        )
      `)
      .eq('clinic_id', activeStore.id);

    if (inventoryData) {
      const sum = inventoryData.reduce((acc, item) => acc + item.total_quantity, 0);
      setTotalStock(sum);

      const lowStock = inventoryData.filter(item => item.total_quantity > 0 && item.total_quantity < 10);
      setLowStockItems(lowStock as Inventory[]);

      // Top 5 by quantity for dashboard preview
      const top5 = [...inventoryData]
        .filter(item => item.total_quantity > 0)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);
      setTopInventory(top5 as Inventory[]);
    }

    // 3. Orders Today & Revenue Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('clinic_id', activeStore.id)
      .gte('created_at', todayIso);

    if (todayOrders) {
      setOrdersToday(todayOrders.length);
      const rev = todayOrders.reduce((acc, order) => acc + order.total_amount, 0);
      setRevenueToday(rev);
    }

    // 4. Recent Orders
    const { data: recent } = await supabase
      .from('orders')
      .select('*')
      .eq('clinic_id', activeStore.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recent) {
      setRecentOrders(recent as Order[]);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Header */}
      

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !activeStore ? (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-8">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-6">
              <StoreIcon className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Welcome to PharmSync!
            </h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
              No store found. Create your first pharmacy store location to get started with inventory and sales.
            </p>
            <Link
              to="/stores/new"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Store
            </Link>
          </div>
        ) : (
          /* Active Dashboard */
          <div className="space-y-8">
            {/* Welcome Section */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Welcome back, {profile?.name || 'User'} 👋
              </h1>
              <p className="text-slate-500 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {activeStore.name}
              </p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Medicines"
                value={totalMedicines}
                icon={Pill}
                colorClass="bg-blue-50 text-blue-600"
              />
              <StatCard
                title="Total Stock"
                value={totalStock}
                icon={Package}
                colorClass="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                title="Orders Today"
                value={ordersToday}
                icon={ShoppingCart}
                colorClass="bg-amber-50 text-amber-600"
              />
              <StatCard
                title="Revenue Today"
                value={`₹${revenueToday.toFixed(2)}`}
                icon={TrendingUp}
                colorClass="bg-emerald-50 text-emerald-600"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickActionCard
                  title="New Order"
                  to="/orders/new"
                  icon={ShoppingCart}
                  colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                />
                <QuickActionCard
                  title="Add Stock"
                  to="/stock-entry"
                  icon={Plus}
                  colorClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                />
                <QuickActionCard
                  title="View Inventory"
                  to="/inventory"
                  icon={Package}
                  colorClass="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                />
                <QuickActionCard
                  title="Medicines"
                  to="/inventory?tab=medicines"
                  icon={Pill}
                  colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                />
                <QuickActionCard
                  title="Stock Adjust"
                  to="/stock-adjustments"
                  icon={RefreshCcw}
                  colorClass="bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white"
                />
                <QuickActionCard
                  title="Audit Logs"
                  to="/audit-logs"
                  icon={List}
                  colorClass="bg-slate-50 text-slate-600 group-hover:bg-slate-600 group-hover:text-white"
                />
                <QuickActionCard
                  title="Manage Stores"
                  to="/stores"
                  icon={StoreIcon}
                  colorClass="bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
                />
              </div>
            </div>

            {/* Inventory Snapshot + Alerts + Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Low Stock Alerts */}
              <div>
                <LowStockList items={lowStockItems} />
              </div>

              {/* Recent Orders */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
                  <Link to="/orders" className="text-sm font-bold text-blue-600 hover:text-blue-700">
                    View All
                  </Link>
                </div>
                
                {recentOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-8 text-center">
                    <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900 mb-1">No orders yet</p>
                    <p className="text-xs text-slate-500 mb-4">Create your first order to see it here.</p>
                    <Link
                      to="/orders/new"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      New Order
                    </Link>
                  </div>
                ) : (
                  <div>
                    {recentOrders.map(order => (
                      <OrderListItem key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Inventory Snapshot</h2>
                <div className="flex items-center gap-3">
                  <Link to="/inventory?tab=medicines" className="text-sm font-medium text-slate-500 hover:text-slate-700">
                    Medicines
                  </Link>
                  <Link to="/inventory" className="text-sm font-bold text-blue-600 hover:text-blue-700">
                    View All Stock
                  </Link>
                </div>
              </div>

              {topInventory.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-8 text-center">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900 mb-1">No stock yet</p>
                  <p className="text-xs text-slate-500 mb-4">Add stock to start tracking your inventory.</p>
                  <Link
                    to="/stock-entry"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Stock
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {topInventory.map((item, idx) => {
                    const med = item.medicines;
                    const isLow = item.total_quantity < 10;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-4 py-3.5 ${
                          idx !== topInventory.length - 1 ? 'border-b border-slate-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isLow ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                          }`}>
                            <Pill className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate text-sm">{med?.name}</p>
                            {med?.company && (
                              <p className="text-xs text-slate-500 truncate">{med.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-4">
                          {isLow && (
                            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Low
                            </span>
                          )}
                          <span className={`text-lg font-bold ${
                            isLow ? 'text-amber-600' : 'text-slate-900'
                          }`}>
                            {item.total_quantity}
                          </span>
                          <span className="text-xs text-slate-400">units</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center">
                    <Link to="/inventory" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      View Full Inventory →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
