import React from 'react';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('Citizen' | 'Officer' | 'MP')[];
  onNavigateHome: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  onNavigateHome
}) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <svg className="animate-spin h-8 w-8 text-gov-brand-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-slate-500">Checking credentials...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="gov-card max-w-md mx-auto text-center space-y-4 py-8">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold">Session Expired or Unauthorized</h3>
        <p className="text-slate-500 text-sm">Please log in with appropriate credentials to access this dashboard area.</p>
        <button onClick={onNavigateHome} className="gov-btn-primary w-full">Go to Login</button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="gov-card max-w-md mx-auto text-center space-y-4 py-8">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
        <h3 className="text-xl font-bold">Access Forbidden</h3>
        <p className="text-slate-500 text-sm">
          Your current access role ({user.role}) is unauthorized to view this section.
        </p>
        <button onClick={onNavigateHome} className="gov-btn-primary w-full">Return Home</button>
      </div>
    );
  }

  return <>{children}</>;
};
