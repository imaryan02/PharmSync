import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  to: string;
  icon: LucideIcon;
  colorClass: string;
}

export default function QuickActionCard({ title, to, icon: Icon, colorClass }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow group cursor-pointer text-center"
    >
      <div className={`p-3 rounded-xl mb-3 transition-colors ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    </Link>
  );
}
