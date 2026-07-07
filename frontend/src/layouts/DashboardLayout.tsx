import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNotificationStore } from '../store/notificationStore';
import { 
  Menu, Sun, Moon, Sparkles, LogOut, LayoutDashboard, 
  UserCheck, AlertCircle, HelpCircle, Settings, Bell, ChevronRight 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, removeNotification } = useNotificationStore();

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
    { name: 'Citizen Portal', icon: Sparkles, view: 'citizen' },
    { name: 'Officer Portal', icon: UserCheck, view: 'officer' },
    { name: 'MP Analytics', icon: AlertCircle, view: 'mp' },
    { name: 'Settings', icon: Settings, view: 'settings' },
    { name: 'Help', icon: HelpCircle, view: 'help' }
  ];

  return (
    <div className="min-h-screen flex bg-gov-slate-50 dark:bg-gov-slate-950 transition-colors duration-200">
      
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm ${
            n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' :
            n.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-850 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300' :
            'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-250'
          }`}>
            <div className="flex-1">{n.message}</div>
            <button onClick={() => removeNotification(n.id)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
          </div>
        ))}
      </div>

      {/* Sidebar Panel */}
      <aside className="w-64 bg-white dark:bg-gov-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shrink-0">
        {/* Header Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 gap-2">
          <div className="p-1.5 bg-gov-brand-blue-500 rounded text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-gov-brand-blue-900 dark:text-white tracking-wide">YUKTI</h1>
            <span className="text-[10px] text-gov-brand-emerald-500 dark:text-gov-brand-emerald-500 font-extrabold tracking-widest uppercase block -mt-1">Decision Intelligence</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gov-brand-blue-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* User Card info */}
        {user && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gov-brand-emerald-500 text-white flex items-center justify-center font-bold text-sm uppercase">
                {user?.full_name?.charAt(0) || ''}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.full_name || ''}</h4>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">{user.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-250 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-gov-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 shadow-sm">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>YUKTI</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{activeView}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme selector */}
            <button 
              onClick={toggleTheme}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            
            {/* Notifications icon */}
            <button className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-gov-brand-emerald-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

    </div>
  );
};
