import { Link } from 'react-router-dom';
import { Activity, Package, Receipt, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl tracking-tight">PharmSync</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-7xl">
            Smart Pharmacy Register for Modern Clinics
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-600">
            Manage inventory, stock, and sales across multiple stores with ease. Built for doctors and staff to keep everything in sync.
          </p>
          <div className="mt-10 flex justify-center gap-x-6">
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center rounded-full py-3 px-6 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-blue-600"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full py-3 px-6 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-slate-200 text-slate-900 hover:ring-slate-300 active:bg-slate-100 focus-visible:outline-blue-600"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-3 sm:gap-x-8">
            <div className="relative p-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-6">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Multi-store inventory</h3>
              <p className="text-sm text-slate-600">
                Manage multiple pharmacy locations from a single dashboard. Keep track of stock levels across all your stores.
              </p>
            </div>
            <div className="relative p-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-6">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Smart stock tracking</h3>
              <p className="text-sm text-slate-600">
                Track batches, expiry dates, and low stock alerts automatically. Never run out of essential medicines.
              </p>
            </div>
            <div className="relative p-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-6">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Simple billing</h3>
              <p className="text-sm text-slate-600">
                Fast and easy checkout process designed for busy clinics. Generate receipts and track daily sales effortlessly.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-slate-900">PharmSync</span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} PharmSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
