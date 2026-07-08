import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { CitizenPortal } from './pages/CitizenPortal';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { MpDashboard } from './pages/MpDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './pages/NotFound';

function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [currentView, setCurrentView] = useState<string>('home');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Load active session from local storage on boot
  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gov-slate-50 dark:bg-gov-slate-950 space-y-4">
        <svg className="animate-spin h-8 w-8 text-gov-brand-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-slate-500">Connecting to secure portal...</span>
      </div>
    );
  }

  // Auth portal fallback
  if (!isAuthenticated) {
    if (authView === 'register') {
      return (
        <Register 
          onBack={() => setAuthView('login')} 
          onSuccess={() => setCurrentView('home')} 
        />
      );
    }
    return (
      <Login 
        onSuccess={() => setCurrentView('home')} 
        onRegisterLink={() => setAuthView('register')} 
      />
    );
  }

  const handleUnauthorizedRedirect = () => {
    const user = useAuthStore.getState().user;
    if (user?.role === 'Citizen') setCurrentView('citizen');
    else if (user?.role === 'Officer') setCurrentView('officer');
    else if (user?.role === 'MP') setCurrentView('mp');
    else setCurrentView('home');
  };

  // Sync currentView based on auth status and user role
  useEffect(() => {
    if (isAuthenticated) {
      handleUnauthorizedRedirect();
    } else {
      setCurrentView('home');
    }
  }, [isAuthenticated]);

  // Helper route switch handler
  const renderViewContent = () => {
    switch (currentView) {
      case 'home':
        return <Home onNavigate={setCurrentView} />;
      case 'citizen':
        return (
          <ProtectedRoute allowedRoles={['Citizen']} onNavigateHome={handleUnauthorizedRedirect}>
            <CitizenPortal />
          </ProtectedRoute>
        );
      case 'officer':
        return (
          <ProtectedRoute allowedRoles={['Officer']} onNavigateHome={handleUnauthorizedRedirect}>
            <OfficerDashboard />
          </ProtectedRoute>
        );
      case 'mp':
        return (
          <ProtectedRoute allowedRoles={['MP']} onNavigateHome={handleUnauthorizedRedirect}>
            <MpDashboard />
          </ProtectedRoute>
        );
      case 'settings':
        return <Profile />;
      case 'help':
        return (
          <div className="gov-card max-w-xl mx-auto text-center space-y-2">
            <h3 className="text-xl font-bold">YUKTI Help Center</h3>
            <p className="text-slate-550 dark:text-slate-400 text-xs">Access guides and documentation detailing Priority Engine score parameters.</p>
          </div>
        );
      default:
        return <NotFound onGoHome={() => setCurrentView('home')} />;
    }
  };

  return (
    <DashboardLayout activeView={currentView} onNavigate={setCurrentView}>
      {renderViewContent()}
    </DashboardLayout>
  );
}

export default App;
