import React from 'react';
import { Sparkles, Users, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface HomeProps {
  onNavigate: (view: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Hero Welcome banner */}
      <div className="bg-gradient-to-r from-gov-brand-blue-900 to-gov-brand-blue-500 rounded-2xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-xl space-y-4">
          <span className="bg-white/10 text-gov-brand-emerald-50:hover text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            National Decision Support Suite
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            YUKTI: Evidence-Based Constituency Development
          </h2>
          <p className="text-slate-200 text-sm md:text-base leading-relaxed">
            Integrating public data statistics, infrastructure indicators, and citizen feedback to rank and optimize development projects.
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className={`grid grid-cols-1 gap-6 ${
        !user ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-md mx-auto'
      }`}>
        {/* Citizen Card */}
        {(!user || user.role === 'Citizen') && (
          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Citizen Portal</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                Report public infrastructure issues, supply leaks, and educational needs directly to constituency representatives.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('citizen')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-gov-brand-blue-500/30 text-gov-brand-blue-500 rounded-lg font-semibold hover:bg-gov-brand-blue-50 transition-colors"
            >
              Enter Citizen Portal <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Officer Card */}
        {(!user || user.role === 'Officer') && (
          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gov-brand-emerald-50 dark:bg-gov-brand-emerald-900/20 text-gov-brand-emerald-500 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Officer Panel</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                Review and audit AI-categorized complaints, verify localized claims, and register them as official proposed projects.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('officer')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-gov-brand-emerald-500/30 text-gov-brand-emerald-500 rounded-lg font-semibold hover:bg-gov-brand-emerald-50 transition-colors"
            >
              Enter Officer Panel <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* MP Dashboard Card */}
        {(!user || user.role === 'MP') && (
          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">MP Analytics</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                Access the executive decision dashboard, run "What-If" planning optimizations, and review budget allocation summaries.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('mp')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-amber-500/30 text-amber-500 rounded-lg font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              Enter MP Analytics <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
