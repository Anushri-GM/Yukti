import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { CitizenPortal } from './pages/CitizenPortal';
import { MpDashboard } from './pages/MpDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './pages/NotFound';

function App() {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const [currentView, setCurrentView] = useState<string>('home');
  // For MP/Citizen sub-pages
  const [subView, setSubView] = useState<string>('overview');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

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
    else if (user?.role === 'MP') setCurrentView('mp');
    else setCurrentView('home');
  };

  // Sync currentView based on auth status and role
  useEffect(() => {
    if (isAuthenticated) {
      handleUnauthorizedRedirect();
    } else {
      setCurrentView('home');
    }
  }, [isAuthenticated]);

  const handleNavigate = (view: string) => {
    // MP sub-pages route through the mp view
    const mpPages = ['overview', 'clusters', 'map', 'analytics', 'simulator', 'reports'];
    // Citizen sub-pages route through the citizen view
    const citizenPages = ['dashboard', 'submit', 'history'];

    if (mpPages.includes(view)) {
      setCurrentView('mp');
      setSubView(view);
    } else if (citizenPages.includes(view)) {
      setCurrentView('citizen');
      setSubView(view);
    } else {
      setCurrentView(view);
    }
  };

  const renderViewContent = () => {
    switch (currentView) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'citizen':
        return (
          <ProtectedRoute allowedRoles={['Citizen']} onNavigateHome={handleUnauthorizedRedirect}>
            <CitizenPortal initialSubView={subView} onSubViewChange={setSubView} />
          </ProtectedRoute>
        );
      case 'mp':
        return (
          <ProtectedRoute allowedRoles={['MP']} onNavigateHome={handleUnauthorizedRedirect}>
            <MpDashboard initialSubView={subView} onSubViewChange={setSubView} />
          </ProtectedRoute>
        );
      case 'settings':
        return <Profile />;
      default:
        return <NotFound onGoHome={() => handleUnauthorizedRedirect()} />;
    }
  };

  return (
    <DashboardLayout activeView={currentView} subView={subView} onNavigate={handleNavigate}>
      {renderViewContent()}
    </DashboardLayout>
  );
}

export default App;
