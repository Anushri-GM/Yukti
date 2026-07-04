import React from 'react';
import { UserCheck, ShieldAlert, ListFilter } from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="gov-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <UserCheck className="h-6 w-6 text-gov-brand-emerald-500" />
          <h2 className="text-2xl font-bold">Officer Audit Queue</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          Inspect, modify, and confirm AI-extracted priorities before launching constituency proposals.
        </p>

        {/* Mock Queue List */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-slate-50 dark:bg-slate-950/20 text-center py-12">
          <ListFilter className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Pending Review Queue</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            (The verification interface, duplicate merges, and audit status logs will be fully activated in Phase 6).
          </p>
        </div>
      </div>
    </div>
  );
};
