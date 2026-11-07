import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  CalendarRange, 
  Sparkles, 
  ShieldAlert, 
  Plus, 
  LogOut, 
  User, 
  ChevronDown 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenQuickAdd, onOpenProfile }) {
  const { user, logout, isAdmin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'shared', label: 'Shared Ledgers', shortLabel: 'Shared', icon: Users },
    { id: 'lending', label: 'Udhar Tracker', shortLabel: 'Udhar', icon: HandCoins },
    { id: 'events', label: 'Events & Sinking Funds', shortLabel: 'Events', icon: CalendarRange },
    { id: 'ai', label: 'DhanMool AI', shortLabel: 'AI', icon: Sparkles, badge: 'Advisor' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Portal', shortLabel: 'Admin', icon: ShieldAlert, isAdminTab: true });
  }

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-bold text-white text-base sm:text-xl shrink-0">
                ₹
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono">DhanMool</span>
                  {isAdmin && (
                    <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-400/80 tracking-wide font-medium hidden sm:block">
                  Your wealth, rooted right.
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                        : item.isAdminTab
                        ? 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/30 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Actions & Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onOpenQuickAdd}
                className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="inline font-bold">Add Spend</span>
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-medium text-slate-300 hidden lg:inline max-w-[100px] truncate">
                    {user?.full_name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setShowProfileMenu(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate font-mono">{user?.email}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">ID: {user?.id?.slice(0, 8)}...</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Profile & Milestones</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (App-like thumb reach) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 safe-bottom md:hidden shadow-2xl">
        <div className="grid grid-flow-col auto-cols-fr items-center px-1 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] active:scale-90 ${
                  isActive 
                    ? item.isAdminTab 
                      ? 'text-amber-400 font-bold' 
                      : 'text-emerald-400 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight leading-none">
                  {item.shortLabel || item.label.split(' ')[0]}
                </span>
                {isActive && (
                  <span className={`w-1 h-1 rounded-full mt-1 ${item.isAdminTab ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
