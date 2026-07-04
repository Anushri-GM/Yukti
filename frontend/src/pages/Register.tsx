import React from 'react';
import { Landmark } from 'lucide-react';

export const Register: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-slate-50 dark:bg-gov-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gov-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-gov-card text-center space-y-4">
        <div className="inline-flex p-3 bg-gov-brand-blue-50 dark:bg-gov-brand-blue-900/20 text-gov-brand-blue-500 rounded-xl">
          <Landmark className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Create YUKTI Account</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Citizen registration and agency account enrollment will be fully implemented in Phase 2.
        </p>
      </div>
    </div>
  );
};
