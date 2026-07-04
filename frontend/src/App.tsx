import React, { useState } from 'react';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { CitizenPortal } from './pages/CitizenPortal';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { MpDashboard } from './pages/MpDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotFound } from './pages/NotFound';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const [currentView, setCurrentView] = useState<string>('home');
  const [showLogin, setShowLogin] = useState<boolean>(true);

  if (!isAuthenticated && showLogin) {
    return <Login onSuccess={() => {
      setShowLogin(false);
      setCurrentView('home');
    }} />;
  }

  // Helper route switch handler
  const renderViewContent = () => {
    switch (currentView) {
      case 'home':
        return <Home onNavigate={setCurrentView} />;
      case 'citizen':
        return <CitizenPortal />;
      case 'officer':
        return <OfficerDashboard />;
      case 'mp':
        return <MpDashboard />;
      case 'register':
        return <Register />;
      case 'settings':
        return (
          <div className="gov-card max-w-xl mx-auto text-center space-y-2">
            <h3 className="text-xl font-bold">Portal Settings</h3>
            <p className="text-slate-500 text-xs">(Settings modifications will be fully supported in subsequent phases).</p>
          </div>
        );
      case 'help':
        return (
          <div className="gov-card max-w-xl mx-auto text-center space-y-2">
            <h3 className="text-xl font-bold">YUKTI Help Center</h3>
            <p className="text-slate-500 text-xs">Access guides and documentation detailing Priority Engine score parameters.</p>
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
