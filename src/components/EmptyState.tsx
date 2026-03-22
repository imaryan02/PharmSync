import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
}

export default function EmptyState({ icon: Icon, title, message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-10 text-center max-w-lg mx-auto mt-6">
      <Icon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 mb-6 text-sm">{message}</p>
      
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
