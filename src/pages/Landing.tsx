import { Link } from 'react-router-dom';
import { Activity, Package, ArrowRight, Grid, Zap, LayoutDashboard, Database, Check, Plus } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-900 pb-20 sm:pb-0 overflow-hidden relative">
      
      {/* ── Background Subtle Glows (India flag inspired) ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute right-[-10%] bottom-[-10%] w-[50%] h-[50%] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Ultra-Minimal Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#138808] via-white to-[#FF9933] opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
              <Activity className="h-5 w-5 text-white z-10" />
            </div>
            <span className="font-extrabold text-2xl tracking-tighter text-slate-900">PHARMSYNC</span>
          </div>
          <div className="hidden sm:flex items-center gap-8">
            <Link to="/login" className="text-sm font-bold tracking-wide text-slate-600 hover:text-blue-800 transition-colors">
              LOG IN
            </Link>
            <Link
              to="/signup"
              className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold tracking-wide text-white overflow-hidden rounded-full group transition-all hover:shadow-[0_8px_30px_rgb(0,0,128,0.2)] hover:scale-105 active:scale-95"
            >
              {/* Chakra Blue Background */}
              <div className="absolute inset-0 bg-[#000080]" />
              {/* Tricolor Hover Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#FF9933] via-white/20 to-[#138808] transition-opacity duration-500" />
              <span className="relative z-10">START NOW</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Creative Hero Section ── */}
      <main className="pt-32 sm:pt-48 relative">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_500px] gap-12 lg:gap-24 items-center">
            
            {/* Left: Typography Focus */}
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#000080]/10 rounded-full text-[10px] font-bold tracking-widest uppercase mb-8 bg-[#000080]/5 text-[#000080]">
                <span className="w-2 h-2 rounded-full bg-[#138808] animate-pulse shadow-[0_0_10px_rgba(19,136,8,0.5)]" />
                Next Gen Pharmacy OS
              </div>
              
              <h1 className="text-6xl sm:text-[6.5rem] leading-[0.9] font-black tracking-tighter mb-8 text-slate-900 group">
                OPERATE <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF9933] via-slate-400 to-[#138808] transition-all duration-700 hover:scale-105 inline-block">AT</span> SCALE.
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-10 max-w-xl">
                A premium, high-performance operating system for modern pharmacies. Unify your inventory, billing, and multi-store analytics into a single flawless source of truth.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <Link
                  to="/signup"
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white rounded-full transition-all overflow-hidden shadow-lg shadow-[#000080]/20 hover:shadow-[#FF9933]/30"
                >
                  <div className="absolute inset-0 bg-[#000080] transition-colors duration-500 group-hover:bg-[#FF9933]" />
                  <span className="relative z-10 flex items-center">
                    ENTER THE SYSTEM
                    <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-4 font-bold text-slate-700 border-2 border-slate-200 rounded-full hover:border-[#138808] hover:text-[#138808] transition-all bg-white"
                >
                  LOG IN
                </Link>
              </div>
            </div>

            {/* Right: Abstract Creative Wireframe */}
            <div className="hidden lg:block relative h-[600px] w-full isolate">
              {/* Abstract decorative background */}
              <div className="absolute inset-0 border-2 border-slate-100 rounded-[3rem] -rotate-6 scale-95 transition-transform duration-700 hover:rotate-0 bg-white/50 backdrop-blur-sm" />
              
              <div className="absolute inset-0 border border-slate-200 rounded-[3rem] bg-white shadow-2xl overflow-hidden flex flex-col pointer-events-none">
                {/* Mock Header */}
                <div className="h-14 border-b border-slate-100 bg-slate-50/50 flex items-center px-6 gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FF9933]" />
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <div className="w-3 h-3 rounded-full bg-[#138808]" />
                  </div>
                  <div className="h-4 w-32 bg-slate-200 rounded-full ml-auto" />
                </div>
                {/* Mock Content */}
                <div className="p-6 flex-1 flex flex-col gap-6">
                  <div className="h-8 w-48 bg-slate-100 rounded-lg border border-slate-200" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl relative overflow-hidden">
                      <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-orange-100" />
                    </div>
                    <div className="h-24 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl relative overflow-hidden">
                      <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-blue-100" />
                    </div>
                    <div className="h-24 bg-gradient-to-br from-green-50 to-white border border-green-100 border-dashed rounded-2xl flex items-center justify-center">
                      <Plus className="text-green-300 h-8 w-8" />
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl mt-4 relative overflow-hidden p-6">
                    <div className="h-4 w-24 bg-slate-200 rounded-full mb-6" />
                    <div className="flex flex-col gap-4">
                      <div className="h-3 w-full bg-gradient-to-r from-[#FF9933]/20 via-slate-200 to-transparent rounded-full" />
                      <div className="h-3 w-5/6 bg-gradient-to-r from-blue-200 to-transparent rounded-full" />
                      <div className="h-3 w-4/6 bg-gradient-to-r from-[#138808]/20 to-transparent rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Element */}
              <div className="absolute -left-12 bottom-24 p-6 bg-[#000080] text-white rounded-3xl shadow-2xl rotate-3 animate-float border border-white/10 shadow-[#000080]/30 z-20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                    <Zap className="h-6 w-6 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/70 tracking-widest uppercase mb-1">Status</p>
                    <p className="font-bold text-xl">System Active</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Metric Banner ── */}
        <div className="mt-24 sm:mt-32 border-y border-slate-100 bg-slate-50 relative overflow-hidden">
           {/* Subtle background swoosh */}
           <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-[1400px] mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            <div>
              <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-2 text-slate-900">0ms</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Latency Sync</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-2 text-[#FF9933]">1M+</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Batches Managed</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-2 text-[#138808]">100%</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Uptime Guaranteed</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-2 text-[#000080]">∞</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Multi-Store Scale</p>
            </div>
          </div>
        </div>

        {/* ── Radically Minimal Features ── */}
        <div className="max-w-[1400px] mx-auto px-6 py-32 bg-white">
          <div className="mb-20 text-center sm:text-left">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6 max-w-2xl text-slate-900 mx-auto sm:mx-0">
              BUILT FOR SPEED. <br/> 
              <span className="text-slate-400">DESIGNED FOR CLARITY.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-x-12 gap-y-16">
            <div className="group cursor-default">
              <div className="h-1 w-12 bg-slate-200 mb-8 group-hover:w-full group-hover:bg-[#FF9933] transition-all duration-500 rounded-full" />
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-orange-50 text-[#FF9933] group-hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-orange-100">
                <Grid className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-slate-900">Multi-Entity Matrix</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Control an infinite number of pharmacy locations from a single, unified database shell. Switch contexts instantly with zero loading times.
              </p>
            </div>

            <div className="group cursor-default">
              <div className="h-1 w-12 bg-slate-200 mb-8 group-hover:w-full group-hover:bg-[#000080] transition-all duration-500 rounded-full" />
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-blue-50 text-[#000080] group-hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-blue-100">
                <Database className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-slate-900">Batch Intelligence</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Our core engine autonomously tracks expiries, low stock variants, and batch depletion, surfacing critical anomalies before they become issues.
              </p>
            </div>

            <div className="group cursor-default">
              <div className="h-1 w-12 bg-slate-200 mb-8 group-hover:w-full group-hover:bg-[#138808] transition-all duration-500 rounded-full" />
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-green-50 text-[#138808] group-hover:-translate-y-2 transition-transform duration-300 shadow-sm border border-green-100">
                <LayoutDashboard className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4 text-slate-900">Data Visualization</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Turn overwhelming transaction logs into gorgeous, readable graphs. Identify profit centers, top-selling items, and actionable alerts instantly.
              </p>
            </div>
          </div>
        </div>
        
        {/* ── Call to Action ── */}
        <div className="bg-slate-900 text-white py-32 px-6 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-[#000080] opacity-50" />
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-[#138808]/10 to-transparent blur-3xl" />
          <div className="absolute left-0 bottom-0 w-1/2 h-full bg-gradient-to-t from-[#FF9933]/10 to-transparent blur-3xl" />
          
          <div className="max-w-[1400px] mx-auto text-center relative z-10">
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter mb-8">
              READY TO UPGRADE?
            </h2>
            <p className="text-xl sm:text-2xl text-white/70 font-medium mb-12 max-w-2xl mx-auto">
              Join the modern standard for pharmacy operations. No credit card required to start your testing phase.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-12 py-5 font-bold text-slate-900 bg-white rounded-full hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:-translate-y-1 transition-all text-lg"
            >
              INITIALIZE ACCOUNT
            </Link>
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-slate-900 text-white rounded-full">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter text-slate-900">PHARMSYNC</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 mt-4 md:mt-0">
            <p className="text-sm font-bold text-slate-400 text-center sm:text-left">
              &copy; {new Date().getFullYear()} PHARMSYNC ARCHITECTURE. ALL RIGHTS RESERVED.
            </p>
            <p className="text-sm font-bold text-slate-500">
              Created by <a href="https://www.linkedin.com/in/imaryan02/" target="_blank" rel="noopener noreferrer" className="text-[#FF9933] hover:text-[#138808] transition-colors underline decoration-2 underline-offset-4">Aryan Gupta</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Custom Keyframes for Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(3deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
