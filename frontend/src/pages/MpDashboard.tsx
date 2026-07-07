import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ScenarioPlanner } from './ScenarioPlanner';
import { 
  BarChart3, RefreshCw, FileText, CheckSquare, 
  Wallet, AlertCircle, Settings2, ShieldCheck, ArrowRight
} from 'lucide-react';

export const MpDashboard: React.FC = () => {
  const { projects, submissions, fetchProjects, fetchSubmissions, fetchWards } = useStore();
  
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'simulator'>('overview');

  useEffect(() => {
    fetchProjects();
    fetchSubmissions();
    fetchWards();
  }, []);

  const totalCost = projects.reduce((acc, p) => acc + p.cost, 0);
  const urgentGrievances = submissions.filter(s => s.urgency >= 4 && s.status === 'pending');
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // Compute category breakdown
  const categoryCounts: Record<string, number> = {};
  projects.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Top Navigation / Title */}
      <div className="gov-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold">MP Decision Intelligence Room</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Monitor proposed infrastructure projects, analyze public urgency, and simulate budget allocations.
          </p>
        </div>
        
        {/* Tab Controls */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'overview'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'simulator'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" /> Scenario Simulator
          </button>
        </div>
      </div>

      {activeSubTab === 'overview' ? (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Budget Spent */}
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-500">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Estimated Budget</span>
                <h4 className="text-lg font-extrabold text-slate-850 dark:text-white">
                  ₹{(totalCost / 10000000).toFixed(2)} Cr
                </h4>
              </div>
            </div>

            {/* Total Projects */}
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Proposals</span>
                <h4 className="text-lg font-extrabold text-slate-850 dark:text-white">
                  {projects.length} Projects
                </h4>
              </div>
            </div>

            {/* Public Grievance Queue */}
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gov-brand-emerald-50 dark:bg-gov-brand-emerald-900/20 text-gov-brand-emerald-500">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Pending Grievances</span>
                <h4 className="text-lg font-extrabold text-slate-850 dark:text-white">
                  {pendingCount} Claims
                </h4>
              </div>
            </div>

            {/* High Urgency Warnings */}
            <div className="gov-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-500">
                <AlertCircle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Highly Urgent</span>
                <h4 className="text-lg font-extrabold text-slate-850 dark:text-white text-rose-500">
                  {urgentGrievances.length} Concerns
                </h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Category distribution */}
            <div className="gov-card lg:col-span-1 space-y-4">
              <h3 className="font-bold text-sm text-slate-500">Category Distribution</h3>
              <div className="space-y-3">
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = Math.round((count / projects.length) * 100) || 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gov-brand-blue-500 h-full rounded-full transition-all" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(categoryCounts).length === 0 && (
                  <p className="text-xs text-slate-450 text-center py-6">No proposals categorized yet.</p>
                )}
              </div>
            </div>

            {/* Top Urgent Grievances list */}
            <div className="gov-card lg:col-span-2 space-y-4">
              <h3 className="font-bold text-sm text-slate-500 flex items-center justify-between">
                <span>Top Urgent Grievances Queue</span>
                <ShieldCheck className="h-4 w-4 text-gov-brand-emerald-500" />
              </h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {urgentGrievances.map((s) => (
                  <div key={s.id} className="border border-slate-100 dark:border-slate-850 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/10 flex justify-between items-center gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-850 dark:text-slate-200">{s.text}</p>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{s.ward} • Urgency: {s.urgency}/5</span>
                    </div>
                    <button 
                      onClick={() => setActiveSubTab('simulator')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {urgentGrievances.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    All clear! No urgent grievances currently pending.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Proposals List */}
          <div className="gov-card">
            <h3 className="font-bold text-sm text-slate-500 mb-4">Proposed Constituency Projects</h3>
            <div className="border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 font-bold border-b border-slate-200 dark:border-slate-850 grid grid-cols-5 text-slate-500">
                <span className="col-span-2">Project Title</span>
                <span>Category</span>
                <span>Ward</span>
                <span className="text-right">Estimated Cost</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-150 dark:divide-slate-850">
                {projects.map((p) => (
                  <div key={p.id} className="p-3 grid grid-cols-5 font-semibold text-slate-750 dark:text-slate-350 bg-white dark:bg-gov-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-950/20">
                    <span className="col-span-2 text-slate-900 dark:text-white font-bold">{p.title}</span>
                    <span>{p.category}</span>
                    <span>{p.ward}</span>
                    <span className="text-right font-extrabold text-gov-brand-blue-500">₹{p.cost.toLocaleString()}</span>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="text-center py-8 text-slate-400">No proposed projects listed.</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="gov-card p-0 overflow-hidden">
          <ScenarioPlanner />
        </div>
      )}
    </div>
  );
};
