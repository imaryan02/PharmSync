import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: string) => toast(message, 'error'), [toast]);
  const info = useCallback((message: string) => toast(message, 'info'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all animate-in fade-in slide-in-from-top-4 ${
              t.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' :
              t.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' :
              'bg-blue-50/90 border-blue-200 text-blue-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            </div>
            <p className="flex-1 text-sm font-medium leading-relaxed">
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded-lg p-1 hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <X className="h-4 w-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
