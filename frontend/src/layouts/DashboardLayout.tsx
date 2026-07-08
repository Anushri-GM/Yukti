import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNotificationStore } from '../store/notificationStore';
import {
  Sun, Moon, Sparkles, LogOut, LayoutDashboard,
  Settings, Bell, ChevronRight,
  Map, BarChart3, Layers, Cpu, FileText, ClipboardList
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  subView?: string;
  onNavigate: (view: string) => void;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children, activeView, subView, onNavigate }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, removeNotification } = useNotificationStore();

  // ── Role-scoped nav items ─────────────────────────────────────────────────
  const getCitizenNav = () => [
    { label: 'My Dashboard',     icon: LayoutDashboard, view: 'dashboard'  },
    { label: 'Submit Grievance', icon: ClipboardList,   view: 'submit'  },
    { label: 'My Reports',       icon: FileText,        view: 'history'  },
    { label: 'Profile',          icon: Settings,        view: 'settings' },
  ];

  const getMpNav = () => [
    { label: 'Overview',          icon: LayoutDashboard, view: 'overview'   },
    { label: 'Issue Clusters',    icon: Layers,          view: 'clusters'   },
    { label: 'Constituency Map',  icon: Map,             view: 'map'        },
    { label: 'Analytics',         icon: BarChart3,       view: 'analytics'  },
    { label: 'What-If Simulator', icon: Cpu,             view: 'simulator'  },
    { label: 'Profile',           icon: Settings,        view: 'settings'   },
  ];

  const navItems = user?.role === 'MP' ? getMpNav() : user?.role === 'Citizen' ? getCitizenNav() : [];

  const getIsActive = (view: string) => {
    if (view === 'settings') return activeView === 'settings';
    return subView === view || activeView === view;
  };

  const breadcrumbMap: Record<string, string> = {
    overview: 'Overview', clusters: 'Issue Clusters', map: 'Constituency Map',
    analytics: 'Analytics', simulator: 'What-If Simulator', reports: 'Reports',
    citizen: 'Citizen Portal', settings: 'Profile',
    dashboard: 'My Dashboard', submit: 'Submit Grievance', history: 'My Reports'
  };
  const breadcrumb = subView 
    ? breadcrumbMap[subView] ?? subView
    : breadcrumbMap[activeView] ?? activeView;

  // ── Notification bg by type ───────────────────────────────────────────────
  const notifClass = (type: string) => {
    if (type === 'success') return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300';
    if (type === 'error')   return 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300';
    return 'bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200';
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => (
          <div key={n.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm ${notifClass(n.type)}`}>
            <div className="flex-1 font-medium">{n.message}</div>
            <button onClick={() => removeNotification(n.id)} className="text-slate-400 hover:text-slate-600 font-bold leading-none">×</button>
          </div>
        ))}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col shrink-0 shadow-sm">

        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-black text-slate-900 dark:text-white text-base tracking-tight">YUKTI</div>
            <div className="text-[9px] text-emerald-500 font-bold tracking-widest uppercase -mt-0.5">Decision Intelligence</div>
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 pt-4 pb-1">
            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              user.role === 'MP'      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
              user.role === 'Citizen' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
              'bg-slate-100 text-slate-500'
            }`}>
              <span>{user.role === 'MP' ? '🏛' : '👤'}</span>
              {user.role === 'MP' ? 'MP Dashboard' : 'Citizen Portal'}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = getIsActive(item.view);
            return (
              <button
                key={`${item.label}-${item.view}`}
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User card */}
        {user && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm uppercase flex-shrink-0 shadow-sm">
                {user.full_name?.charAt(0) ?? '?'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-tight">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">{user.role}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150 font-medium"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-400 font-medium">YUKTI</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800 dark:text-slate-100">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-all duration-150"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              aria-label="Notifications"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-all duration-150 relative"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
