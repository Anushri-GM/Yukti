import React from 'react';
import { Landmark, FileText, CheckCircle2 } from 'lucide-react';

export const CitizenPortal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="gov-card">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <Landmark className="h-6 w-6 text-gov-brand-blue-500" />
          <h2 className="text-2xl font-bold">Citizen Grievance & Suggestion Desk</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          Submit local developmental grievances, voice transcripts, or infrastructure photos. YUKTI organizes these inputs automatically for engineering evaluation.
        </p>

        {/* Mock Submission Layout */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-slate-50 dark:bg-slate-950/20 text-center py-12">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Grievance Submission Form</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            (The interactive submission portal with transcription and vision extraction will be fully activated in Phase 3).
          </p>
        </div>
      </div>
    </div>
  );
};
