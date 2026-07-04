import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface NotFoundProps {
  onGoHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-slate-50 dark:bg-gov-slate-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <ShieldAlert className="h-16 w-16 text-gov-brand-blue-500 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">404 - Page Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            The requested government decision portal page does not exist or has been relocated.
          </p>
        </div>
        <button 
          onClick={onGoHome}
          className="gov-btn-primary inline-flex items-center gap-2"
        >
          Return to Dashboard Hub
        </button>
      </div>
    </div>
  );
};
