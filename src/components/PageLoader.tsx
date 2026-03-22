import React from 'react';

export default function PageLoader() {
  return (
    <div className="flex justify-center py-12 items-center flex-col gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-sm text-slate-500 font-medium animate-pulse">Loading data...</p>
    </div>
  );
}
