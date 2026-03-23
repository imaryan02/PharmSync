import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import StoreSelector from './StoreSelector';
import {
  Activity, LogOut, Package, ShoppingCart, Pill, User as UserIcon,
  BarChart2, Menu, X, Plus, Home, ClipboardList, RefreshCcw,
  List, Store as StoreIcon, Settings,
} from 'lucide-react';

export default function AppLayout() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { activeStore } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!activeStore && location.pathname !== '/dashboard' && !location.pathname.startsWith('/stores')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Bottom nav — Orders tab goes directly to new order creation
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'New Order', path: '/orders/new', icon: ShoppingCart },
    { name: 'Medicines', path: '/medicines', icon: Pill },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  ];

  // Hamburger drawer menu items
  const drawerItems = [
    { section: 'Main', items: [
      { name: 'Dashboard', path: '/dashboard', icon: Home },
      { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    ]},
    { section: 'Orders', items: [
      { name: 'New Order / Billing', path: '/orders/new', icon: Plus, highlight: true },
      { name: 'View All Orders', path: '/orders', icon: ClipboardList },
    ]},
    { section: 'Inventory', items: [
      { name: 'Inventory', path: '/inventory', icon: Package },
      { name: 'Medicines', path: '/medicines', icon: Pill },
      { name: 'Stock Entry', path: '/stock-entry', icon: Plus },
      { name: 'Stock Adjustments', path: '/stock-adjustments', icon: RefreshCcw },
    ]},
    { section: 'Settings', items: [
      { name: 'Stores', path: '/stores', icon: StoreIcon },
      { name: 'Profile', path: '/profile', icon: UserIcon },
      { name: 'Audit Logs', path: '/audit-logs', icon: List },
    ]},
  ];

  const isNavActive = (path: string) => {
    if (path === '/orders/new') return location.pathname === '/orders/new';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Logo + Store Selector */}
            <div className="flex items-center gap-2 sm:gap-6">
              <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Activity className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">PharmSync</span>
              </Link>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <StoreSelector />
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Desktop: profile + logout */}
              <Link
                to="/profile"
                className="hidden sm:inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="Profile"
              >
                <UserIcon className="h-5 w-5" />
              </Link>
              <button
                onClick={signOut}
                className="hidden sm:inline-flex items-center justify-center px-3 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              {/* Hamburger (all screen sizes) */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 pb-20 sm:pb-8 flex flex-col">
        <Outlet />
      </div>

      {/* Desktop Footer */}
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
              <Link to="/inventory" className="hover:text-blue-600 transition-colors">Inventory</Link>
              <Link to="/orders/new" className="hover:text-blue-600 transition-colors">New Order</Link>
              <Link to="/analytics" className="hover:text-blue-600 transition-colors">Analytics</Link>
              <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
              <Link to="/stores" className="hover:text-blue-600 transition-colors">Store Settings</Link>
            </div>
            <div className="text-xs text-slate-400 font-medium">Made for modern pharmacies</div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.path);
            const isOrderBtn = item.path === '/orders/new';

            if (isOrderBtn) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center w-full h-full space-y-1"
                >
                  <div className="bg-blue-600 rounded-full p-3 -mt-6 shadow-lg shadow-blue-200 border-2 border-white">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 leading-none mt-1">Order</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-full transition-colors ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Hamburger Drawer ─────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">PharmSync</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto py-3">
          {drawerItems.map(({ section, items }) => (
            <div key={section} className="mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-1.5">{section}</p>
              {items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path
                  || (item.path !== '/orders/new' && location.pathname.startsWith(item.path) && item.path !== '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 mx-3 px-3 py-3 rounded-xl transition-all mb-0.5 ${
                      (item as any).highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      (item as any).highlight ? 'bg-white/20' : active ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        (item as any).highlight ? 'text-white' : active ? 'text-blue-600' : 'text-slate-500'
                      }`} />
                    </div>
                    <span className={`text-sm font-semibold ${
                      (item as any).highlight ? 'text-white' : active ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-100 p-4 space-y-2">
          <Link
            to="/profile"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Settings className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-sm font-semibold">Profile & Settings</span>
          </Link>
          <button
            onClick={() => { setDrawerOpen(false); signOut(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <div className="p-1.5 bg-red-50 rounded-lg">
              <LogOut className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
