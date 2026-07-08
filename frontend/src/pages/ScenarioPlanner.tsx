import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Sliders, Sparkles, AlertCircle, BarChart2, CheckCircle2, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ScenarioPlanner: React.FC = () => {
  const { runSimulation, simulationResult, isSimulating, projects } = useStore();

  const [budget, setBudget] = useState<number>(10000000); // Default 1 Crore
  const [focus, setFocus] = useState<string>('');
  const [urgencyWeight, setUrgencyWeight] = useState<number>(0.3);
  const [impactWeight, setImpactWeight] = useState<number>(0.3);
  const [demoWeight, setDemoWeight] = useState<number>(0.2);
  const [costWeight, setCostWeight] = useState<number>(0.2);
  const [multiplier, setMultiplier] = useState<number>(1.0);

  const handleWeightChange = (type: 'urgency' | 'impact' | 'demo' | 'cost', value: number) => {
    const rawVal = parseFloat(value.toFixed(2));
    if (type === 'urgency') setUrgencyWeight(rawVal);
    else if (type === 'impact') setImpactWeight(rawVal);
    else if (type === 'demo') setDemoWeight(rawVal);
    else if (type === 'cost') setCostWeight(rawVal);
  };

  const triggerSimulation = () => {
    runSimulation(
      budget,
      {
        urgency: urgencyWeight,
        focus_impact: impactWeight,
        demographics: demoWeight,
        cost_efficiency: costWeight
      },
      focus,
      multiplier
    );
  };

  // Run initial simulation
  useEffect(() => {
    if (projects.length > 0 && !simulationResult) {
      triggerSimulation();
    }
  }, [projects]);

  const selectedProjects = simulationResult?.projects.filter(p => p.is_selected) || [];
  const rejectedProjects = simulationResult?.projects.filter(p => !p.is_selected) || [];
  const spentBudget = selectedProjects.reduce((acc, p) => acc + p.cost, 0);

  const chartData = [
    { name: 'Spent Budget', amount: spentBudget / 100000 },
    { name: 'Remaining Budget', amount: Math.max(0, budget - spentBudget) / 100000 }
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gov-brand-blue-500 dark:text-gov-brand-blue-300" />
          AI Scenario Simulator ("What If?")
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Simulate budget changes, policy priorities, and environment impacts to generate optimal project portfolios.
        </p>
      </div>

      {/* Grid: Inputs (1 col) & Output/Charts (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sliders and Controls Column */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 self-start shadow-sm">
          <div className="flex items-center gap-2 text-gov-brand-blue-500 dark:text-gov-brand-blue-300 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sliders className="h-4 w-4" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Simulation Controls</h4>
          </div>

          {/* Budget Constraint */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350">
              Available Budget: ₹{(budget / 10000000).toFixed(2)} Cr
            </label>
            <input 
              type="range"
              min="2000000"
              max="25000000"
              step="500000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-gov-brand-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>₹20 Lakhs</span>
              <span>₹2.5 Crores</span>
            </div>
          </div>

          {/* Special Focus Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350">Special Priority Focus</label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-gov-brand-blue-500"
            >
              <option value="">None (Balanced development)</option>
              <option value="Water">Water Infrastructure</option>
              <option value="Roads">Roads & Connectivity</option>
              <option value="Healthcare">Healthcare Facilities</option>
              <option value="Education">Education Sector</option>
              <option value="Safety">Safety & Lighting</option>
            </select>
          </div>

          {/* Vulnerability Multiplier */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350">
              Ward Vulnerability Factor: {multiplier.toFixed(1)}x
            </label>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full accent-gov-brand-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>Standard Focus</span>
              <span>Crisis Response (2.5x)</span>
            </div>
          </div>

          {/* Weights sliders */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Score Engine Component Weights</h5>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                <span>Urgency weight</span>
                <span className="font-bold">{(urgencyWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={urgencyWeight}
                onChange={(e) => handleWeightChange('urgency', Number(e.target.value))}
                className="w-full accent-gov-brand-blue-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                <span>Citizen Reach weight</span>
                <span className="font-bold">{(impactWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={impactWeight}
                onChange={(e) => handleWeightChange('impact', Number(e.target.value))}
                className="w-full accent-gov-brand-blue-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                <span>Ward Demographics weight</span>
                <span className="font-bold">{(demoWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={demoWeight}
                onChange={(e) => handleWeightChange('demo', Number(e.target.value))}
                className="w-full accent-gov-brand-blue-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                <span>Cost Efficiency weight</span>
                <span className="font-bold">{(costWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={costWeight}
                onChange={(e) => handleWeightChange('cost', Number(e.target.value))}
                className="w-full accent-gov-brand-blue-500"
              />
            </div>
          </div>

          <button
            onClick={triggerSimulation}
            disabled={isSimulating}
            className="w-full bg-gov-brand-blue-500 hover:bg-gov-brand-blue-900 text-white font-extrabold py-3 px-6 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md text-xs"
          >
            {isSimulating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Optimizing Portfolio...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Recalculate Optimization
              </>
            )}
          </button>
        </div>

        {/* Results & AI Explanation Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Gemini Explain Card */}
          <div className="bg-gov-brand-blue-50/50 dark:bg-gov-brand-blue-900/10 rounded-2xl p-5 border border-gov-brand-blue-500/20 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles className="h-8 w-8 text-gov-brand-blue-500" />
            </div>
            
            <h4 className="text-xs font-extrabold text-gov-brand-blue-500 dark:text-gov-brand-blue-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              YUKTI AI Executive Reasoning
            </h4>

            {isSimulating ? (
              <div className="space-y-2 animate-pulse py-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
              </div>
            ) : (
              <p className="text-slate-700 dark:text-slate-200 text-xs md:text-sm leading-relaxed font-semibold">
                {simulationResult?.explanation || "Adjust parameters and click Recalculate to review the AI portfolio explanation."}
              </p>
            )}
          </div>

          {/* Budget Util Chart & Project Splits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:col-span-1 flex flex-col justify-between shadow-sm">
              <div>
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Budget Utilization</h5>
                <div className="mt-3 space-y-0.5">
                  <div className="text-xl font-black text-emerald-500">₹{(spentBudget / 10000000).toFixed(2)} Cr</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-455">Allocated out of ₹{(budget / 10000000).toFixed(2)} Cr</div>
                </div>
              </div>
              <div className="h-24 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1E293B', color: '#FFF', fontSize: '10px' }} />
                    <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]}>
                      <Cell fill="#10B981" />
                      <Cell fill="#E2E8F0" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:col-span-2 shadow-sm flex flex-col justify-center">
              <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Simulation Results Summary</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                  <span className="block text-xl font-black text-slate-800 dark:text-white">{selectedProjects.length}</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold mt-0.5 block">Projects Selected</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                  <span className="block text-xl font-black text-slate-400">{rejectedProjects.length}</span>
                  <span className="text-[10px] text-slate-500 font-bold mt-0.5 block">Projects Deferred</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Portfolio Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20">
              <h5 className="text-sm font-bold text-slate-800 dark:text-white">Simulated Portfolio</h5>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">Calculated based on constraints & optimization algorithm</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                    <th className="p-3 w-12 text-center">Status</th>
                    <th className="p-3">Project</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Cost (INR)</th>
                    <th className="p-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {simulationResult?.projects.map((proj) => (
                    <tr key={proj.id} className={`transition-colors ${proj.is_selected ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-950/20'}`}>
                      <td className="p-3 text-center">
                        {proj.is_selected ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-slate-350 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="p-3">
                        <div>
                          <span className={`font-semibold block ${proj.is_selected ? 'text-slate-850 dark:text-white' : 'text-slate-450 dark:text-slate-500'}`}>{proj.title}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">{proj.ward}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${proj.is_selected ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 text-slate-450 dark:text-slate-650'}`}>
                          {proj.category}
                        </span>
                      </td>
                      <td className={`p-3 font-semibold ${proj.is_selected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>₹{proj.cost.toLocaleString()}</td>
                      <td className={`p-3 text-right font-black ${proj.is_selected ? 'text-gov-brand-blue-500 dark:text-gov-brand-blue-300' : 'text-slate-400 dark:text-slate-600'}`}>
                        {proj.priority_score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
