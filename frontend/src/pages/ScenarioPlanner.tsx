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

  // Normalize weights when one changes to ensure sum = 1.0
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
        impact: impactWeight,
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
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          AI Scenario Simulator ("What If?")
        </h1>
        <p className="text-slate-400 mt-1">
          Simulate budget changes, policy priorities, and environment impacts to generate optimal project portfolios.
        </p>
      </div>

      {/* Grid: Inputs (1 col) & Output/Charts (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sliders and Controls Column */}
        <div className="glass-panel rounded-2xl p-6 space-y-6 self-start">
          <div className="flex items-center gap-2 text-gov-gold border-b border-slate-800 pb-3 mb-4">
            <Sliders className="h-5 w-5" />
            <h3 className="font-bold text-white">Simulation Controls</h3>
          </div>

          {/* Budget Constraint */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Available Budget: ₹{(budget / 10000000).toFixed(2)} Cr
            </label>
            <input 
              type="range"
              min="2000000"
              max="25000000"
              step="500000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-gov-gold"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>₹20 Lakhs</span>
              <span>₹2.5 Crores</span>
            </div>
          </div>

          {/* Special Focus Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Special Priority Focus</label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-3 text-white focus:outline-none focus:border-gov-gold"
            >
              <option value="">None (Balanced development)</option>
              <option value="Water">Water Infrastructure</option>
              <option value="Roads">Roads & Connectivity</option>
              <option value="Healthcare">Healthcare Facilities</option>
              <option value="Education">Education Sector</option>
              <option value="Safety">Safety & Lighting</option>
            </select>
          </div>

          {/* Vulnerability Multiplier (eg. Flood/crisis mode) */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Ward Vulnerability Factor: {multiplier.toFixed(1)}x
            </label>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full accent-gov-gold"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Standard Focus</span>
              <span>Crisis Response (2.5x)</span>
            </div>
          </div>

          {/* Weights sliders */}
          <div className="space-y-4 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Score Engine Component Weights</h4>
            
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Urgency weight</span>
                <span>{(urgencyWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={urgencyWeight}
                onChange={(e) => handleWeightChange('urgency', Number(e.target.value))}
                className="w-full accent-gov-gold"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Citizen Reach weight</span>
                <span>{(impactWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={impactWeight}
                onChange={(e) => handleWeightChange('impact', Number(e.target.value))}
                className="w-full accent-gov-gold"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Ward Demographics weight</span>
                <span>{(demoWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={demoWeight}
                onChange={(e) => handleWeightChange('demo', Number(e.target.value))}
                className="w-full accent-gov-gold"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Cost Efficiency weight</span>
                <span>{(costWeight * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={costWeight}
                onChange={(e) => handleWeightChange('cost', Number(e.target.value))}
                className="w-full accent-gov-gold"
              />
            </div>
          </div>

          <button
            onClick={triggerSimulation}
            disabled={isSimulating}
            className="w-full bg-gradient-to-r from-gov-gold to-amber-500 text-slate-950 font-extrabold py-3.5 px-6 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
          >
            {isSimulating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Optimizing Portfolio...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Recalculate Optimization
              </>
            )}
          </button>
        </div>

        {/* Results & AI Explanation Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Gemini Explain Card */}
          <div className="glass-panel rounded-2xl p-6 border border-gov-gold/30 bg-gradient-to-br from-slate-900/60 to-slate-950/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles className="h-10 w-10 text-gov-gold animate-pulse" />
            </div>
            
            <h3 className="text-lg font-bold text-gov-gold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              YUKTI AI Executive Reasoning
            </h3>

            {isSimulating ? (
              <div className="space-y-2 animate-pulse py-3">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                <div className="h-4 bg-slate-800 rounded w-2/3"></div>
              </div>
            ) : (
              <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
                {simulationResult?.explanation || "Adjust parameters and click Recalculate to review the AI portfolio explanation."}
              </p>
            )}
          </div>

          {/* Budget Util Chart & Project Splits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 md:col-span-1 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Budget Utilization</h4>
                <div className="mt-4 space-y-1">
                  <div className="text-2xl font-extrabold text-emerald-400">₹{(spentBudget / 10000000).toFixed(2)} Cr</div>
                  <div className="text-xs text-slate-500">Allocated out of ₹{(budget / 10000000).toFixed(2)} Cr</div>
                </div>
              </div>
              <div className="h-32 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1E293B', color: '#FFF' }} />
                    <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]}>
                      <Cell fill="#10B981" />
                      <Cell fill="#1E293B" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Simulation Results Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-center">
                  <span className="block text-2xl font-black text-white">{selectedProjects.length}</span>
                  <span className="text-xs text-emerald-400 font-semibold mt-1 block">Projects Selected</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-center">
                  <span className="block text-2xl font-black text-slate-400">{rejectedProjects.length}</span>
                  <span className="text-xs text-slate-500 font-semibold mt-1 block">Projects Deferred</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Portfolio Table */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Simulated Portfolio</h3>
              <p className="text-slate-400 text-xs">Calculated based on constraints & optimization algorithm</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="p-4 w-12 text-center">Status</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Cost (INR)</th>
                    <th className="p-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {simulationResult?.projects.map((proj) => (
                    <tr key={proj.id} className={`transition-colors ${proj.is_selected ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-900/30'}`}>
                      <td className="p-4 text-center">
                        {proj.is_selected ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="p-4">
                        <div>
                          <span className={`font-semibold block ${proj.is_selected ? 'text-white' : 'text-slate-500'}`}>{proj.title}</span>
                          <span className="text-xs text-slate-500 block mt-0.5">{proj.ward}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs border ${proj.is_selected ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-900/40 border-slate-800/40 text-slate-600'}`}>
                          {proj.category}
                        </span>
                      </td>
                      <td className={`p-4 font-medium ${proj.is_selected ? 'text-slate-300' : 'text-slate-600'}`}>₹{proj.cost.toLocaleString()}</td>
                      <td className={`p-4 text-right font-extrabold ${proj.is_selected ? 'text-gov-gold' : 'text-slate-650'}`}>
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
