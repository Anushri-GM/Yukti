import React from 'react';
import { Sparkles, Users, ArrowRight, ClipboardList, Map, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface HomeProps {
  onNavigate: (view: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Hero */}
      <div className="bg-gradient-to-r from-gov-brand-blue-900 to-gov-brand-blue-500 rounded-2xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-xl space-y-4">
          <span className="bg-white/10 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
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

      {/* Quick Action Grid — role-filtered */}
      {(!user || user.role === 'Citizen') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submit */}
          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 flex items-center justify-center">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Submit a Grievance</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                Report potholes, water leaks, broken streetlights and more. YUKTI AI analyses your report instantly.
              </p>
            </div>
            <button
              onClick={() => onNavigate('citizen')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-gov-brand-blue-500/30 text-gov-brand-blue-500 rounded-lg font-semibold hover:bg-gov-brand-blue-50 transition-colors"
            >
              Go to Citizen Portal <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* History */}
          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">My Reports</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                View all your submitted grievances with live AI analysis results, urgency scores, and status updates.
              </p>
            </div>
            <button
              onClick={() => onNavigate('citizen')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-emerald-500/30 text-emerald-500 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
            >
              View My Reports <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(!user || user.role === 'MP') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">MP Intelligence Overview</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                Constituency health dashboard, AI insights, critical areas, and recommended actions.
              </p>
            </div>
            <button
              onClick={() => onNavigate('overview')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-amber-500/30 text-amber-500 rounded-lg font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              Open Overview <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 flex items-center justify-center">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Constituency Map</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                GIS-style interactive map of grievance clusters across wards and localities.
              </p>
            </div>
            <button
              onClick={() => onNavigate('map')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-gov-brand-blue-500/30 text-gov-brand-blue-500 rounded-lg font-semibold hover:bg-gov-brand-blue-50 transition-colors"
            >
              Open Map <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="gov-card flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-purple-500 flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Issue Clusters</h3>
              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
                View aggregated issue clusters grouped by category, ward, priority, and status.
              </p>
            </div>
            <button
              onClick={() => onNavigate('clusters')}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-purple-500/30 text-purple-500 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              Open Clusters <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
