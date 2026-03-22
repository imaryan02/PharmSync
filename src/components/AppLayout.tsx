import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import StoreSelector from './StoreSelector';
import { Activity, LogOut, Package, ShoppingCart, Pill, User as UserIcon } from 'lucide-react';

export default function AppLayout() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { activeStore } = useStore();

  if (!activeStore && location.pathname !== '/dashboard' && !location.pathname.startsWith('/stores')) {
    return <Navigate to="/dashboard" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Medicines', path: '/medicines', icon: Pill },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header (Always Visible) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Left side */}
            <div className="flex items-center gap-2 sm:gap-6">
              <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Activity className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">PharmSync</span>
              </Link>
              
              {/* Store Selector Divider */}
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              <StoreSelector />
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/profile"
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="Profile"
              >
                <UserIcon className="h-5 w-5" />
              </Link>
              <button
                onClick={signOut}
                className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 pb-20 sm:pb-8 flex flex-col">
        {/* We use Outlet to render the child nested routes */}
        <Outlet />
      </div>

      {/* Desktop Footer (Hidden on mobile to not conflict with bottom nav) */}
      <footer className="hidden sm:block border-t border-slate-200 bg-white py-8 mt-auto z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight">PharmSync</span>
              <span className="text-sm text-slate-500 ml-2">© {new Date().getFullYear()} All rights reserved.</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-slate-500">
              <Link to="/inventory" className="hover:text-blue-600 transition-colors">Inventory Hub</Link>
              <Link to="/orders/new" className="hover:text-blue-600 transition-colors">Point of Sale</Link>
              <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Overview</Link>
              <Link to="/stores" className="hover:text-blue-600 transition-colors">Store Settings</Link>
            </div>
            
            <div className="text-xs text-slate-400 font-medium">
              Made for modern pharmacies
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Navbar (Hidden on sm screens) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-full transition-colors ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'fill-blue-50 text-blue-600' : ''}`} />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
