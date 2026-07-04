import React from 'react';
import { BarChart3, Map, Settings2 } from 'lucide-react';

export const MpDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="gov-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <BarChart3 className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold">MP Decision Intelligence Room</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          Analyze ranked projects, track budgets, and trigger optimization simulations across the constituency.
        </p>

        {/* Mock Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-8 bg-slate-50 dark:bg-slate-950/20 text-center">
            <Map className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h4 className="font-bold">Interactive Geographic Coverage</h4>
            <p className="text-slate-450 text-xs mt-1">Activated with Google Maps in Phase 7.</p>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-8 bg-slate-50 dark:bg-slate-950/20 text-center">
            <Settings2 className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h4 className="font-bold">Scenario Simulator ("What-If")</h4>
            <p className="text-slate-450 text-xs mt-1">Activated with OR-Tools optimization in Phase 8.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
