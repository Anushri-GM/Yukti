import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  UserCheck, ShieldAlert, ListFilter, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, ChevronRight,
  TrendingUp, Clock
} from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const { submissions, fetchSubmissions, verifySubmission } = useStore();
  
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [actionCategory, setActionCategory] = useState('');
  const [actionUrgency, setActionUrgency] = useState(3);
  const [convertToProject, setConvertToProject] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const pendingSubmissions = submissions.filter(sub => sub.status === 'pending');
  const processedSubmissions = submissions.filter(sub => sub.status !== 'pending');

  const selectedSub = submissions.find(sub => sub.id === selectedSubId);

  const selectSubmission = (id: number) => {
    setSelectedSubId(id);
    const sub = submissions.find(s => s.id === id);
    if (sub) {
      setActionCategory(sub.category || 'General');
      setActionUrgency(sub.urgency || 3);
    }
  };

  const handleVerify = async (status: 'verified' | 'rejected') => {
    if (selectedSubId === null) return;
    setVerifyingId(selectedSubId);
    
    await verifySubmission(
      selectedSubId,
      status,
      actionCategory,
      actionUrgency,
      status === 'verified' ? convertToProject : false
    );
    
    setVerifyingId(null);
    setSelectedSubId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header Info */}
      <div className="gov-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <UserCheck className="h-6 w-6 text-gov-brand-emerald-500" />
            <h2 className="text-xl font-bold">Officer Audit Queue</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Verify AI-extracted priority scores and convert verified grievances into Constituency proposed projects.
          </p>
        </div>
        <button 
          onClick={fetchSubmissions}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reload Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Pending List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="gov-card">
            <h3 className="font-bold text-sm text-slate-500 mb-4 flex items-center justify-between">
              <span>Grievances Awaiting Verification ({pendingSubmissions.length})</span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </h3>

            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock className="h-10 w-10 mx-auto mb-3" />
                <p className="font-medium text-xs">No pending grievances in queue.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pendingSubmissions.map((sub) => {
                  const isSelected = sub.id === selectedSubId;
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => selectSubmission(sub.id)}
                      className={`border p-4 rounded-xl cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-gov-brand-emerald-500 bg-gov-brand-emerald-500/5 ring-1 ring-gov-brand-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {sub.ward}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Urgency: {sub.urgency}/5
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-850 dark:text-slate-100 line-clamp-2">{sub.text}</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <span>Category: {sub.category || "Other"}</span>
                        <span>Confidence: {Math.round(sub.confidence * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Processed/Audited List */}
          <div className="gov-card">
            <h3 className="font-bold text-sm text-slate-500 mb-4">Audited Requests History ({processedSubmissions.length})</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
              {processedSubmissions.map((sub) => (
                <div key={sub.id} className="border border-slate-100 dark:border-slate-900 rounded-lg p-3 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/10">
                  <div className="space-y-1">
                    <p className="font-medium truncate max-w-[280px] text-slate-750 dark:text-slate-350">{sub.text}</p>
                    <span className="text-[10px] text-slate-500">{sub.ward} • Category: {sub.category}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] ${
                    sub.status === 'rejected'
                      ? 'bg-rose-50 border border-rose-250 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-250 text-emerald-700'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Audit Form & AI Details */}
        <div className="lg:col-span-1">
          {selectedSub ? (
            <div className="gov-card space-y-6 sticky top-4">
              <h3 className="font-bold text-base border-b border-slate-150 dark:border-slate-850 pb-2">Grievance Audit</h3>

              <div className="space-y-3">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Original Submission</span>
                  <p className="text-sm font-medium bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                    {selectedSub.text}
                  </p>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="border border-gov-brand-blue-500/20 bg-gov-brand-blue-500/5 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-gov-brand-blue-500 uppercase text-[10px] tracking-wider">
                  <ShieldAlert className="h-4 w-4" /> AI Diagnostics
                </div>
                
                {selectedSub.urgency >= 4 && (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-250 text-amber-800 rounded-lg font-semibold text-[10px]">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    High urgency detected. Recommended for immediate verification.
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-semibold">AI Suggested Category</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedSub.category}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-semibold">AI Executive Summary</span>
                    <p className="text-slate-700 dark:text-slate-300 italic">"{selectedSub.summary}"</p>
                  </div>
                </div>
              </div>

              {/* Audit Form Controls */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Category</label>
                  <select
                    value={actionCategory}
                    onChange={(e) => setActionCategory(e.target.value)}
                    className="w-full text-xs bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="Roads">Roads & Infrastructure</option>
                    <option value="Water">Water Supply</option>
                    <option value="Sanitation">Sanitation & Garbage</option>
                    <option value="Healthcare">Healthcare Clinics</option>
                    <option value="Education">Education & Schools</option>
                    <option value="Safety">Public Safety & Lighting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Urgency (1-5)</label>
                  <select
                    value={actionUrgency}
                    onChange={(e) => setActionUrgency(Number(e.target.value))}
                    className="w-full text-xs bg-gov-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="1">1 - Minimal concern</option>
                    <option value="2">2 - Minor inconvenience</option>
                    <option value="3">3 - Moderate block</option>
                    <option value="4">4 - High severity risk</option>
                    <option value="5">5 - Critical threat / hazard</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="convert"
                    checked={convertToProject}
                    onChange={(e) => setConvertToProject(e.target.checked)}
                    className="rounded accent-gov-brand-emerald-500"
                  />
                  <label htmlFor="convert" className="text-xs font-bold text-slate-650 cursor-pointer">
                    Convert to proposed project on approval
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleVerify('rejected')}
                    disabled={verifyingId !== null}
                    className="py-2 border border-rose-350 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleVerify('verified')}
                    disabled={verifyingId !== null}
                    className="py-2 bg-gov-brand-emerald-500 hover:bg-gov-brand-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" /> Verify & Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gov-card text-center py-12 text-slate-400">
              <ChevronRight className="h-10 w-10 mx-auto mb-3" />
              <p className="font-bold text-sm">Select a Grievance</p>
              <p className="text-xs">Click on any grievance from the list to audit AI indicators and process it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
