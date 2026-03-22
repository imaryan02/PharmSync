import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { User as UserIcon, Phone, Mail } from 'lucide-react';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      showSuccess('Profile updated successfully!');
      
    } catch (err: any) {
      console.error('Profile update error:', err);
      showError(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="bg-transparent mt-2 mb-4">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <h1 className="text-xl font-bold text-slate-900">Your Profile</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {profile?.name || 'Pharmacy Associate'}
                </h2>
                <span className="inline-flex items-center text-sm text-slate-500 font-medium">
                  {user?.email}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    disabled
                    value={user?.email || ''}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl sm:text-sm cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Email cannot be changed directly.</p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 flex justify-center py-3.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
